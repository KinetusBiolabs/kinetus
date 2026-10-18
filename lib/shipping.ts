import { CACHE_TAGS, cachedQuery } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { formatCad } from "@/lib/pricing";

/**
 * The free-shipping threshold (StoreSetting.freeShippingThresholdCents, Admin > Settings)
 * wherever the site quotes it: the utility bar and mobile menu on every page, the Shipping
 * Policy and the FAQ. The cart and checkout price with the same column through
 * lib/cart.ts getPricingContext, so the quoted amount and the rule never disagree.
 */

/** Matches the column default: used only while the settings row does not exist. */
export const DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS = 24900;

/** Written in content files where the amount goes; filled in at render time. */
export const FREE_SHIPPING_THRESHOLD_TOKEN = "{{FREE_SHIPPING_THRESHOLD}}";

/**
 * Tagged `shipping`: every public page shows the amount in the utility bar, so saving
 * Admin > Settings expires the tag and each page renders the new amount on its next visit.
 */
export const getFreeShippingThresholdCents = cachedQuery(
  "free-shipping-threshold",
  async (): Promise<number> => {
    const settings = await prisma.storeSetting.findUnique({
      where: { id: "store" },
      select: { freeShippingThresholdCents: true },
    });
    return settings?.freeShippingThresholdCents ?? DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS;
  },
  () => [CACHE_TAGS.shipping],
);

/** "$249" for whole dollars (as the client's copy writes it), otherwise "$249.50". */
export function formatFreeShippingThreshold(cents: number): string {
  const formatted = formatCad(cents);
  return cents % 100 === 0 ? formatted.replace(/\.00$/, "") : formatted;
}

/** The utility-bar line (deck slide 4 wording) with the current amount. */
export function freeShippingLine(cents: number): string {
  return `FREE SHIPPING ON ORDERS OVER ${formatFreeShippingThreshold(cents)} (CAN)`;
}

/**
 * Returns a copy of a content document (plain strings, arrays and objects) with every
 * FREE_SHIPPING_THRESHOLD_TOKEN replaced by the formatted amount. Nothing else changes.
 */
export function withFreeShippingThreshold<T>(value: T, cents: number): T {
  const amount = formatFreeShippingThreshold(cents);
  const fill = (node: unknown): unknown => {
    if (typeof node === "string") {
      return node.replaceAll(FREE_SHIPPING_THRESHOLD_TOKEN, () => amount);
    }
    if (Array.isArray(node)) {
      return node.map(fill);
    }
    if (node !== null && typeof node === "object") {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>).map(([key, item]) => [key, fill(item)]),
      );
    }
    return node;
  };
  return fill(value) as T;
}
