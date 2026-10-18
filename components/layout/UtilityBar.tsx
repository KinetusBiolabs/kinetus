import Link from "next/link";
import { Container } from "./Container";
import { TruckIcon } from "@/components/icons/LineIcons";
import { UTILITY_BAR_LINES } from "@/lib/site";
import styles from "./UtilityBar.module.css";

/**
 * Utility bar above the header (deck slide 4): a navy strip with the two packaging strings
 * on the left, a bullet between them, and the shipping line on the right linking to the
 * shipping policy. The shipping item hides on mobile. The bar sits outside the sticky
 * header so it scrolls away with the page. `shippingLine` carries the Admin > Settings
 * free-shipping amount (lib/shipping.ts).
 */
export function UtilityBar({ shippingLine }: { shippingLine: string }) {
  return (
    <div className={styles.bar}>
      <Container className={styles.row}>
        <p className={styles.notice}>
          <span className={styles.line}>{UTILITY_BAR_LINES[0]}</span>
          {/* Bullet and second string travel together, so a wrap never strands the bullet
              at the end of the first line. */}
          <span className={styles.pair}>
            <span className={styles.bullet} aria-hidden="true">
              •
            </span>
            <span className={styles.line}>{UTILITY_BAR_LINES[1]}</span>
          </span>
        </p>

        <Link href="/shipping-policy" className={styles.shipping}>
          <TruckIcon size={22} className={styles.shippingIcon} />
          <span>{shippingLine}</span>
        </Link>
      </Container>
    </div>
  );
}
