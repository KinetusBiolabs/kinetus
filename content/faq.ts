import type { FaqDocument } from "./types";

/**
 * Generated from the client document "FAQ Page.docx" (extracted 2026-09-03).
 * Text is verbatim. Do not paraphrase or edit; regenerate from the document instead.
 */
export const faqDocument: FaqDocument = {
  slug: "faq",
  title: "FREQUENTLY ASKED QUESTIONS",
  intro:
    "Find answers to common questions about Kinetus BioLabs products, ordering, shipping, quality documentation, and research-use policies.",
  description:
    "Find answers to common questions about Kinetus BioLabs products, ordering, shipping, quality documentation, and research-use policies.",
  groups: [
    {
      id: "orders-shipping",
      heading: "Orders & Shipping",
      entries: [
        {
          id: "how-long-does-shipping-take",
          question: "How long does shipping take?",
          answer: [
            {
              type: "paragraph",
              text: "Orders are generally processed within 1–2 business days. Delivery times vary depending on the destination and shipping method selected at checkout. Once your order has shipped, you will receive tracking information by email.",
            },
          ],
        },
        {
          id: "what-are-your-shipping-rates",
          question: "What are your shipping rates?",
          answer: [
            {
              type: "paragraph",
              text: "Shipping rates are calculated at checkout based on your delivery location, order size, and available shipping options.  All Orders over {{FREE_SHIPPING_THRESHOLD}} are shipped for free.",
            },
          ],
        },
        {
          id: "do-you-ship-across-canada",
          question: "Do you ship across Canada?",
          answer: [
            {
              type: "paragraph",
              text: "Yes. Kinetus BioLabs ships to Canadian addresses where the products being ordered may be lawfully supplied. Certain products may be subject to restrictions, and we reserve the right to decline an order where required for regulatory or compliance reasons.",
            },
          ],
        },
        {
          id: "do-you-ship-internationally",
          question: "Do you ship internationally?",
          answer: [
            {
              type: "paragraph",
              text: "Unfortunately, Kinetus BioLabs only ships within Canada only.",
            },
          ],
        },
        {
          id: "how-do-i-track-my-order",
          question: "How do I track my order?",
          answer: [
            {
              type: "paragraph",
              text: "All shipments are shipped through Canada Post - Priority mail with tracking number to be supplied.",
            },
          ],
        },
        {
          id: "what-is-your-return-policy",
          question: "What is your return policy?",
          answer: [
            {
              type: "paragraph",
              text: "Because our products are laboratory research materials, maintaining product integrity and ensuring proper storage and handling are essential. To protect the quality and integrity of our products, all sales are final and we do not accept returns or exchanges.",
            },
            {
              type: "paragraph",
              text: "If your order arrives damaged, incorrect, or appears to have been compromised during shipping, please contact Kinetus BioLabs promptly so we can review the issue and determine the appropriate resolution.",
            },
          ],
        },
      ],
    },
    {
      id: "products-quality",
      heading: "Products & Quality",
      entries: [
        {
          id: "what-quality-standards-do-your-products-meet",
          question: "What quality standards do your products meet?",
          answer: [
            {
              type: "paragraph",
              text: "Kinetus BioLabs is committed to providing clearly identified research materials supported by appropriate quality documentation. Where available, product-specific documentation may include analytical testing such as HPLC, mass spectrometry, identity testing, or other applicable laboratory analyses.",
            },
          ],
        },
        {
          id: "do-you-provide-certificates-of-analysis-coas",
          question: "Do you provide Certificates of Analysis (COAs)?",
          answer: [
            {
              type: "paragraph",
              text: "Yes. Where a batch-specific COA is available, it can be provided or made available with the corresponding product. COAs identify the applicable batch and provide the analytical information supplied by the testing laboratory.",
            },
          ],
        },
        {
          id: "what-does-hplc-purity-mean",
          question: "What does HPLC purity mean?",
          answer: [
            {
              type: "paragraph",
              text: "HPLC, or High-Performance Liquid Chromatography, is an analytical technique commonly used to assess the chemical purity profile of a material. A reported purity percentage should be considered in the context of the specific analytical method, sample, and batch.",
            },
          ],
        },
        {
          id: "how-should-research-peptides-be-stored",
          question: "How should research peptides be stored?",
          answer: [
            {
              type: "paragraph",
              text: "Proper storage is important for maintaining the integrity and stability of research materials. Lyophilized (freeze-dried) peptides should generally be stored at -20°C for long-term storage, unless the product documentation specifies different conditions.",
            },
            {
              type: "paragraph",
              text: "Once a research material has been reconstituted, it should generally be stored at 2–8°C and handled according to the storage and stability information provided with the specific product.",
            },
          ],
        },
        {
          id: "what-is-the-shelf-life-of-your-products",
          question: "What is the shelf life of your products?",
          answer: [
            {
              type: "paragraph",
              text: "Lyophilized (freeze-dried) peptides, when stored properly at -20°C, typically have a shelf life of 24+ months. Once reconstituted and stored at 2–8°C, use within 30 days.",
            },
          ],
        },
      ],
    },
    {
      id: "research-use-compliance",
      heading: "Research Use & Compliance",
      entries: [
        {
          id: "are-kinetus-products-intended-for-human-use",
          question: "Are Kinetus products intended for human use?",
          answer: [
            {
              type: "paragraph",
              text: "No. Products identified as research materials are supplied strictly for legitimate laboratory, analytical, educational, or in-vitro research applications and are not intended for human or animal use.",
            },
            {
              type: "paragraph",
              text: "Kinetus BioLabs does not provide instructions, dosing protocols, administration instructions, or medical advice for using research products in humans or animals.",
            },
          ],
        },
        {
          id: "can-i-use-your-products-to-treat-a-medical-condition",
          question: "Can I use your products to treat a medical condition?",
          answer: [
            {
              type: "paragraph",
              text: "No. Kinetus BioLabs products are not marketed as treatments, cures, or preventative therapies for medical conditions. Nothing on this website should be interpreted as medical advice or as a recommendation to use a research product as a medicine.",
            },
          ],
        },
        {
          id: "do-you-provide-dosing-or-administration-instructions",
          question: "Do you provide dosing or administration instructions?",
          answer: [
            {
              type: "paragraph",
              text: "No. Kinetus BioLabs does not provide human or animal dosing, administration, injection, or treatment protocols for research products.",
            },
          ],
        },
        {
          id: "why-are-products-labelled-for-research-use",
          question: "Why are products labelled for research use?",
          answer: [
            {
              type: "paragraph",
              text: "Research-use labelling identifies the intended application of the material. Products supplied by Kinetus BioLabs as research materials are intended for legitimate research and laboratory applications and are not represented as approved medicines.",
            },
          ],
        },
        {
          id: "are-kinetus-products-approved-by-health-canada",
          question: "Are Kinetus products approved by Health Canada?",
          answer: [
            {
              type: "paragraph",
              text: "Unless specifically stated otherwise, Kinetus BioLabs research products are not represented as Health Canada-approved drugs, treatments, or therapeutic products.",
            },
            {
              type: "paragraph",
              text: "Customers should not interpret product listings, research information, analytical documentation, or website content as evidence of Health Canada authorization.",
            },
          ],
        },
        {
          id: "can-i-purchase-products-for-a-research-laboratory",
          question: "Can I purchase products for a research laboratory?",
          answer: [
            {
              type: "paragraph",
              text: "Yes, provided the intended use is lawful and consistent with the stated research purpose of the product. Kinetus BioLabs may request additional information or decline an order where necessary to meet applicable legal, regulatory, or compliance requirements.",
            },
          ],
        },
      ],
    },
    {
      id: "research-materials-handling",
      heading: "Research Materials & Handling",
      entries: [
        {
          id: "what-is-lyophilized-material",
          question: "What is lyophilized material?",
          answer: [
            {
              type: "paragraph",
              text: "Lyophilization, commonly known as freeze-drying, is a process used to remove water from certain laboratory materials while helping maintain their stability during storage. The resulting material is commonly supplied as a dry powder or cake.",
            },
          ],
        },
        {
          id: "what-equipment-is-required-for-research-use",
          question: "What equipment is required for research use?",
          answer: [
            {
              type: "paragraph",
              text: "Equipment requirements depend entirely on the research protocol and laboratory application. Kinetus BioLabs does not prescribe equipment or procedures for human or animal administration.",
            },
          ],
        },
        {
          id: "do-you-sell-bacteriostatic-water",
          question: "Do you sell bacteriostatic water?",
          answer: [
            {
              type: "paragraph",
              text: "Where offered, bacteriostatic water is sold as a separate laboratory product. Product-specific instructions and intended-use information should be reviewed before purchase.",
            },
          ],
        },
        {
          id: "can-products-be-combined-or-mixed-together",
          question: "Can products be combined or mixed together?",
          answer: [
            {
              type: "paragraph",
              text: "Kinetus BioLabs does not provide protocols or recommendations for combining products. Researchers should determine compatibility, preparation, and handling requirements according to their validated laboratory procedures.",
            },
          ],
        },
      ],
    },
    {
      id: "about-kinetus-biolabs",
      heading: "About Kinetus BioLabs",
      entries: [
        {
          id: "what-is-kinetus-biolabs",
          question: "What is Kinetus BioLabs?",
          answer: [
            {
              type: "paragraph",
              text: "Kinetus BioLabs is a research-focused supplier of laboratory materials and research products. Our emphasis is on product identification, transparent documentation, quality information, and responsible research use.",
            },
          ],
        },
        {
          id: "how-does-kinetus-approach-product-quality",
          question: "How does Kinetus approach product quality?",
          answer: [
            {
              type: "paragraph",
              text: "We focus on traceability, accurate product identification, appropriate analytical documentation, careful packaging, and responsible handling. Where testing documentation is available, we aim to make relevant batch information accessible to customers.",
            },
          ],
        },
        {
          id: "where-can-i-find-product-documentation",
          question: "Where can I find product documentation?",
          answer: [
            {
              type: "paragraph",
              text: "Available documentation can be found on the applicable product page or obtained by contacting Kinetus BioLabs. Documentation may vary by product and batch.",
            },
          ],
        },
      ],
    },
  ],
  closingHeading: "Still Have Questions?",
  closing: [
    {
      type: "paragraph",
      text: "We're happy to help.",
    },
    {
      type: "paragraph",
      text: "For questions about products, documentation, orders, wholesale purchasing, or research applications, please contact the Kinetus BioLabs team through our Contact page.",
      links: [
        {
          phrase: "Contact page",
          href: "/contact",
        },
      ],
    },
    {
      type: "lines",
      lines: ["Kinetus BioLabs", "Research Materials. Quality. Documentation. Transparency."],
    },
    {
      type: "paragraph",
      text: "Important: Products identified as research materials are not intended for human or animal use. Nothing on this website constitutes medical advice, diagnosis, treatment, or a recommendation to use any research product as a medicine.",
    },
  ],
  source: "FAQ Page.docx",
  omitted: ["Are Kinetus products pharmaceutical grade?"],
};
