import { unstable_cache } from "next/cache";

/**
 * Cache tags for catalogue data. Catalogue pages are statically generated and never
 * regenerate on a timer: every query below is tagged, and each admin save expires the
 * tags it affects (lib/admin/revalidate.ts), so the next visit renders fresh data.
 *
 *   products          anything that shows product data (pages, cards, listings, sitemap)
 *   product:<slug>    one product page, including the 404 or redirect at a retired slug
 *   collections       anything that shows collection data
 *   collection:<slug> one collection page, including a retired slug
 *   nav               navigation built from the catalogue
 *   shipping          the free-shipping amount, quoted on every public page
 */
export const CACHE_TAGS = {
  products: "products",
  collections: "collections",
  nav: "nav",
  shipping: "shipping",
  product: (slug: string) => `product:${slug}`,
  collection: (slug: string) => `collection:${slug}`,
} as const;

const DATE_KEY = "$date";

/**
 * Part of every cache key. The data cache outlives a deployment, so without this a new
 * deployment would keep serving whatever an earlier one cached, and a change made outside
 * the admin (a seed run, a direct database edit) would never appear. Keying on the
 * deployment means every deploy reads the database afresh, as the site did before the data
 * cache; within a deployment, admin saves expire the tags.
 */
const DATA_VERSION =
  process.env.VERCEL_DEPLOYMENT_ID ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "local";

/**
 * unstable_cache stores results as JSON, which would turn every Date (sale windows,
 * updatedAt) into a string on a cache hit. Dates are therefore encoded explicitly on the
 * way in and revived on the way out, so callers always receive the Prisma types.
 */
function encode(value: unknown): string {
  return JSON.stringify(value, function (this: Record<string, unknown>, key, current) {
    const raw = this[key];
    return raw instanceof Date ? { [DATE_KEY]: raw.toISOString() } : current;
  });
}

function decode<T>(text: string): T {
  return JSON.parse(text, (_key, value: unknown) => {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record);
      if (keys.length === 1 && keys[0] === DATE_KEY && typeof record[DATE_KEY] === "string") {
        return new Date(record[DATE_KEY]);
      }
    }
    return value;
  }) as T;
}

/**
 * Wraps a database query in the data cache under `name` (unique per query) with the tags
 * returned for its arguments. No time-based expiry: the tags are the only way in.
 */
export function cachedQuery<Args extends Array<string | number | undefined>, Result>(
  name: string,
  query: (...args: Args) => Promise<Result>,
  tags: (...args: NoInfer<Args>) => string[],
): (...args: Args) => Promise<Result> {
  return async (...args: Args) => {
    const load = unstable_cache(
      async () => encode(await query(...args)),
      [name, DATA_VERSION, ...args.map((arg) => String(arg))],
      { tags: tags(...args) },
    );
    return decode<Result>(await load());
  };
}

/**
 * A scheduled sale changes a price without anyone saving in the admin, so a page that
 * shows prices must regenerate when the next sale starts or ends. A tiny cached entry with
 * a matching `revalidate` shortens the page's regeneration period to exactly that moment
 * (the page takes the shortest period of anything it reads). Without an upcoming boundary
 * the page waits for an admin save.
 */
export async function regenerateAt(moment: Date | null, now: Date): Promise<void> {
  if (moment === null || moment <= now) {
    return;
  }
  const seconds = Math.max(60, Math.ceil((moment.getTime() - now.getTime()) / 1000));
  const iso = moment.toISOString();
  await unstable_cache(async () => iso, ["price-change", iso], { revalidate: seconds })();
}
