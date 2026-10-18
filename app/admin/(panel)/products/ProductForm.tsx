"use client";

import { useRouter } from "next/navigation";
import { useActionState, useId, useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ContentRule } from "@/components/admin/ContentRule";
import { CheckboxField, SelectField, TextArea, TextField } from "@/components/admin/Fields";
import { FormNotice, SaveBar } from "@/components/admin/FormNotice";
import styles from "@/components/admin/admin.module.css";
import type { CollectionOption, ProductFormData, VariantFormData } from "@/lib/admin/catalogue";
import { IDLE_STATE, slugify, STORE_TIME_ZONE_LABEL, type FormState } from "@/lib/admin/forms";
import { deleteVariant, saveProduct } from "./actions";

type ProductFormProps = {
  product: ProductFormData;
  collections: CollectionOption[];
  /** Shown once after creating a product. */
  initialState?: FormState;
};

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft: not on the site" },
  { value: "PUBLISHED", label: "Published: on the site" },
  { value: "ARCHIVED", label: "Archived: taken off the site" },
];

const VARIANT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active: shown on the site" },
  { value: "ARCHIVED", label: "Archived: hidden from the site" },
];

/**
 * Create or edit a product: details, specification, search listing, sizes and prices,
 * and collections, saved together. Images are saved by their own form below this one.
 */
export function ProductForm({ product, collections, initialState = IDLE_STATE }: ProductFormProps) {
  const [state, formAction] = useActionState(saveProduct, initialState);
  const isNew = product.id === null;

  return (
    <form action={formAction} noValidate>
      <FormNotice state={state} />
      {/* A successful save remounts the fields so they show exactly what was stored. */}
      <ProductFields
        key={state.savedAt ?? "initial"}
        state={state}
        product={product}
        collections={collections}
        isNew={isNew}
      />
      {isNew && (
        <section className={styles.panel} aria-labelledby="new-images-heading">
          <h2 id="new-images-heading" className={styles.panelTitle}>
            Images and information sheet
          </h2>
          <p className={styles.panelIntro}>
            Added as soon as the product exists. Create product saves it as a Draft and opens its
            image upload straight away, with the information sheet below it.
          </p>
        </section>
      )}
      <SaveBar
        state={state}
        label={isNew ? "Create product" : "Save changes"}
        idleText={
          isNew
            ? "New products start as Draft. The image upload opens as soon as it is created."
            : "Saves everything above. Images and the information sheet have their own Save buttons."
        }
      />
    </form>
  );
}

type FieldsProps = {
  state: FormState;
  product: ProductFormData;
  collections: CollectionOption[];
  isNew: boolean;
};

function ProductFields({ state, product, collections, isNew }: FieldsProps) {
  const echoed = state.status === "error" ? state.values : undefined;
  const value = (name: string, saved: string) => echoed?.[name] ?? saved;
  const checked = (name: string, saved: boolean) => (echoed ? echoed[name] === "on" : saved);
  const error = (name: string) => state.errors?.[name];

  // New products: the slug follows the name until the slug is edited by hand.
  const slugInput = useRef<HTMLInputElement | null>(null);
  const slugEdited = useRef(!isNew || Boolean(echoed?.slug));

  const ranges = collections.filter((collection) => collection.kind === "RANGE");
  const categories = collections.filter((collection) => collection.kind === "CATEGORY");
  const echoedRanges = echoed ? (echoed.rangeIds ?? "").split("\n").filter(Boolean) : null;
  const echoedCategories = echoed ? (echoed.categoryIds ?? "").split("\n").filter(Boolean) : null;

  return (
    <>
      <input type="hidden" name="productId" value={product.id ?? ""} />

      <section className={styles.panel} aria-labelledby="details-heading">
        <h2 id="details-heading" className={styles.panelTitle}>
          Details
        </h2>
        <p className={styles.panelIntro}>
          The name and address of the product page, whether it is on the site, and its copy.
        </p>
        <div className={`${styles.grid} ${styles.grid2}`}>
          <TextField
            label="Name"
            name="name"
            required
            defaultValue={value("name", product.name)}
            error={error("name")}
            maxLength={120}
            onValueInput={(name) => {
              if (!slugEdited.current && slugInput.current) {
                slugInput.current.value = slugify(name);
              }
            }}
          />
          <TextField
            label="Slug (web address)"
            name="slug"
            required
            mono
            prefix="/products/"
            defaultValue={value("slug", product.slug)}
            error={error("slug")}
            maxLength={80}
            inputRef={(element) => {
              slugInput.current = element;
            }}
            onValueInput={() => {
              slugEdited.current = true;
            }}
            hint={
              isNew
                ? "Filled in from the name. Lowercase letters, numbers and hyphens."
                : "Changing it changes the page's address. The old address keeps working: it redirects to the new one."
            }
          />
          <SelectField
            label="Status"
            name="status"
            options={STATUS_OPTIONS}
            defaultValue={value("status", product.status)}
            error={error("status")}
          />
          <TextField
            label="Order in the product list"
            name="displayOrder"
            inputMode="numeric"
            mono
            defaultValue={value("displayOrder", product.displayOrder)}
            error={error("displayOrder")}
            hint="Lower numbers come first on the All products page."
          />
          <CheckboxField
            className={styles.spanAll}
            label="Featured"
            name="featured"
            defaultChecked={checked("featured", product.featured)}
            hint="Shows the product under Featured materials on the homepage (up to eight)."
          />
        </div>

        <h3 className={styles.subTitle}>Copy</h3>
        <ContentRule />
        <div className={styles.grid} style={{ marginTop: 18 }}>
          <TextArea
            label="Short description"
            name="shortDescription"
            short
            defaultValue={value("shortDescription", product.shortDescription)}
            error={error("shortDescription")}
            guide={{ max: 160 }}
            hint="One or two sentences about the material, following the rule above. Used when the page is shared or appears in search results without a search description."
          />
          <TextArea
            label="Description"
            name="description"
            bold
            defaultValue={value("description", product.description)}
            error={error("description")}
            hint="Shown under Description on the product page, following the rule above. Leave a blank line between paragraphs. Leave it empty until the copy is approved: nothing is shown."
          />
          <TextArea
            label="Text below buttons"
            name="productInfoText"
            bold
            defaultValue={value("productInfoText", product.productInfoText)}
            error={error("productInfoText")}
            hint="Text shown under the Product Information and Test Reports buttons, following the rule above. Leave a blank line between paragraphs. Empty: nothing is shown."
          />
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="spec-heading">
        <h2 id="spec-heading" className={styles.panelTitle}>
          Specification
        </h2>
        <p className={styles.panelIntro}>
          Material facts for the specification table. Leave a field empty and its row is not shown.
        </p>
        <div className={`${styles.grid} ${styles.grid2}`}>
          <TextField
            label="Form"
            name="materialForm"
            defaultValue={value("materialForm", product.materialForm)}
            error={error("materialForm")}
            hint="For example Lyophilized powder."
          />
          <TextField
            label="Appearance"
            name="appearance"
            defaultValue={value("appearance", product.appearance)}
            error={error("appearance")}
            hint="For example White powder."
          />
          <TextField
            label="Storage conditions"
            name="storageConditions"
            defaultValue={value("storageConditions", product.storageConditions)}
            error={error("storageConditions")}
            hint="For example Store refrigerated at 2 to 8 °C."
          />
          <TextField
            label="CAS number"
            name="casNumber"
            mono
            defaultValue={value("casNumber", product.casNumber)}
            error={error("casNumber")}
            hint="For example 137525-51-0."
          />
          <TextField
            label="Molecular formula"
            name="molecularFormula"
            mono
            defaultValue={value("molecularFormula", product.molecularFormula)}
            error={error("molecularFormula")}
          />
          <TextField
            label="Molecular weight"
            name="molecularWeight"
            mono
            defaultValue={value("molecularWeight", product.molecularWeight)}
            error={error("molecularWeight")}
            hint="For example 1419.53 g/mol."
          />
          <TextField
            label="Purity method"
            name="purityMethod"
            defaultValue={value("purityMethod", product.purityMethod)}
            error={error("purityMethod")}
            hint="The test method only, for example HPLC. Never a purity percentage."
          />
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="seo-heading">
        <h2 id="seo-heading" className={styles.panelTitle}>
          Search engine listing
        </h2>
        <p className={styles.panelIntro}>
          Optional. How the page appears in Google and when shared. Left empty, the product name and
          short description are used.
        </p>
        <div className={styles.grid}>
          <TextField
            label="Search title"
            name="metaTitle"
            defaultValue={value("metaTitle", product.metaTitle)}
            error={error("metaTitle")}
            guide={{ max: 40 }}
            hint="The site adds “ | Kinetus BioLabs” after it, and search results show about 60 characters in total, so aim for 40 or fewer."
          />
          <TextArea
            label="Search description"
            name="metaDescription"
            short
            defaultValue={value("metaDescription", product.metaDescription)}
            error={error("metaDescription")}
            guide={{ max: 160 }}
            hint="Aim for 120 to 160 characters; search results cut longer text off. The content rule above applies here too."
          />
        </div>
      </section>

      <SizesSection
        productId={product.id}
        variants={product.variants}
        echoed={echoed}
        errors={state.errors ?? {}}
      />

      <section className={styles.panel} aria-labelledby="collections-heading">
        <h2 id="collections-heading" className={styles.panelTitle}>
          Collections
        </h2>
        <p className={styles.panelIntro}>
          A product belongs to at least one range (the menu tabs) and to any number of
          categories. A product in several ranges is listed in each of them.
        </p>
        <fieldset className={styles.field}>
          <legend className={styles.label}>Ranges</legend>
          {ranges.length === 0 ? (
            <p className={styles.hint}>No ranges exist yet.</p>
          ) : (
            <ul className={styles.checkList}>
              {ranges.map((range) => (
                <li key={range.id}>
                  <CheckboxField
                    label={range.status === "PUBLISHED" ? range.name : `${range.name} (draft)`}
                    name="rangeIds"
                    value={range.id}
                    defaultChecked={
                      echoedRanges
                        ? echoedRanges.includes(range.id)
                        : product.rangeIds.includes(range.id)
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {error("rangeIds") && <p className={styles.error}>{error("rangeIds")}</p>}
        </fieldset>
        <fieldset className={styles.field} style={{ marginTop: 18 }}>
          <legend className={styles.label}>Categories</legend>
          {categories.length === 0 ? (
            <p className={styles.hint}>
              No categories yet. Create them under Collections with the kind Category.
            </p>
          ) : (
            <ul className={styles.checkList}>
              {categories.map((category) => (
                <li key={category.id}>
                  <CheckboxField
                    label={
                      category.status === "PUBLISHED" ? category.name : `${category.name} (draft)`
                    }
                    name="categoryIds"
                    value={category.id}
                    defaultChecked={
                      echoedCategories
                        ? echoedCategories.includes(category.id)
                        : product.categoryIds.includes(category.id)
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          {error("categoryIds") && <p className={styles.error}>{error("categoryIds")}</p>}
        </fieldset>
      </section>
    </>
  );
}

type SizesProps = {
  /** Null while the product is being created: sizes can be removed once it is saved. */
  productId: string | null;
  variants: VariantFormData[];
  echoed: Record<string, string> | undefined;
  errors: Record<string, string>;
};

const BLANK_VARIANT: Omit<VariantFormData, "key"> = {
  label: "",
  sku: "",
  price: "",
  salePrice: "",
  saleStartsAt: "",
  saleEndsAt: "",
  stock: "",
  trackInventory: false,
  status: "ACTIVE",
  displayOrder: "",
  testReportUrl: "",
  testReportChanged: null,
};

/** Existing sizes, then blank rows for new ones ("Add another size" adds more). */
function SizesSection({ productId, variants, echoed, errors }: SizesProps) {
  const echoedNewRows = echoed
    ? (echoed.variantKeys ?? "").split("\n").filter((key) => key.startsWith("new-")).length
    : 0;
  const [newRows, setNewRows] = useState(Math.max(1, echoedNewRows));
  const rows: VariantFormData[] = [
    ...variants,
    ...Array.from({ length: newRows }, (_, index) => ({
      ...BLANK_VARIANT,
      key: `new-${index + 1}`,
    })),
  ];

  return (
    <section className={styles.panel} aria-labelledby="sizes-heading">
      <h2 id="sizes-heading" className={styles.panelTitle}>
        Sizes and prices
      </h2>
      <p className={styles.panelIntro}>
        Each size (strength) has its own price, sale and test report link. Prices are in Canadian
        dollars. To stop selling a size, set it to Archived; its history is kept.
      </p>
      <ul className={styles.cards}>
        {rows.map((row) => (
          <li key={row.key}>
            <VariantCard productId={productId} row={row} echoed={echoed} errors={errors} />
          </li>
        ))}
      </ul>
      <div className={styles.cardNote}>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => setNewRows((count) => count + 1)}
        >
          Add another size
        </button>
        <p className={styles.hint}>Blank new rows are ignored when you save.</p>
      </div>
    </section>
  );
}

/**
 * A saved size's Remove control: asks first, then deletes the size on the
 * server (deleteVariant), which refuses the product's last size and any size on an order.
 * The dialog uses buttons, not a form, because the card sits inside the product form.
 */
function RemoveVariant({
  productId,
  variantId,
  label,
}: {
  productId: string;
  variantId: string;
  label: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      try {
        const result = await deleteVariant(productId, variantId);
        setOpen(false);
        if (result.status === "ok") {
          // The page re-reads the product, so this card goes and the images list updates.
          router.refresh();
        } else {
          setMessage(result.message);
        }
      } catch {
        setOpen(false);
        setMessage("The size could not be deleted. Please try again.");
      }
    });
  };

  return (
    <div className={styles.cardNote}>
      <button
        type="button"
        className={styles.textButton}
        onClick={() => {
          setMessage(null);
          setOpen(true);
        }}
      >
        Remove
      </button>
      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
      <ConfirmDialog open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        <div className={styles.dialogBody}>
          <h2 id={titleId} className={styles.dialogTitle}>
            Delete the {label} size?
          </h2>
          <p className={styles.dialogText}>
            This deletes the size, its price and its own images straight away. It cannot be
            undone.
          </p>
          <div className={styles.dialogActions}>
            <button
              type="button"
              className={`${styles.button} ${styles.danger}`}
              onClick={onConfirm}
              disabled={pending}
            >
              {pending ? "Deleting…" : "Delete size"}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => setOpen(false)}
              data-initial-focus
            >
              Go back
            </button>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}

function VariantCard({
  productId,
  row,
  echoed,
  errors,
}: {
  productId: string | null;
  row: VariantFormData;
  echoed: Record<string, string> | undefined;
  errors: Record<string, string>;
}) {
  const isNew = row.key.startsWith("new-");
  const name = (field: string) => `variants.${row.key}.${field}`;
  const value = (field: keyof VariantFormData, saved: string) => echoed?.[name(field)] ?? saved;
  const error = (field: string) => errors[name(field)];
  const legend = isNew ? "New size" : row.label;
  const savedStock = row.stock === "" ? null : Number(row.stock);
  const oversoldBy = !isNew && savedStock !== null && savedStock < 0 ? -savedStock : 0;

  return (
    <fieldset className={isNew ? `${styles.card} ${styles.cardMuted}` : styles.card}>
      <legend className={styles.cardLegend}>{legend}</legend>
      <input type="hidden" name="variantKeys" value={row.key} />
      {/* The count as loaded: left unchanged, the save keeps the current count instead. */}
      {!isNew && <input type="hidden" name={name("stockLoaded")} value={row.stock} />}
      <div className={`${styles.grid} ${styles.grid4}`}>
        <TextField
          label="Size"
          name={name("label")}
          required={!isNew}
          defaultValue={value("label", row.label)}
          error={error("label")}
          hint="For example 10 mg."
          maxLength={40}
        />
        <TextField
          label="Price"
          name={name("price")}
          required={!isNew}
          prefix="$"
          inputMode="decimal"
          mono
          defaultValue={value("price", row.price)}
          error={error("price")}
          hint="Dollars, for example 45.00."
        />
        <TextField
          label="Sale price"
          name={name("salePrice")}
          prefix="$"
          inputMode="decimal"
          mono
          defaultValue={value("salePrice", row.salePrice)}
          error={error("salePrice")}
          hint="Lower than the price. Blank for no sale."
        />
        <SelectField
          label="Status"
          name={name("status")}
          options={VARIANT_STATUS_OPTIONS}
          defaultValue={value("status", row.status)}
          error={error("status")}
        />
        <TextField
          label="Sale starts"
          name={name("saleStartsAt")}
          type="datetime-local"
          defaultValue={value("saleStartsAt", row.saleStartsAt)}
          error={error("saleStartsAt")}
          hint={`${STORE_TIME_ZONE_LABEL}. Blank: starts now.`}
        />
        <TextField
          label="Sale ends"
          name={name("saleEndsAt")}
          type="datetime-local"
          defaultValue={value("saleEndsAt", row.saleEndsAt)}
          error={error("saleEndsAt")}
          hint={`${STORE_TIME_ZONE_LABEL}. Blank: no end.`}
        />
        <TextField
          label="SKU"
          name={name("sku")}
          mono
          defaultValue={value("sku", row.sku)}
          error={error("sku")}
          hint="Optional stock-keeping code."
          maxLength={60}
        />
        <TextField
          label="Order"
          name={name("displayOrder")}
          inputMode="numeric"
          mono
          defaultValue={value("displayOrder", row.displayOrder)}
          error={error("displayOrder")}
          hint="Lower numbers come first."
        />
        <TextField
          label="Stock"
          name={name("stock")}
          inputMode="numeric"
          mono
          defaultValue={value("stock", row.stock)}
          error={error("stock")}
          hint={
            oversoldBy > 0 ? (
              <span className={styles.stockNoteWarn}>
                Oversold by {oversoldBy}: more were marked paid than were in stock. Enter the real
                count when you restock.
              </span>
            ) : (
              "Units on hand. Used only when stock is tracked. Goes down when an order is marked paid and back up if it is cancelled."
            )
          }
        />
        <CheckboxField
          className={styles.span2}
          label="Track stock"
          name={name("trackInventory")}
          defaultChecked={echoed ? echoed[name("trackInventory")] === "on" : row.trackInventory}
          hint="The product page then shows In stock or Sold out for this size."
        />
        <TextField
          className={styles.spanAll}
          label="Test report link"
          name={name("testReportUrl")}
          type="url"
          inputMode="url"
          defaultValue={value("testReportUrl", row.testReportUrl)}
          error={error("testReportUrl")}
          hint={
            <>
              The third-party test report for this product at this strength, starting with https://.
              Once a size has one, the product appears on the Test Reports page, linked from its
              product page.
              {row.testReportChanged ? ` Last changed ${row.testReportChanged}.` : ""}
            </>
          }
        />
      </div>
      {!isNew && productId && (
        <RemoveVariant productId={productId} variantId={row.key} label={row.label} />
      )}
    </fieldset>
  );
}
