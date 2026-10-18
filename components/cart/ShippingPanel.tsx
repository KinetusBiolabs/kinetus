import { TruckIcon } from "@/components/icons/LineIcons";
import { formatCad } from "@/lib/pricing";
import styles from "./ShippingPanel.module.css";

type ShippingPanelProps = {
  shippingFlatCents: number;
  freeShippingThresholdCents: number;
  localFreeCity: string | null;
};

/**
 * Shipping and delivery, from the store settings in the client's wording (Shipping Policy:
 * "Orders over {amount} CAD qualify for free shipping within Canada", the amount from
 * Admin > Settings; Canada Post Priority with tracking).
 */
export function ShippingPanel({
  shippingFlatCents,
  freeShippingThresholdCents,
  localFreeCity,
}: ShippingPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="shipping-panel-heading">
      <h2 id="shipping-panel-heading" className={styles.heading}>
        <TruckIcon size={22} className={styles.icon} />
        Shipping and delivery
      </h2>
      <ul className={styles.list}>
        <li>Flat rate of {formatCad(shippingFlatCents)} for shipping anywhere in Canada.</li>
        <li>
          Orders over {formatCad(freeShippingThresholdCents)} CAD qualify for free shipping within
          Canada.
        </li>
        {localFreeCity && <li>Free delivery within {localFreeCity}.</li>}
        <li>Orders ship by Canada Post Priority with tracking.</li>
      </ul>
    </section>
  );
}
