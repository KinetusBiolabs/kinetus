import { ContentPage } from "@/components/content/ContentPage";
import { contentMetadata } from "@/components/content/contentMetadata";
import { shippingPolicyDocument } from "@/content/shipping-policy";
import { getFreeShippingThresholdCents, withFreeShippingThreshold } from "@/lib/shipping";

export const metadata = contentMetadata(
  shippingPolicyDocument.title,
  shippingPolicyDocument.description,
  "/shipping-policy",
);

/** The free-shipping line quotes the Admin > Settings amount (expired with the `shipping` tag). */
export default async function ShippingPolicyPage() {
  const threshold = await getFreeShippingThresholdCents();
  return <ContentPage doc={withFreeShippingThreshold(shippingPolicyDocument, threshold)} />;
}
