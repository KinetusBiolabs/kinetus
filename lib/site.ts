/**
 * Site-wide constants shared by the layout shell, the pages and the SEO routes.
 * Only confirmed client facts belong here. Nothing is fabricated.
 */

export const SITE_NAME = "Kinetus BioLabs";

/**
 * Research-use disclaimer. Exact copy sourced from the client's packaging and the
 * "Kinetus RESEARCH USE - PRODUCT DISCLAIMER" document. Do not paraphrase.
 */
export const RESEARCH_USE_COPY_LINES = [
  "For Research Use Only.",
  "Not for Human or Animal Use.",
] as const;

export const RESEARCH_USE_COPY = RESEARCH_USE_COPY_LINES.join(" ");

/** Utility-bar strings, verbatim from the client's packaging and the approved deck. */
export const UTILITY_BAR_LINES = ["RESEARCH USE ONLY", "NOT FOR HUMAN CONSUMPTION."] as const;

/** Packaging tagline, verbatim. */
export const TAGLINE = "PRECISION SCIENCE. PEAK POTENTIAL.";

/**
 * Where the sticky supplier-facts bar (components/layout/StickyTrustBar.tsx) appears.
 * false: the homepage only (the conservative reading of the client's request); true:
 * every public page, rendered by SiteChrome above the research-use band.
 */
export const TRUST_BAR_SITE_WIDE: boolean = false;

/** Hero eyebrow, verbatim from the approved deck (slides 4 and 12). */
export const HERO_EYEBROW = "PRECISION SCIENCE. ANALYTICAL CONFIDENCE.";

/**
 * Strings permitted verbatim from the client's packaging. Any trust, badge or icon label
 * on the site must be one of these (or a neutral material fact).
 */
export const PACKAGING = {
  researchUseOnly: "FOR RESEARCH USE ONLY",
  notForHumanConsumption: "NOT FOR HUMAN CONSUMPTION",
  labVerified: "LAB VERIFIED PURITY & POTENCY",
  thirdPartyTested: "THIRD-PARTY TESTED",
  researchGrade: "RESEARCH GRADE MATERIAL",
  batchCoa: "BATCH-SPECIFIC COA AVAILABLE",
  tagline: "PRECISION SCIENCE. PEAK POTENTIAL.",
  qualityYouCanTrust: "QUALITY YOU CAN TRUST",
} as const;

/**
 * The only contact channel confirmed in the client's documents (Terms §18, Privacy §14).
 * TODO: confirm the mailbox is live before launch.
 */
export const CONTACT_EMAIL = "info@kinetusbiolabs.ca";

/** The client's documents give the company location as "Canada" and nothing more. */
export const LOCATION = "Canada";

/** Collection slugs fixed by the seed and the deck's navigation. */
export const COLLECTION_SLUGS = {
  peptides: "peptides",
  blends: "blends",
  labSupplies: "lab-supplies",
  research: "research",
} as const;

export function collectionHref(slug: string): string {
  return `/collections/${slug}`;
}

export type NavLink = {
  label: string;
  href: string;
};

/** A primary-nav entry; `children` makes it a dropdown (desktop) / accordion (drawer). */
export type NavItem = NavLink & {
  children?: NavLink[];
};

/** The Research Area page, a fixed navigation item (the Research range is unpublished). */
export const RESEARCH_LINK: NavLink = { label: "Research", href: "/research" };

/**
 * The fixed part of the primary navigation, after the published ranges (lib/navigation.ts
 * builds those from the catalogue). Deck order: PEPTIDES ▾ · BLENDS ▾ · LAB SUPPLIES ▾ ·
 * RESEARCH · ABOUT US ▾ · CONTACT.
 */
export const FIXED_NAV_ITEMS: NavItem[] = [
  RESEARCH_LINK,
  {
    label: "About Us",
    href: "/about",
    children: [
      { label: "Our Story", href: "/about#our-story" },
      { label: "Quality Standards", href: "/about#quality-standards" },
      { label: "Why Choose Kinetus", href: "/about#why-choose-kinetus" },
      { label: "Proudly Canadian", href: "/about#proudly-canadian" },
      { label: "Legal", href: "/legal" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

/**
 * Header icon cluster (deck: search / account / cart). The site has no accounts, so the
 * slots are search, documentation and the cart (the cart sits outside the cluster so it
 * stays visible at every width). Contact is a primary navigation item.
 */
export const HEADER_ICON_LINKS = {
  search: { label: "Search the catalogue", href: "/search" },
  documentation: { label: "Test reports and documentation", href: "/documentation" },
  cart: { label: "Cart", href: "/cart" },
} as const;

/** Canonical full listing. */
export const ALL_PRODUCTS_LINK: NavLink = { label: "View all products", href: "/products" };

/** Hub of every published collection. */
export const ALL_COLLECTIONS_LINK: NavLink = { label: "All collections", href: "/collections" };

export const CONTACT_LINK: NavLink = { label: "Contact", href: "/contact" };

export const FOOTER_COMPANY_LINKS: NavLink[] = [
  { label: "About us", href: "/about" },
  { label: "Research", href: "/research" },
  { label: "Test reports", href: "/documentation" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Legal", href: "/legal" },
];

export const FOOTER_POLICY_LINKS: NavLink[] = [
  { label: "Terms & conditions", href: "/terms" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Shipping policy", href: "/shipping-policy" },
  { label: "Returns & refund policy", href: "/returns-policy" },
  { label: "Research use disclaimer", href: "/research-use" },
];

/** Static top-level routes listed in the sitemap (search is request-time and excluded). */
export const STATIC_ROUTES: string[] = [
  "/",
  "/products",
  "/collections",
  "/about",
  "/faq",
  "/contact",
  "/research",
  "/documentation",
  "/legal",
  "/terms",
  "/privacy-policy",
  "/shipping-policy",
  "/returns-policy",
  "/research-use",
];
