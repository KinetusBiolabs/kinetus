import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

/**
 * On-demand revalidation for admin saves. `{ expire: 0 }` expires the tagged data at once,
 * so the very next visit to an affected public page renders fresh data (the default "max"
 * profile would serve the old page once more while regenerating in the background).
 */
const EXPIRE_NOW = { expire: 0 };

/**
 * After a product save: every page showing product data (product pages, cards, listings,
 * the homepage, collection pages, the sitemap), the navigation, and each named slug's page
 * (including a retired slug, which now redirects).
 */
export function expireProductPages(...slugs: string[]): void {
  revalidateTag(CACHE_TAGS.products, EXPIRE_NOW);
  revalidateTag(CACHE_TAGS.nav, EXPIRE_NOW);
  for (const slug of new Set(slugs)) {
    revalidateTag(CACHE_TAGS.product(slug), EXPIRE_NOW);
  }
  refreshAdmin();
}

/**
 * After a collection save: every page showing collection data (collection pages, the
 * /collections hub, product pages, which show their collections, the sitemap), the
 * navigation, and each named slug's page.
 */
export function expireCollectionPages(...slugs: string[]): void {
  revalidateTag(CACHE_TAGS.collections, EXPIRE_NOW);
  revalidateTag(CACHE_TAGS.nav, EXPIRE_NOW);
  for (const slug of new Set(slugs)) {
    revalidateTag(CACHE_TAGS.collection(slug), EXPIRE_NOW);
  }
  refreshAdmin();
}

/** After a volume tier save: every product page shows the tiers. */
export function expireVolumeTierPages(): void {
  revalidateTag(CACHE_TAGS.products, EXPIRE_NOW);
  refreshAdmin();
}

/**
 * After a store settings save: the free-shipping amount appears on every public page (the
 * utility bar), the Shipping Policy and the FAQ, all read under the `shipping` tag. The
 * cart and checkout read settings per request and need nothing.
 */
export function expireShippingAmount(): void {
  revalidateTag(CACHE_TAGS.shipping, EXPIRE_NOW);
  refreshAdmin();
}

/** Admin pages are rendered per request; this refreshes the one the save came from. */
export function refreshAdmin(): void {
  revalidatePath("/admin", "layout");
}
