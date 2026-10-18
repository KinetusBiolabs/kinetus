"use server";

import {
  CollectionKind,
  Prisma,
  ProductStatus,
  RedirectEntityType,
  VariantStatus,
} from "@prisma/client";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import {
  checkbox,
  errorState,
  optionalStoreDateTime,
  optionalText,
  parseDollars,
  parseHttpUrl,
  parseWholeNumber,
  slugError,
  slugify,
  successState,
  text,
  type FormState,
} from "@/lib/admin/forms";
import { recordSlugChange } from "@/lib/admin/redirects";
import { expireProductPages } from "@/lib/admin/revalidate";
import {
  chosenFile,
  deleteStoredImages,
  imageFileError,
  SHEET_IMAGE_ENCODING,
  storeImage,
} from "@/lib/admin/uploads";
import { formatCad } from "@/lib/products";
import { prisma } from "@/lib/db";

const TRANSACTION_OPTIONS = { timeout: 20000, maxWait: 10000 };

const LIMITS = {
  name: 120,
  shortDescription: 300,
  description: 5000,
  productInfoText: 5000,
  metaTitle: 120,
  metaDescription: 320,
  spec: 200,
  label: 40,
  sku: 60,
  alt: 250,
};

const PRODUCT_STATUSES = new Set<string>(Object.values(ProductStatus));
const VARIANT_STATUSES = new Set<string>(Object.values(VariantStatus));

function tooLong(value: string | null, max: number): boolean {
  return value !== null && value.length > max;
}

type ParsedVariant = {
  key: string;
  isNew: boolean;
  label: string;
  sku: string | null;
  price: number;
  salePrice: number | null;
  saleStartsAt: Date | null;
  saleEndsAt: Date | null;
  stock: number | null;
  /** The stock field was left as loaded: the saved count is kept, not overwritten. */
  stockUnchanged: boolean;
  trackInventory: boolean;
  status: VariantStatus;
  displayOrder: number;
  testReportUrl: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Details, specification, search listing, sizes and collections             */
/* -------------------------------------------------------------------------- */

export async function saveProduct(_previous: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const productId = text(form, "productId") || null;
  const existing = productId
    ? await prisma.product.findUnique({
        where: { id: productId },
        include: {
          variants: true,
          collections: { select: { collectionId: true } },
        },
      })
    : null;
  if (productId && !existing) {
    return { status: "error", message: "This product no longer exists. Go back to the list." };
  }

  const errors: Record<string, string> = {};

  // Details
  const name = text(form, "name");
  if (!name) {
    errors.name = "Enter the product name.";
  } else if (name.length > LIMITS.name) {
    errors.name = `Keep the name to ${LIMITS.name} characters or fewer.`;
  }

  let slug = text(form, "slug").toLowerCase();
  if (slug === "" && name) {
    slug = slugify(name);
  }
  // With no name there is nothing to generate a slug from; the name error covers it.
  const slugProblem = slug === "" && !name ? null : slugError(slug);
  if (slugProblem) {
    errors.slug = slugProblem;
  } else {
    const clash = await prisma.product.findFirst({
      where: { slug, ...(productId ? { id: { not: productId } } : {}) },
      select: { name: true },
    });
    if (clash) {
      errors.slug = `“${clash.name}” already uses the slug “${slug}”. Choose a different one.`;
    }
  }

  const status = text(form, "status");
  if (!PRODUCT_STATUSES.has(status)) {
    errors.status = "Choose Draft, Published or Archived.";
  }

  const shortDescription = optionalText(form, "shortDescription");
  if (tooLong(shortDescription, LIMITS.shortDescription)) {
    errors.shortDescription = `Keep the short description to ${LIMITS.shortDescription} characters or fewer.`;
  }
  const description = optionalText(form, "description");
  if (tooLong(description, LIMITS.description)) {
    errors.description = `Keep the description to ${LIMITS.description} characters or fewer.`;
  }
  const productInfoText = optionalText(form, "productInfoText");
  if (tooLong(productInfoText, LIMITS.productInfoText)) {
    errors.productInfoText = `Keep the text below the buttons to ${LIMITS.productInfoText} characters or fewer.`;
  }
  const metaTitle = optionalText(form, "metaTitle");
  if (tooLong(metaTitle, LIMITS.metaTitle)) {
    errors.metaTitle = `Keep the search title to ${LIMITS.metaTitle} characters or fewer.`;
  }
  const metaDescription = optionalText(form, "metaDescription");
  if (tooLong(metaDescription, LIMITS.metaDescription)) {
    errors.metaDescription = `Keep the search description to ${LIMITS.metaDescription} characters or fewer.`;
  }

  const displayOrderText = text(form, "displayOrder") || "0";
  const displayOrder = parseWholeNumber(displayOrderText, 0, 9999);
  if (displayOrder === null) {
    errors.displayOrder = "Enter a whole number from 0 to 9999.";
  }

  // Specification
  const spec = {
    form: optionalText(form, "materialForm"),
    appearance: optionalText(form, "appearance"),
    storageConditions: optionalText(form, "storageConditions"),
    casNumber: optionalText(form, "casNumber"),
    molecularFormula: optionalText(form, "molecularFormula"),
    molecularWeight: optionalText(form, "molecularWeight"),
    purityMethod: optionalText(form, "purityMethod"),
  };
  const specFieldNames: Record<keyof typeof spec, string> = {
    form: "materialForm",
    appearance: "appearance",
    storageConditions: "storageConditions",
    casNumber: "casNumber",
    molecularFormula: "molecularFormula",
    molecularWeight: "molecularWeight",
    purityMethod: "purityMethod",
  };
  for (const [key, value] of Object.entries(spec) as [keyof typeof spec, string | null][]) {
    if (tooLong(value, LIMITS.spec)) {
      errors[specFieldNames[key]] = `Keep this to ${LIMITS.spec} characters or fewer.`;
    }
  }
  if (spec.casNumber && !/^\d{2,7}-\d{2}-\d$/.test(spec.casNumber)) {
    errors.casNumber =
      "A CAS number looks like 137525-51-0: digits, hyphen, two digits, hyphen, one digit.";
  }

  // Sizes
  const existingVariants = new Map(
    (existing?.variants ?? []).map((variant) => [variant.id, variant]),
  );
  const keys = form.getAll("variantKeys").filter((key): key is string => typeof key === "string");
  const variants: ParsedVariant[] = [];
  const seenLabels = new Map<string, string>();
  const seenSkus = new Map<string, string>();

  for (const [position, key] of keys.entries()) {
    const isNew = key.startsWith("new-");
    if (!isNew && !existingVariants.has(key)) {
      continue;
    }
    const field = (fieldName: string) => `variants.${key}.${fieldName}`;
    const label = text(form, field("label"));
    const priceText = text(form, field("price"));
    const salePriceText = text(form, field("salePrice"));
    const skuText = text(form, field("sku"));
    const stockText = text(form, field("stock"));
    const reportText = text(form, field("testReportUrl"));
    const startsText = text(form, field("saleStartsAt"));
    const endsText = text(form, field("saleEndsAt"));
    if (
      isNew &&
      ![label, priceText, salePriceText, skuText, stockText, reportText, startsText, endsText].some(
        Boolean,
      )
    ) {
      continue;
    }
    const sizeName = label || (isNew ? "New size" : existingVariants.get(key)!.label);

    if (!label) {
      errors[field("label")] = `${sizeName}: enter the size, for example 10 mg.`;
    } else if (label.length > LIMITS.label) {
      errors[field("label")] = `${sizeName}: keep the size to ${LIMITS.label} characters or fewer.`;
    }

    const price = parseDollars(priceText);
    if (priceText === "" || price === null || price <= 0) {
      errors[field("price")] = `${sizeName}: enter the price in dollars, for example 45.00.`;
    }

    let salePrice: number | null = null;
    if (salePriceText !== "") {
      salePrice = parseDollars(salePriceText);
      if (salePrice === null || salePrice <= 0) {
        errors[field("salePrice")] =
          `${sizeName}: enter the sale price in dollars, or leave it blank.`;
      } else if (price !== null && salePrice >= price) {
        errors[field("salePrice")] =
          `${sizeName}: the sale price must be lower than the price (${formatCad(price)}).`;
      }
    }

    const starts = optionalStoreDateTime(form, field("saleStartsAt"));
    const ends = optionalStoreDateTime(form, field("saleEndsAt"));
    if (starts.error) {
      errors[field("saleStartsAt")] = `${sizeName}: ${starts.error}`;
    }
    if (ends.error) {
      errors[field("saleEndsAt")] = `${sizeName}: ${ends.error}`;
    }
    if (starts.value && ends.value && ends.value <= starts.value) {
      errors[field("saleEndsAt")] = `${sizeName}: the sale must end after it starts.`;
    }
    if ((starts.value || ends.value) && salePriceText === "") {
      errors[field("salePrice")] = `${sizeName}: enter a sale price, or clear the sale dates.`;
    }

    const sku = skuText === "" ? null : skuText;
    if (sku !== null && sku.length > LIMITS.sku) {
      errors[field("sku")] = `${sizeName}: keep the SKU to ${LIMITS.sku} characters or fewer.`;
    }

    // A stock field left as it was loaded keeps whatever the database holds when this saves:
    // marking orders paid or cancelled may have moved the count since the page loaded, and
    // an oversold size stays below zero until the client enters a real count.
    const stockLoaded = isNew ? null : form.get(field("stockLoaded"));
    const stockUnchanged = typeof stockLoaded === "string" && stockText === stockLoaded.trim();
    let stock: number | null = null;
    if (!stockUnchanged && stockText !== "") {
      stock = parseWholeNumber(stockText, 0, 1_000_000);
      if (stock === null) {
        errors[field("stock")] = `${sizeName}: enter the stock as a whole number (0 or more).`;
      }
    }
    const trackInventory = checkbox(form, field("trackInventory"));
    if (trackInventory && stockText === "") {
      errors[field("stock")] = `${sizeName}: enter how many are in stock, or untick Track stock.`;
    }

    const statusText = text(form, field("status")) || VariantStatus.ACTIVE;
    if (!VARIANT_STATUSES.has(statusText)) {
      errors[field("status")] = `${sizeName}: choose Active or Archived.`;
    }
    const orderText = text(form, field("displayOrder")) || String(position + 1);
    const variantOrder = parseWholeNumber(orderText, 0, 999);
    if (variantOrder === null) {
      errors[field("displayOrder")] =
        `${sizeName}: enter the order as a whole number from 0 to 999.`;
    }

    let testReportUrl: string | null = null;
    if (reportText !== "") {
      testReportUrl = parseHttpUrl(reportText);
      if (testReportUrl === null) {
        errors[field("testReportUrl")] =
          `${sizeName}: enter the full test report address, starting with https://`;
      }
    }

    if (label && statusText === VariantStatus.ACTIVE) {
      const labelKey = label.toLowerCase().replace(/\s+/g, " ");
      if (seenLabels.has(labelKey)) {
        errors[field("label")] =
          `${sizeName}: another active size on this product is already called “${seenLabels.get(labelKey)}”.`;
      }
      seenLabels.set(labelKey, label);
    }
    if (sku) {
      if (seenSkus.has(sku)) {
        errors[field("sku")] = `${sizeName}: this SKU is also used by ${seenSkus.get(sku)}.`;
      }
      seenSkus.set(sku, sizeName);
    }

    variants.push({
      key,
      isNew,
      label,
      sku,
      price: price ?? 0,
      salePrice,
      saleStartsAt: starts.value,
      saleEndsAt: ends.value,
      stock,
      stockUnchanged,
      trackInventory,
      status: statusText as VariantStatus,
      displayOrder: variantOrder ?? 0,
      testReportUrl,
    });
  }

  // SKUs are unique across the whole catalogue.
  const skus = variants.flatMap((variant) => (variant.sku ? [variant.sku] : []));
  if (skus.length > 0) {
    const taken = await prisma.productVariant.findMany({
      where: {
        sku: { in: skus },
        ...(productId ? { productId: { not: productId } } : {}),
      },
      select: { sku: true, label: true, product: { select: { name: true } } },
    });
    for (const clash of taken) {
      const variant = variants.find((item) => item.sku === clash.sku);
      if (variant) {
        errors[`variants.${variant.key}.sku`] =
          `${variant.label || "New size"}: the SKU “${clash.sku}” is already used by ${clash.product.name} ${clash.label}.`;
      }
    }
  }

  if (status === ProductStatus.PUBLISHED && !variants.some((v) => v.status === "ACTIVE")) {
    errors.status = "A published product needs at least one active size with a price.";
  }

  // Collections: at least one range, any number of categories.
  const rangeIds = form
    .getAll("rangeIds")
    .filter((value): value is string => typeof value === "string" && value !== "");
  const categoryIds = form
    .getAll("categoryIds")
    .filter((value): value is string => typeof value === "string" && value !== "");
  const collections = await prisma.collection.findMany({
    select: { id: true, kind: true },
  });
  const kindById = new Map(collections.map((collection) => [collection.id, collection.kind]));
  const hasRanges = collections.some((collection) => collection.kind === CollectionKind.RANGE);
  if (rangeIds.length === 0 && hasRanges) {
    errors.rangeIds = "Choose at least one range for this product.";
  } else if (rangeIds.some((id) => kindById.get(id) !== CollectionKind.RANGE)) {
    errors.rangeIds = "Choose ranges from the list.";
  }
  if (categoryIds.some((id) => kindById.get(id) !== CollectionKind.CATEGORY)) {
    errors.categoryIds = "Choose categories from the list.";
  }

  if (Object.keys(errors).length > 0) {
    return errorState(errors, form);
  }

  const data = {
    name,
    slug,
    status: status as ProductStatus,
    shortDescription,
    description,
    productInfoText,
    metaTitle,
    metaDescription,
    featured: checkbox(form, "featured"),
    displayOrder: displayOrder ?? 0,
    ...spec,
  };

  let savedId: string;
  try {
    savedId = await prisma.$transaction(async (tx) => {
      const product = existing
        ? await tx.product.update({ where: { id: existing.id }, data })
        : await tx.product.create({ data });

      if (existing && existing.slug !== slug) {
        await recordSlugChange(tx, RedirectEntityType.PRODUCT, existing.slug, slug);
      }

      for (const variant of variants) {
        const variantData = {
          label: variant.label,
          sku: variant.sku,
          price: variant.price,
          salePrice: variant.salePrice,
          saleStartsAt: variant.saleStartsAt,
          saleEndsAt: variant.saleEndsAt,
          ...(variant.stockUnchanged ? {} : { stock: variant.stock }),
          trackInventory: variant.trackInventory,
          status: variant.status,
          displayOrder: variant.displayOrder,
          testReportUrl: variant.testReportUrl,
        };
        if (variant.isNew) {
          await tx.productVariant.create({
            data: {
              ...variantData,
              productId: product.id,
              testReportUpdatedAt: variant.testReportUrl ? new Date() : null,
            },
          });
        } else {
          const before = existingVariants.get(variant.key)!;
          const reportChanged = before.testReportUrl !== variant.testReportUrl;
          await tx.productVariant.update({
            where: { id: variant.key },
            data: {
              ...variantData,
              ...(reportChanged
                ? { testReportUpdatedAt: variant.testReportUrl ? new Date() : null }
                : {}),
            },
          });
        }
      }

      const wanted = new Set([...rangeIds, ...categoryIds]);
      const current = new Set((existing?.collections ?? []).map((link) => link.collectionId));
      const removed = [...current].filter((id) => !wanted.has(id));
      if (removed.length > 0) {
        await tx.productCollection.deleteMany({
          where: { productId: product.id, collectionId: { in: removed } },
        });
      }
      for (const collectionId of wanted) {
        if (current.has(collectionId)) {
          continue;
        }
        const last = await tx.productCollection.aggregate({
          where: { collectionId },
          _max: { displayOrder: true },
        });
        await tx.productCollection.create({
          data: {
            productId: product.id,
            collectionId,
            displayOrder: (last._max.displayOrder ?? 0) + 1,
          },
        });
      }
      return product.id;
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorState(
        {},
        form,
        "Nothing was saved: another product or size took the same slug or SKU while you were editing. Check them and save again.",
      );
    }
    throw error;
  }

  expireProductPages(slug, ...(existing ? [existing.slug] : []));

  if (!existing) {
    redirect(`/admin/products/${savedId}?created=1`);
  }
  const moved = existing.slug !== slug;
  return successState(
    moved
      ? `Saved. The address changed to /products/${slug}; the old address /products/${existing.slug} now redirects to it.`
      : "Saved. The public page shows the change on its next visit.",
  );
}

/* -------------------------------------------------------------------------- */
/*  Deleting a size (strength)                                                */
/* -------------------------------------------------------------------------- */

export type DeleteVariantResult = { status: "ok" | "error"; message: string };

/**
 * Deletes one size of a product. Refused when it is the product's last size, when it would
 * leave a published product with no active size, or when any order line points at it:
 * order lines keep a snapshot of the name, size and price, but their link to the size
 * (used to put stock back when a paid order is cancelled) would be cleared, so those sizes
 * are archived instead. Its renders go with it (the database cascades), and their files
 * are removed from storage afterwards.
 */
export async function deleteVariant(
  productId: unknown,
  variantId: unknown,
): Promise<DeleteVariantResult> {
  await requireAdmin();
  if (typeof productId !== "string" || typeof variantId !== "string") {
    return { status: "error", message: "This size no longer exists. Reload the page." };
  }

  type Outcome = { slug: string; imageUrls: string[] } | DeleteVariantResult;
  let outcome: Outcome;
  try {
    outcome = await prisma.$transaction(async (tx): Promise<Outcome> => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          slug: true,
          status: true,
          variants: { select: { id: true, status: true } },
        },
      });
      if (!product || !product.variants.some((variant) => variant.id === variantId)) {
        return { status: "error", message: "This size no longer exists. Reload the page." };
      }
      const remaining = product.variants.filter((variant) => variant.id !== variantId);
      if (remaining.length === 0) {
        return {
          status: "error",
          message:
            "A product needs at least one strength. To take the whole product off the site, archive it.",
        };
      }
      if (
        product.status === ProductStatus.PUBLISHED &&
        !remaining.some((variant) => variant.status === VariantStatus.ACTIVE)
      ) {
        return {
          status: "error",
          message: "A published product needs at least one active size with a price.",
        };
      }
      const onOrders = await tx.orderRequestItem.count({ where: { variantId } });
      if (onOrders > 0) {
        return {
          status: "error",
          message:
            "This strength is on existing orders, so it can't be deleted. To hide it from the site, set its status to Archived and save.",
        };
      }
      const images = await tx.productImage.findMany({
        where: { variantId },
        select: { url: true },
      });
      await tx.productVariant.delete({ where: { id: variantId } });
      return { slug: product.slug, imageUrls: images.map((image) => image.url) };
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    console.error("[admin] Could not delete size:", variantId, error);
    return { status: "error", message: "The size could not be deleted. Please try again." };
  }

  if ("status" in outcome) {
    return outcome;
  }
  await deleteStoredImages(outcome.imageUrls);
  expireProductPages(outcome.slug);
  return { status: "ok", message: "Size deleted." };
}

/* -------------------------------------------------------------------------- */
/*  Images                                                                    */
/* -------------------------------------------------------------------------- */

export async function saveProductImages(_previous: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();

  const productId = text(form, "productId");
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { images: true, variants: { select: { id: true } } },
  });
  if (!product) {
    return { status: "error", message: "This product no longer exists. Go back to the list." };
  }

  const variantIds = new Set(product.variants.map((variant) => variant.id));
  const errors: Record<string, string> = {};
  const updates: { id: string; altText: string; variantId: string | null; displayOrder: number }[] =
    [];
  const deletions: typeof product.images = [];

  for (const [index, image] of product.images.entries()) {
    const field = (name: string) => `images.${image.id}.${name}`;
    const label = `Image ${index + 1}`;
    if (checkbox(form, field("delete"))) {
      deletions.push(image);
      continue;
    }
    const altText = text(form, field("alt"));
    if (!altText) {
      errors[field("alt")] = `${label}: describe the image. Alt text is required.`;
    } else if (altText.length > LIMITS.alt) {
      errors[field("alt")] = `${label}: keep the alt text to ${LIMITS.alt} characters or fewer.`;
    }
    const variantId = text(form, field("variantId")) || null;
    if (variantId !== null && !variantIds.has(variantId)) {
      errors[field("variantId")] = `${label}: choose a size from the list.`;
    }
    const order = parseWholeNumber(text(form, field("order")) || "0", 0, 999);
    if (order === null) {
      errors[field("order")] = `${label}: enter the order as a whole number from 0 to 999.`;
    }
    updates.push({ id: image.id, altText, variantId, displayOrder: order ?? 0 });
  }

  const file = chosenFile(form, "newImage");
  const newAlt = text(form, "newImage.alt");
  const newVariantId = text(form, "newImage.variantId") || null;
  const newOrder = parseWholeNumber(text(form, "newImage.order") || "0", 0, 999);
  if (file) {
    if (!newAlt) {
      errors["newImage.alt"] =
        "New image: describe it. Alt text is required before an image can be uploaded.";
    } else if (newAlt.length > LIMITS.alt) {
      errors["newImage.alt"] = `New image: keep the alt text to ${LIMITS.alt} characters or fewer.`;
    }
    if (newVariantId !== null && !variantIds.has(newVariantId)) {
      errors["newImage.variantId"] = "New image: choose a size from the list.";
    }
    if (newOrder === null) {
      errors["newImage.order"] = "New image: enter the order as a whole number from 0 to 999.";
    }
    const fileProblem = await imageFileError(file);
    if (fileProblem) {
      errors.newImage = `New image: ${fileProblem}`;
    }
  } else if (newAlt) {
    errors.newImage = "New image: choose the file to upload, or clear its alt text.";
  }

  if (Object.keys(errors).length > 0) {
    return errorState(
      errors,
      form,
      file
        ? "Nothing was saved. Fix the fields marked below, then choose the image file again."
        : undefined,
    );
  }

  let uploadedUrl: string | null = null;
  if (file) {
    const stored = await storeImage(file, {
      folder: `products/${product.slug}`,
      baseName: slugify(newAlt) || product.slug,
      maxEdge: 1600,
    });
    if (!stored.ok) {
      return errorState({ newImage: `New image: ${stored.error}` }, form);
    }
    uploadedUrl = stored.url;
  }

  const primaryChoice =
    checkbox(form, "newImage.primary") && uploadedUrl ? "new" : text(form, "primaryImageId");

  try {
    await prisma.$transaction(async (tx) => {
      if (deletions.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: deletions.map((image) => image.id) }, productId },
        });
      }
      for (const update of updates) {
        await tx.productImage.update({
          where: { id: update.id },
          data: {
            altText: update.altText,
            variantId: update.variantId,
            displayOrder: update.displayOrder,
            isPrimary: update.id === primaryChoice,
          },
        });
      }
      if (uploadedUrl) {
        await tx.productImage.create({
          data: {
            productId,
            url: uploadedUrl,
            altText: newAlt,
            variantId: newVariantId,
            displayOrder: newOrder ?? 0,
            isPrimary: primaryChoice === "new",
          },
        });
      }
      // Exactly one primary image while any image remains.
      const remaining = await tx.productImage.findMany({
        where: { productId },
        orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, isPrimary: true },
      });
      if (remaining.length > 0 && !remaining[0].isPrimary) {
        await tx.productImage.update({ where: { id: remaining[0].id }, data: { isPrimary: true } });
      }
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    if (uploadedUrl) {
      await deleteStoredImages([uploadedUrl]);
    }
    throw error;
  }

  await deleteStoredImages(deletions.map((image) => image.url));
  expireProductPages(product.slug);

  const parts = [
    uploadedUrl ? "Image uploaded." : null,
    deletions.length > 0
      ? `${deletions.length} image${deletions.length === 1 ? "" : "s"} deleted.`
      : null,
    "Images saved.",
  ].filter(Boolean);
  return successState(parts.join(" "));
}

/* -------------------------------------------------------------------------- */
/*  Information sheet                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Uploads, replaces or removes the product's information sheet, or saves its alt text.
 * The sheet goes through the same checks and Blob storage as product images; alt text is
 * required with it. The product page shows its Product Information button only while a
 * sheet is stored.
 */
export async function saveInformationSheet(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  await requireAdmin();

  const productId = text(form, "productId");
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, slug: true, informationSheetUrl: true },
  });
  if (!product) {
    return { status: "error", message: "This product no longer exists. Go back to the list." };
  }

  const file = chosenFile(form, "sheet.file");
  const alt = text(form, "sheet.alt");
  const remove = checkbox(form, "sheet.remove");
  const current = product.informationSheetUrl;
  const errors: Record<string, string> = {};

  if (remove && current) {
    if (file) {
      errors["sheet.remove"] =
        "Choose one: tick Remove the sheet, or choose a new file to replace it, not both.";
      return errorState(errors, form, "Nothing was saved. Choose the new file again if needed.");
    }
    await prisma.product.update({
      where: { id: product.id },
      data: { informationSheetUrl: null, informationSheetAlt: null },
    });
    await deleteStoredImages([current]);
    expireProductPages(product.slug);
    return successState(
      "Information sheet removed. The product page no longer shows the Product Information button.",
    );
  }

  if (!file && !current) {
    errors["sheet.file"] = alt
      ? "Choose the sheet image to upload, or clear the alt text."
      : "Choose the sheet image to upload.";
  }
  if (file || current) {
    if (!alt) {
      errors["sheet.alt"] =
        "Describe the sheet. Alt text is required, for example: BPC-157 product information sheet.";
    } else if (alt.length > LIMITS.alt) {
      errors["sheet.alt"] = `Keep the alt text to ${LIMITS.alt} characters or fewer.`;
    }
  }
  if (file) {
    const fileProblem = await imageFileError(file);
    if (fileProblem) {
      errors["sheet.file"] = fileProblem;
    }
  }
  if (Object.keys(errors).length > 0) {
    return errorState(
      errors,
      form,
      file
        ? "Nothing was saved. Fix the fields marked below, then choose the sheet file again."
        : undefined,
    );
  }

  if (!file) {
    await prisma.product.update({
      where: { id: product.id },
      data: { informationSheetAlt: alt },
    });
    expireProductPages(product.slug);
    return successState("Alt text saved.");
  }

  const stored = await storeImage(file, {
    folder: `information-sheets/${product.slug}`,
    baseName: `${product.slug}-information-sheet`,
    ...SHEET_IMAGE_ENCODING,
  });
  if (!stored.ok) {
    return errorState({ "sheet.file": stored.error }, form);
  }
  try {
    await prisma.product.update({
      where: { id: product.id },
      data: { informationSheetUrl: stored.url, informationSheetAlt: alt },
    });
  } catch (error) {
    await deleteStoredImages([stored.url]);
    throw error;
  }
  await deleteStoredImages([current]);
  expireProductPages(product.slug);
  return successState(
    current
      ? "Information sheet replaced. The product page shows the new sheet on its next visit."
      : "Information sheet uploaded. The product page shows the Product Information button on its next visit.",
  );
}
