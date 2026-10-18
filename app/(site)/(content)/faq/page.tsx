import { FaqPage } from "@/components/content/FaqPage";
import { contentMetadata } from "@/components/content/contentMetadata";
import { faqDocument } from "@/content/faq";
import { getFreeShippingThresholdCents, withFreeShippingThreshold } from "@/lib/shipping";

export const metadata = contentMetadata("FAQ", faqDocument.description, "/faq");

/** The shipping answer quotes the Admin > Settings amount (expired with the `shipping` tag). */
export default async function FaqRoute() {
  const threshold = await getFreeShippingThresholdCents();
  return <FaqPage doc={withFreeShippingThreshold(faqDocument, threshold)} />;
}
