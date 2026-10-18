"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  checkbox,
  errorState,
  optionalText,
  parseDollars,
  parsePercentToBps,
  successState,
  text,
  type FormState,
} from "@/lib/admin/forms";
import { expireProductPages, expireShippingAmount, refreshAdmin } from "@/lib/admin/revalidate";
import { prisma } from "@/lib/db";

const SETTINGS_ID = "store";
/** GST/HST registration: nine-digit business number, "RT", four-digit account number. */
const GST_PATTERN = /^\d{9}RT\d{4}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function saveStoreSettings(_previous: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const errors: Record<string, string> = {};

  const taxEnabled = checkbox(form, "taxEnabled");
  const gstInput = text(form, "gstNumber");
  const gstNumber = gstInput === "" ? null : gstInput.replace(/[\s-]/g, "").toUpperCase();
  if (gstNumber !== null && !GST_PATTERN.test(gstNumber)) {
    errors.gstNumber =
      "Enter the number as 9 digits, RT and 4 digits, for example 123456789RT0001.";
  }
  if (taxEnabled && gstNumber === null) {
    errors.taxEnabled = "Enter the GST/HST registration number before switching sales tax on.";
  }

  const flat = parseDollars(text(form, "shippingFlat"));
  if (flat === null || flat > 100_000) {
    errors.shippingFlat = "Enter the flat shipping charge in dollars, for example 20.00.";
  }
  const threshold = parseDollars(text(form, "freeShippingThreshold"));
  if (threshold === null || threshold <= 0 || threshold > 10_000_000) {
    errors.freeShippingThreshold =
      "Enter the free shipping threshold in dollars, more than 0 and with up to 2 decimals, for example 249.00.";
  }
  const localFreeCity = optionalText(form, "localFreeCity");
  if (localFreeCity !== null && localFreeCity.length > 80) {
    errors.localFreeCity = "Keep the city to 80 characters or fewer.";
  }

  const orderNotifyEmail = optionalText(form, "orderNotifyEmail");
  if (
    orderNotifyEmail !== null &&
    (orderNotifyEmail.length > 254 || !EMAIL_PATTERN.test(orderNotifyEmail))
  ) {
    errors.orderNotifyEmail = "Enter an email address like orders@example.com, or leave it empty.";
  }
  const etransferEmail = optionalText(form, "etransferEmail");
  if (
    etransferEmail !== null &&
    (etransferEmail.length > 254 || !EMAIL_PATTERN.test(etransferEmail))
  ) {
    errors.etransferEmail = "Enter an email address like payments@example.com, or leave it empty.";
  }
  const etransferInstructions = optionalText(form, "etransferInstructions");
  if (etransferInstructions !== null && etransferInstructions.length > 1000) {
    errors.etransferInstructions = "Keep the instructions to 1000 characters or fewer.";
  }
  const payeeName = optionalText(form, "payeeName");
  const securityQuestion = optionalText(form, "securityQuestion");
  const securityAnswer = optionalText(form, "securityAnswer");
  const holdPeriodText = optionalText(form, "holdPeriodText");
  for (const [field, value] of Object.entries({ payeeName, securityQuestion, securityAnswer })) {
    if (value !== null && value.length > 200) {
      errors[field] = "Keep this to 200 characters or fewer.";
    }
  }
  if (holdPeriodText !== null && holdPeriodText.length > 500) {
    errors.holdPeriodText = "Keep this to 500 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return errorState(errors, form);
  }

  const data = {
    taxEnabled,
    gstNumber,
    shippingFlatCents: flat!,
    freeShippingThresholdCents: threshold!,
    localFreeCity,
    shipsInternationally: checkbox(form, "shipsInternationally"),
    orderNotifyEmail,
    etransferEmail,
    etransferInstructions,
    payeeName,
    securityQuestion,
    securityAnswer,
    holdPeriodText,
  };
  await prisma.storeSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
  // The free-shipping amount is quoted on every public page; this also refreshes the admin.
  expireShippingAmount();
  return successState(
    taxEnabled
      ? "Settings saved. Sales tax is switched on and is charged on new orders."
      : "Settings saved. Sales tax is off.",
  );
}

const PRODUCT_INTRO_LIMIT = 2000;

/** "Product page text": the intro under the name on every product page. */
export async function saveProductPageText(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  await requireAdmin();
  const productIntroText = optionalText(form, "productIntroText");
  if (productIntroText !== null && productIntroText.length > PRODUCT_INTRO_LIMIT) {
    return errorState(
      { productIntroText: `Keep the text to ${PRODUCT_INTRO_LIMIT} characters or fewer.` },
      form,
    );
  }
  await prisma.storeSetting.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, productIntroText },
    update: { productIntroText },
  });
  // Every product page shows it.
  expireProductPages();
  return successState(
    productIntroText === null
      ? "Saved. Product pages show the default text on their next visit."
      : "Saved. Product pages show the new text on their next visit.",
  );
}

export async function saveTaxRates(_previous: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const rates = await prisma.taxRate.findMany();
  const errors: Record<string, string> = {};
  const updates: { id: string; label: string; rateBps: number; isActive: boolean }[] = [];

  for (const rate of rates) {
    const field = (name: string) => `rates.${rate.id}.${name}`;
    const label = text(form, field("label"));
    if (!label) {
      errors[field("label")] = `${rate.province}: enter a label.`;
    } else if (label.length > 80) {
      errors[field("label")] = `${rate.province}: keep the label to 80 characters or fewer.`;
    }
    const bps = parsePercentToBps(text(form, field("rate")));
    if (bps === null || bps > 3000) {
      errors[field("rate")] =
        `${rate.province}: enter the rate as a percentage from 0 to 30, for example 13 or 14.97.`;
    }
    updates.push({
      id: rate.id,
      label,
      rateBps: bps ?? 0,
      isActive: checkbox(form, field("isActive")),
    });
  }

  if (Object.keys(errors).length > 0) {
    return errorState(errors, form);
  }
  await prisma.$transaction(
    updates.map((update) =>
      prisma.taxRate.update({
        where: { id: update.id },
        data: { label: update.label, rateBps: update.rateBps, isActive: update.isActive },
      }),
    ),
  );
  refreshAdmin();
  return successState("Tax rates saved.");
}
