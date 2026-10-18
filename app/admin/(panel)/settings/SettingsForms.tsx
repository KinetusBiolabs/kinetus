"use client";

import { useActionState } from "react";
import { CheckboxField, TextArea, TextField } from "@/components/admin/Fields";
import { FormNotice, SaveBar } from "@/components/admin/FormNotice";
import styles from "@/components/admin/admin.module.css";
import { IDLE_STATE } from "@/lib/admin/forms";
import {
  changeAdminPassword,
  saveProductPageText,
  saveStoreSettings,
  saveTaxRates,
} from "./actions";

export type SettingsData = {
  taxEnabled: boolean;
  gstNumber: string;
  shippingFlat: string;
  freeShippingThreshold: string;
  localFreeCity: string;
  shipsInternationally: boolean;
  orderNotifyEmail: string;
  etransferEmail: string;
  etransferInstructions: string;
  payeeName: string;
  securityQuestion: string;
  securityAnswer: string;
  holdPeriodText: string;
};

export type TaxRateRow = {
  id: string;
  province: string;
  label: string;
  rate: string;
  isActive: boolean;
};

export function StoreSettingsForm({ settings }: { settings: SettingsData }) {
  const [state, formAction] = useActionState(saveStoreSettings, IDLE_STATE);
  const echoed = state.status === "error" ? state.values : undefined;
  const value = (name: keyof SettingsData, saved: string) => echoed?.[name] ?? saved;
  const checked = (name: keyof SettingsData, saved: boolean) =>
    echoed ? echoed[name] === "on" : saved;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <section className={styles.panel} aria-labelledby="store-heading">
        <h2 id="store-heading" className={styles.panelTitle}>
          Tax and shipping
        </h2>
        <FormNotice state={state} />
        <div key={state.savedAt ?? "initial"}>
          <h3 className={styles.subTitle}>Sales tax</h3>
          <div className={`${styles.notice} ${styles.noticeInfo}`}>
            <p>
              Sales tax in Canada is charged based on the customer&apos;s province, and this should
              stay switched off until the business confirms it is registered to collect GST/HST.
            </p>
          </div>
          <div className={`${styles.grid} ${styles.grid2}`}>
            <CheckboxField
              label="Charge sales tax"
              name="taxEnabled"
              defaultChecked={checked("taxEnabled", settings.taxEnabled)}
              error={errors.taxEnabled}
              hint="Leave this off until the accountant confirms the GST/HST registration."
            />
            <TextField
              label="GST/HST registration number"
              name="gstNumber"
              mono
              defaultValue={value("gstNumber", settings.gstNumber)}
              error={errors.gstNumber}
              hint="For example 123456789RT0001. Required before tax can be switched on."
            />
          </div>

          <h3 className={styles.subTitle}>Shipping</h3>
          <div className={`${styles.grid} ${styles.grid2}`}>
            <TextField
              label="Flat shipping charge"
              name="shippingFlat"
              prefix="$"
              inputMode="decimal"
              mono
              defaultValue={value("shippingFlat", settings.shippingFlat)}
              error={errors.shippingFlat}
            />
            <TextField
              label="Free shipping threshold ($)"
              name="freeShippingThreshold"
              prefix="$"
              inputMode="decimal"
              mono
              defaultValue={value("freeShippingThreshold", settings.freeShippingThreshold)}
              error={errors.freeShippingThreshold}
              hint="Shown across the site (cart, shipping policy, FAQ). Changing it updates everything."
            />
            <TextField
              label="City with free local shipping"
              name="localFreeCity"
              defaultValue={value("localFreeCity", settings.localFreeCity)}
              error={errors.localFreeCity}
            />
            <CheckboxField
              label="Ship outside Canada"
              name="shipsInternationally"
              defaultChecked={checked("shipsInternationally", settings.shipsInternationally)}
              hint="Off: orders ship within Canada only."
            />
          </div>

          <h3 className={styles.subTitle}>Orders and payment</h3>
          <div className={`${styles.notice} ${styles.noticeInfo}`}>
            <p>
              The site takes no payment. After an order is placed, the customer is told they will be
              contacted to arrange payment by Interac e-Transfer.
            </p>
          </div>
          <div className={`${styles.grid} ${styles.grid2}`}>
            <TextField
              label="Send new-order notifications to"
              name="orderNotifyEmail"
              type="email"
              inputMode="email"
              defaultValue={value("orderNotifyEmail", settings.orderNotifyEmail)}
              error={errors.orderNotifyEmail}
              hint="Every new order is emailed here. Not shown to customers."
            />
            <TextField
              label="Interac e-Transfer email"
              name="etransferEmail"
              type="email"
              inputMode="email"
              defaultValue={value("etransferEmail", settings.etransferEmail)}
              error={errors.etransferEmail}
              hint="Shown to customers on the order confirmation page and in their order email."
            />
          </div>
          <TextArea
            label="e-Transfer instructions"
            name="etransferInstructions"
            rows={4}
            maxLength={1000}
            defaultValue={value("etransferInstructions", settings.etransferInstructions)}
            error={errors.etransferInstructions}
            hint="Shown to customers on the order confirmation page and in their order email, for example the security question to use. Plain text."
          />
          <div className={`${styles.grid} ${styles.grid2}`}>
            <TextField
              label="e-Transfer payee name"
              name="payeeName"
              maxLength={200}
              defaultValue={value("payeeName", settings.payeeName)}
              error={errors.payeeName}
              hint="Shown under Payment Instructions on the order confirmation page. Hidden while empty."
            />
            <TextField
              label="Security question"
              name="securityQuestion"
              maxLength={200}
              defaultValue={value("securityQuestion", settings.securityQuestion)}
              error={errors.securityQuestion}
              hint="Hidden while empty."
            />
            <TextField
              label="Security answer"
              name="securityAnswer"
              maxLength={200}
              defaultValue={value("securityAnswer", settings.securityAnswer)}
              error={errors.securityAnswer}
              hint="Hidden while empty."
            />
          </div>
          <TextArea
            label="Hold period"
            name="holdPeriodText"
            rows={2}
            maxLength={500}
            defaultValue={value("holdPeriodText", settings.holdPeriodText)}
            error={errors.holdPeriodText}
            hint="For example how long an order is held while payment arrives. Shown on the order confirmation page; hidden while empty. Plain text."
          />
        </div>
      </section>
      <SaveBar state={state} label="Save settings" idleText="Saves tax and shipping settings." />
    </form>
  );
}

export function ProductPageTextForm({ introText }: { introText: string }) {
  const [state, formAction] = useActionState(saveProductPageText, IDLE_STATE);
  const echoed = state.status === "error" ? state.values : undefined;

  return (
    <form action={formAction} noValidate>
      <section className={styles.panel} aria-labelledby="product-text-heading">
        <h2 id="product-text-heading" className={styles.panelTitle}>
          Product page text
        </h2>
        <FormNotice state={state} />
        <div className={styles.grid} key={state.savedAt ?? "initial"}>
          <TextArea
            label="Text under the product name"
            name="productIntroText"
            bold
            defaultValue={echoed?.productIntroText ?? introText}
            error={state.errors?.productIntroText}
            hint="Shown under the product name on every product page. Leave blank for the default. The line 'For Research Use Only. Not for Human or Animal Use.' is always added automatically."
          />
        </div>
      </section>
      <SaveBar
        state={state}
        label="Save product page text"
        idleText="Updates every product page."
      />
    </form>
  );
}

/**
 * Change password (the signed-in admin's own). The fields are never refilled: on any
 * result they come back empty, and passwords are never sent back from the server.
 */
export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changeAdminPassword, IDLE_STATE);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <section className={styles.panel} aria-labelledby="password-heading">
        <h2 id="password-heading" className={styles.panelTitle}>
          Change password
        </h2>
        <p className={styles.panelIntro}>
          Changing it signs you out on every other device; this one stays signed in.
        </p>
        <FormNotice state={state} />
        <div className={`${styles.grid} ${styles.grid3}`} key={state.savedAt ?? "initial"}>
          <TextField
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            error={errors.currentPassword}
          />
          <TextField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            error={errors.newPassword}
            hint="At least 12 characters."
          />
          <TextField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            error={errors.confirmPassword}
          />
        </div>
      </section>
      <SaveBar state={state} label="Change password" idleText="Changes your sign-in password." />
    </form>
  );
}

export function TaxRatesForm({ rates }: { rates: TaxRateRow[] }) {
  const [state, formAction] = useActionState(saveTaxRates, IDLE_STATE);
  const echoed = state.status === "error" ? state.values : undefined;
  const errors = state.errors ?? {};

  return (
    <form action={formAction} noValidate>
      <section className={styles.panel} aria-labelledby="rates-heading">
        <h2 id="rates-heading" className={styles.panelTitle}>
          Tax rates by province
        </h2>
        <p className={styles.panelIntro}>
          The combined rate charged for each province or territory, used only when sales tax is
          switched on above. Rates are held to two decimal places, so Quebec&apos;s 14.975% (GST 5%
          plus QST 9.975%) is 14.97%. The accountant should confirm all thirteen rates before sales
          tax is switched on.
        </p>
        <FormNotice state={state} />
        <ul className={styles.cards} key={state.savedAt ?? "initial"}>
          {rates.map((rate) => {
            const name = (field: string) => `rates.${rate.id}.${field}`;
            return (
              <li key={rate.id}>
                <fieldset className={styles.card}>
                  <legend className={styles.cardLegend}>
                    <span className={styles.mono}>{rate.province}</span>
                  </legend>
                  <div className={`${styles.grid} ${styles.grid3}`}>
                    <TextField
                      label="Label"
                      name={name("label")}
                      required
                      defaultValue={echoed?.[name("label")] ?? rate.label}
                      error={errors[name("label")]}
                    />
                    <TextField
                      label="Rate (percent)"
                      name={name("rate")}
                      required
                      inputMode="decimal"
                      mono
                      defaultValue={echoed?.[name("rate")] ?? rate.rate}
                      error={errors[name("rate")]}
                      hint="For example 13.00."
                    />
                    <CheckboxField
                      label="In use"
                      name={name("isActive")}
                      defaultChecked={echoed ? echoed[name("isActive")] === "on" : rate.isActive}
                    />
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ul>
      </section>
      <SaveBar state={state} label="Save tax rates" idleText="Saves every rate above." />
    </form>
  );
}
