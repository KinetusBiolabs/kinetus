import type { Metadata } from "next";
import styles from "@/components/admin/admin.module.css";
import { requireAdmin } from "@/lib/admin/auth";
import { bpsToInput, centsToInput } from "@/lib/admin/forms";
import { prisma } from "@/lib/db";
import { DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping";
import {
  ChangePasswordForm,
  ProductPageTextForm,
  StoreSettingsForm,
  TaxRatesForm,
} from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

/** Province order for the rates list: alphabetical by code, as seeded. */
const PROVINCE_ORDER = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
];

/** /admin/settings: the single store settings row and the provincial tax rates. */
export default async function SettingsPage() {
  await requireAdmin();
  const [settings, rates] = await Promise.all([
    prisma.storeSetting.findUnique({ where: { id: "store" } }),
    prisma.taxRate.findMany(),
  ]);
  rates.sort(
    (a, b) =>
      PROVINCE_ORDER.indexOf(a.province) - PROVINCE_ORDER.indexOf(b.province) ||
      a.province.localeCompare(b.province),
  );

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          <h1 className={styles.pageTitle}>Settings</h1>
          <p className={styles.pageIntro}>Sales tax, shipping and order payment details.</p>
        </div>
      </div>

      <div className={`${styles.notice} ${styles.noticeInfo}`}>
        <p>
          The cart and checkout use these values: the shipping charge and free-shipping rules apply
          to every order, and tax is charged only while it is switched on. The free shipping
          threshold is also the amount quoted at the top of every page, in the Shipping Policy and
          in the FAQ.
        </p>
      </div>

      <StoreSettingsForm
        settings={{
          taxEnabled: settings?.taxEnabled ?? false,
          gstNumber: settings?.gstNumber ?? "",
          shippingFlat: centsToInput(settings?.shippingFlatCents ?? 2000),
          freeShippingThreshold: centsToInput(
            settings?.freeShippingThresholdCents ?? DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS,
          ),
          localFreeCity: settings?.localFreeCity ?? "",
          shipsInternationally: settings?.shipsInternationally ?? false,
          orderNotifyEmail: settings?.orderNotifyEmail ?? "",
          etransferEmail: settings?.etransferEmail ?? "",
          etransferInstructions: settings?.etransferInstructions ?? "",
          payeeName: settings?.payeeName ?? "",
          securityQuestion: settings?.securityQuestion ?? "",
          securityAnswer: settings?.securityAnswer ?? "",
          holdPeriodText: settings?.holdPeriodText ?? "",
        }}
      />
      <ProductPageTextForm introText={settings?.productIntroText ?? ""} />
      <TaxRatesForm
        rates={rates.map((rate) => ({
          id: rate.id,
          province: rate.province,
          label: rate.label,
          rate: bpsToInput(rate.rateBps),
          isActive: rate.isActive,
        }))}
      />
      <ChangePasswordForm />
    </>
  );
}
