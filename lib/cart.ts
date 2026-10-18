import { Prisma, ProductStatus, VariantStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  discountCodeProblem,
  effectivePriceCents,
  isSaleActive,
  priceCart,
  type AppliedCode,
  type Destination,
  type DiscountCodeFields,
  type DiscountCodeProblem,
  type PriceSummary,
  type PricingSettings,
  type TaxRateFields,
  type VolumeTier,
} from "@/lib/pricing";
import { imagesForVariant } from "@/lib/product-images";
import { DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping";

/**
 * The cart: `{ variantId, quantity }` pairs in an httpOnly cookie and nothing else. Every
 * name, price, discount and total is resolved from the database on each read and priced
 * by lib/pricing.ts, so editing the cookie can change what is in the cart but never what
 * anything costs. Server only (reads cookies and the database).
 */

export const CART_COOKIE = "kinetus_cart";
/** The discount code the customer entered on the cart page. Revalidated on every read. */
export const CODE_COOKIE = "kinetus_code";

export const MAX_CART_LINES = 20;
export const MAX_LINE_QUANTITY = 99;
const MAX_CODE_LENGTH = 40;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type CartEntry = { variantId: string; quantity: number };

/**
 * Variant ids: cuid() for admin-created variants, "var_<slug>_<size>" for seeded ones.
 * Anything else in the cookie is dropped before it reaches the database.
 */
const VARIANT_ID_PATTERN = /^[a-z0-9][a-z0-9_.-]{0,99}$/i;

export function isVariantId(value: unknown): value is string {
  return typeof value === "string" && VARIANT_ID_PATTERN.test(value);
}

/**
 * Parses the cookie defensively: malformed JSON, unknown shapes, bad ids, non-integer or
 * out-of-range quantities and duplicates are dropped, and the list is capped.
 */
export function parseCart(raw: string | undefined): CartEntry[] {
  if (!raw) {
    return [];
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) {
    return [];
  }
  const entries: CartEntry[] = [];
  const seen = new Set<string>();
  for (const item of data) {
    if (!Array.isArray(item) || item.length !== 2) {
      continue;
    }
    const [variantId, quantity] = item as unknown[];
    if (
      !isVariantId(variantId) ||
      seen.has(variantId) ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_LINE_QUANTITY
    ) {
      continue;
    }
    seen.add(variantId);
    entries.push({ variantId, quantity });
    if (entries.length === MAX_CART_LINES) {
      break;
    }
  }
  return entries;
}

function serialiseCart(entries: CartEntry[]): string {
  return JSON.stringify(entries.map((entry) => [entry.variantId, entry.quantity]));
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
} as const;

export async function readCart(): Promise<CartEntry[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

/** Server actions only: cookies cannot be set while rendering. */
export async function writeCart(entries: CartEntry[]): Promise<void> {
  const store = await cookies();
  if (entries.length === 0) {
    store.delete(CART_COOKIE);
    return;
  }
  store.set(CART_COOKIE, serialiseCart(entries.slice(0, MAX_CART_LINES)), cookieOptions);
}

export async function readCodeInput(): Promise<string | null> {
  const value = (await cookies()).get(CODE_COOKIE)?.value?.trim();
  return value ? value.slice(0, MAX_CODE_LENGTH) : null;
}

/** Server actions only. */
export async function writeCodeInput(code: string | null): Promise<void> {
  const store = await cookies();
  if (code === null) {
    store.delete(CODE_COOKIE);
    return;
  }
  store.set(CODE_COOKIE, code.slice(0, MAX_CODE_LENGTH), cookieOptions);
}

/* -------------------------------------------------------------------------- */
/*  Resolving lines                                                           */
/* -------------------------------------------------------------------------- */

type Db = typeof prisma | Prisma.TransactionClient;

const variantSelect = {
  id: true,
  label: true,
  sku: true,
  price: true,
  salePrice: true,
  saleStartsAt: true,
  saleEndsAt: true,
  stock: true,
  trackInventory: true,
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
        select: { url: true, altText: true, variantId: true },
      },
    },
  },
} satisfies Prisma.ProductVariantSelect;

export type CartLine = {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  sku: string | null;
  unitPriceCents: number;
  /** Regular price while a sale is active, otherwise null. */
  compareAtCents: number | null;
  quantity: number;
  lineTotalCents: number;
  imageUrl: string | null;
  imageAlt: string;
  /** Units available when stock is tracked, otherwise null (no limit). */
  available: number | null;
  /** Units in the cart beyond what is available (0 when fine). */
  shortfall: number;
};

export type ResolvedCart = {
  lines: CartLine[];
  /** Entries dropped because the variant is archived, unpublished or deleted. */
  unavailableCount: number;
};

/** Units that can be ordered: stock when tracked, otherwise unlimited (null). */
export function availableUnits(variant: { trackInventory: boolean; stock: number | null }) {
  return variant.trackInventory ? Math.max(0, variant.stock ?? 0) : null;
}

/**
 * Looks every entry up in the database and keeps only purchasable ones: an active variant
 * of a published product. Order follows the cookie.
 */
export async function resolveCart(
  entries: CartEntry[],
  now: Date,
  db: Db = prisma,
): Promise<ResolvedCart> {
  if (entries.length === 0) {
    return { lines: [], unavailableCount: 0 };
  }
  const variants = await db.productVariant.findMany({
    where: {
      id: { in: entries.map((entry) => entry.variantId) },
      status: VariantStatus.ACTIVE,
      product: { status: ProductStatus.PUBLISHED },
    },
    select: variantSelect,
  });
  const byId = new Map(variants.map((variant) => [variant.id, variant]));

  const lines: CartLine[] = [];
  for (const entry of entries) {
    const variant = byId.get(entry.variantId);
    if (!variant) {
      continue;
    }
    const unitPriceCents = effectivePriceCents(variant, now);
    const image = imagesForVariant(variant.product.images, variant.id)[0] ?? null;
    const available = availableUnits(variant);
    lines.push({
      variantId: variant.id,
      productId: variant.product.id,
      productSlug: variant.product.slug,
      productName: variant.product.name,
      variantLabel: variant.label,
      sku: variant.sku,
      unitPriceCents,
      compareAtCents: isSaleActive(variant, now) ? variant.price : null,
      quantity: entry.quantity,
      lineTotalCents: unitPriceCents * entry.quantity,
      imageUrl: image?.url ?? null,
      imageAlt: image?.altText ?? `${variant.product.name} ${variant.label}`,
      available,
      shortfall: available === null ? 0 : Math.max(0, entry.quantity - available),
    });
  }
  return { lines, unavailableCount: entries.length - lines.length };
}

/* -------------------------------------------------------------------------- */
/*  Pricing context and discount codes                                        */
/* -------------------------------------------------------------------------- */

export type PricingContext = {
  tiers: VolumeTier[];
  settings: PricingSettings & {
    etransferEmail: string | null;
    etransferInstructions: string | null;
  };
  taxRates: TaxRateFields[];
};

/** Defaults match the StoreSetting column defaults, for a database without the row. */
const DEFAULT_SETTINGS: PricingContext["settings"] = {
  taxEnabled: false,
  shippingFlatCents: 2000,
  freeShippingThresholdCents: DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS,
  localFreeCity: "Calgary",
  etransferEmail: null,
  etransferInstructions: null,
};

export async function getPricingContext(db: Db = prisma): Promise<PricingContext> {
  const [tiers, settings, taxRates] = await Promise.all([
    db.volumeDiscountTier.findMany({
      where: { isActive: true },
      orderBy: { minQuantity: "asc" },
      select: { minQuantity: true, percentOff: true, isActive: true },
    }),
    db.storeSetting.findUnique({ where: { id: "store" } }),
    db.taxRate.findMany({ select: { province: true, label: true, rateBps: true, isActive: true } }),
  ]);
  return {
    tiers,
    settings: settings
      ? {
          taxEnabled: settings.taxEnabled,
          shippingFlatCents: settings.shippingFlatCents,
          freeShippingThresholdCents: settings.freeShippingThresholdCents,
          localFreeCity: settings.localFreeCity,
          etransferEmail: settings.etransferEmail,
          etransferInstructions: settings.etransferInstructions,
        }
      : DEFAULT_SETTINGS,
    taxRates,
  };
}

/** Case-insensitive lookup. */
export function findDiscountCode(
  input: string,
  db: Db = prisma,
): Promise<DiscountCodeFields | null> {
  return db.discountCode.findFirst({
    where: { code: { equals: input.trim(), mode: "insensitive" } },
    select: {
      code: true,
      percentOff: true,
      isActive: true,
      startsAt: true,
      endsAt: true,
      maxRedemptions: true,
      timesRedeemed: true,
    },
  });
}

export type CodeCheck =
  | { status: "none" }
  | { status: "valid"; code: AppliedCode }
  | { status: "invalid"; input: string; problem: DiscountCodeProblem };

export async function checkDiscountCode(
  input: string | null,
  now: Date,
  db: Db = prisma,
): Promise<CodeCheck> {
  if (!input) {
    return { status: "none" };
  }
  const code = await findDiscountCode(input, db);
  const problem = discountCodeProblem(code, now);
  if (problem || !code) {
    return { status: "invalid", input, problem: problem ?? "not_found" };
  }
  return {
    status: "valid",
    code: { code: code.code, percentOff: code.percentOff },
  };
}

/* -------------------------------------------------------------------------- */
/*  The whole cart, priced                                                    */
/* -------------------------------------------------------------------------- */

export type PricedCart = ResolvedCart & {
  summary: PriceSummary;
  codeCheck: CodeCheck;
  context: PricingContext;
};

/** The cookie cart resolved and priced. `destination` is null before an address is known. */
export async function loadPricedCart(
  destination: Destination,
  now = new Date(),
): Promise<PricedCart> {
  const [entries, codeInput, context] = await Promise.all([
    readCart(),
    readCodeInput(),
    getPricingContext(),
  ]);
  const [resolved, codeCheck] = await Promise.all([
    resolveCart(entries, now),
    checkDiscountCode(codeInput, now),
  ]);
  const summary = priceCart({
    lines: resolved.lines,
    tiers: context.tiers,
    code: codeCheck.status === "valid" ? codeCheck.code : null,
    settings: context.settings,
    taxRates: context.taxRates,
    destination,
  });
  return { ...resolved, summary, codeCheck, context };
}

/** Units in the cart that are still purchasable, for the header count. */
export async function cartItemCount(): Promise<number> {
  const entries = await readCart();
  if (entries.length === 0) {
    return 0;
  }
  const valid = await prisma.productVariant.findMany({
    where: {
      id: { in: entries.map((entry) => entry.variantId) },
      status: VariantStatus.ACTIVE,
      product: { status: ProductStatus.PUBLISHED },
    },
    select: { id: true },
  });
  const ids = new Set(valid.map((variant) => variant.id));
  return entries.reduce((sum, entry) => (ids.has(entry.variantId) ? sum + entry.quantity : sum), 0);
}
