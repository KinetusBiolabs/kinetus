import Image from "next/image";
import Link from "next/link";
import { Container } from "./Container";
import { HeaderNav } from "./HeaderNav";
import { UtilityBar } from "./UtilityBar";
import { getPrimaryNav } from "@/lib/navigation";
import { freeShippingLine, getFreeShippingThresholdCents } from "@/lib/shipping";
import { SITE_NAME } from "@/lib/site";
import styles from "./Header.module.css";

/** Horizontal logo (772 x 183, transparent): 64px tall on desktop, 44px on mobile via CSS. */
const LOGO = { src: "/brand/kinetus-logo-horizontal.png", width: 270, height: 64 };

/**
 * Site header (deck slide 4): the utility bar, then a sticky white bar with the horizontal
 * logo on the left, the primary navigation with dropdowns, the search, below the desktop breakpoint the hamburger that opens the
 * drawer, and the cart link at the far right at every width. Navigation comes from the
 * published ranges (lib/navigation.ts, cached under the `nav` tag) plus fixed items. The utility bar is outside the sticky element so it scrolls away.
 */
export async function Header() {
  const [items, threshold] = await Promise.all([
    getPrimaryNav(),
    getFreeShippingThresholdCents(),
  ]);
  // Admin > Settings free-shipping amount, in the utility bar and the mobile drawer.
  const shippingLine = freeShippingLine(threshold);
  return (
    <>
      <UtilityBar shippingLine={shippingLine} />
      <header className={styles.header}>
        <Container className={styles.row}>
          <Link href="/" className={styles.logoLink} aria-label={`${SITE_NAME} home`}>
            <Image
              src={LOGO.src}
              alt={SITE_NAME}
              width={LOGO.width}
              height={LOGO.height}
              className={styles.logo}
              preload
            />
          </Link>

          <HeaderNav items={items} shippingLine={shippingLine} />
        </Container>
      </header>
    </>
  );
}
