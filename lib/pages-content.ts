export type ContentBlockType = "paragraph" | "bullets" | "numbers";

export type PageSection = {
  id: string;
  title: string;
  description?: string;
  contentType: ContentBlockType;
  items: string[];
};

export type FaqItem = {
  id: string;
  q: string;
  a: string;
};

export type ContactInfo = {
  whatsapp?: string;
  email?: string;
  instagram?: string;
  note?: string;
};

export type EditablePageData = {
  slug: "faqs" | "shipping-policy" | "returns" | "privacy-policy" | "terms";
  name: string;
  urlPath: string;
  title: string;
  sub: string;
  intro?: string;
  status: "Published" | "Draft";
  lastUpdated?: string;
  sections: PageSection[];
  faqs?: FaqItem[];
  contactInfo?: ContactInfo;
  closingMessage?: string;
};

export const DEFAULT_PAGE_FAQS: EditablePageData = {
  slug: "faqs",
  name: "FAQs",
  urlPath: "/faqs",
  title: "Frequently Asked Questions (FAQs)",
  sub: "Welcome to Izha Blooms! 🌸 We understand that you may have a few questions before placing your order. Here are some answers to help make your shopping experience smooth and delightful.",
  status: "Published",
  faqs: [
    {
      id: "faq-1",
      q: "Where does Izha Blooms deliver?",
      a: "We deliver across India right to your doorstep — typically 2–4 business days within Kerala and 4–7 business days across the rest of India.",
    },
    {
      id: "faq-2",
      q: "Can I order without creating an account?",
      a: "Yes! Guest checkout is available on every order. You can also sign in quickly using your mobile number and OTP if you prefer.",
    },
    {
      id: "faq-3",
      q: "How do I choose the right size?",
      a: "Every product page includes a clickable Size Guide right beside Select Size, plus detailed fabric and fit notes. You can also message us on WhatsApp at +91 99957 57612.",
    },
    {
      id: "faq-4",
      q: "What are the shipping charges?",
      a: "Orders within Kerala enjoy free delivery, and Pan-India orders unlock free shipping above the active order threshold. Enter your PIN code at checkout to check instantly.",
    },
    {
      id: "faq-5",
      q: "How can I track my order?",
      a: "Visit the Track Your Order page using your Order ID (e.g., IZB-1006) or check My Orders inside your Account dashboard.",
    },
    {
      id: "faq-6",
      q: "What is your return or exchange policy?",
      a: "We offer size exchanges within 48 hours of delivery for unused, unwashed garments with tags intact. Please refer to our Returns & Exchange policy for full details.",
    },
  ],
  sections: [],
  contactInfo: {
    whatsapp: "9995757612",
    email: "izhablooms@gmail.com",
  },
  closingMessage: "Have more questions? Reach out to our friendly support team anytime.",
};

export const DEFAULT_PAGE_SHIPPING: EditablePageData = {
  slug: "shipping-policy",
  name: "Shipping & Delivery",
  urlPath: "/shipping-policy",
  title: "Shipping & Delivery Policy",
  sub: "Every order deserves special care. Thoughtfully packed and delivered to your doorstep with love.",
  intro:
    "At Izha Blooms, we believe every order deserves special care. Each piece is thoughtfully packed and delivered to your doorstep with love.",
  status: "Published",
  sections: [
    {
      id: "sec-ship-1",
      title: "1. Order Processing",
      contentType: "bullets",
      items: [
        "Orders are processed within 2–3 business days after successful payment confirmation.",
        "As our products are carefully prepared and packed, processing time may vary during sale periods or new collection launches.",
      ],
    },
    {
      id: "sec-ship-2",
      title: "2. Shipping & Delivery",
      contentType: "bullets",
      items: [
        "We offer shipping across India.",
        "Orders within Kerala are usually delivered within 3–7 business days after dispatch.",
        "Orders to other parts of India may take approximately 4–8 business days after dispatch.",
        "Delivery timelines are estimates and may vary depending on the courier service, location, weather conditions and unforeseen circumstances.",
      ],
    },
    {
      id: "sec-ship-3",
      title: "3. Shipping Charges",
      contentType: "bullets",
      items: [
        "Shipping charges are calculated based on the delivery location and applicable courier rates.",
        "Any applicable shipping charges will be displayed or communicated before order confirmation.",
        "Special free-shipping offers will be announced through our website or social media platforms.",
      ],
    },
    {
      id: "sec-ship-4",
      title: "4. Delivery Delays",
      contentType: "paragraph",
      items: [
        "While we always aim to deliver your orders on time, occasional delays may occur due to courier-related issues, weather conditions, public holidays or other circumstances beyond our control.",
      ],
    },
    {
      id: "sec-ship-5",
      title: "5. Damaged or Missing Packages",
      contentType: "paragraph",
      items: [
        "If you receive a package that appears damaged or tampered with, please contact us within 24 hours of delivery with clear 3–4 photos or an unboxing video so we can assist you.",
      ],
    },
    {
      id: "sec-ship-6",
      title: "6. Contact Us",
      contentType: "paragraph",
      description: "For shipping-related queries or assistance, feel free to contact us.",
      items: [
        "Izha Blooms customer assistance is available Monday through Saturday.",
      ],
    },
  ],
  contactInfo: {
    whatsapp: "9995757612",
    email: "izhablooms@gmail.com",
  },
  closingMessage:
    "Thank you for choosing Izha Blooms. Every order is a little piece of love, delivered to you.",
};

export const DEFAULT_PAGE_RETURNS: EditablePageData = {
  slug: "returns",
  name: "Returns & Exchange",
  urlPath: "/returns",
  title: "Return & Exchange Policy",
  sub: "At Izha Blooms, every piece is carefully selected, checked and packed with love. We want you to be happy with your purchase. Please read our Return & Exchange Policy before placing your order.",
  status: "Published",
  sections: [
    {
      id: "sec-ret-1",
      title: "1. Return Policy",
      contentType: "bullets",
      items: [
        "We do not accept returns for reasons such as change of mind, colour preference or incorrect size selection.",
        "Returns are accepted only in cases where the product received is damaged, defective or incorrect.",
        "Any such issue must be reported within 24 hours of receiving the order, with clear photographs and an unboxing video showing the issue.",
      ],
    },
    {
      id: "sec-ret-2",
      title: "2. Exchange Policy",
      contentType: "bullets",
      items: [
        "Size exchanges are subject to availability of stock.",
        "Exchange requests must be raised within 48 hours of delivery.",
        "The product must be unused, unwashed, unworn and in its original condition, with all tags and packaging intact.",
        "Products showing signs of use, washing, alteration or damage caused after delivery will not be eligible for exchange.",
      ],
    },
    {
      id: "sec-ret-3",
      title: "3. Damaged or Incorrect Products",
      description: "If you receive a damaged, defective or incorrect product:",
      contentType: "bullets",
      items: [
        "Please contact us within 24 hours of delivery.",
        "Share clear photographs and an unboxing video showing the issue.",
        "Once the issue is verified, we will arrange an appropriate resolution, such as a replacement or refund, depending on the situation.",
      ],
    },
    {
      id: "sec-ret-4",
      title: "4. Exchange Shipping Charges",
      contentType: "bullets",
      items: [
        "For eligible size exchanges, return shipping and reshipping charges may be borne by the customer.",
        "If the exchange is due to an error from our side, Izha Blooms will bear the applicable shipping charges.",
      ],
    },
    {
      id: "sec-ret-5",
      title: "5. Refund Policy",
      contentType: "bullets",
      items: [
        "Refunds are applicable only for approved cases, such as unavailable replacement stock or verified product issues.",
        "Approved refunds will be processed to the original payment method.",
        "Please allow 5–7 business days for the refund to reflect, depending on the payment provider.",
      ],
    },
    {
      id: "sec-ret-6",
      title: "6. Non-Exchangeable Items",
      description: "The following are not eligible for exchange:",
      contentType: "bullets",
      items: [
        "Products purchased during special clearance or final sale offers, unless defective or incorrect.",
        "Products that have been worn, washed, altered or damaged after delivery.",
        "Products without original tags or packaging.",
      ],
    },
    {
      id: "sec-ret-7",
      title: "7. How to Request an Exchange",
      description: "For any return or exchange request, please contact us through:",
      contentType: "paragraph",
      items: [
        "Our team will guide you through the process step-by-step.",
      ],
    },
  ],
  contactInfo: {
    whatsapp: "9995757612",
    instagram: "@izhablooms",
  },
  closingMessage:
    "Thank you for choosing Izha Blooms. We truly appreciate your love and support!",
};

export const DEFAULT_PAGE_PRIVACY: EditablePageData = {
  slug: "privacy-policy",
  name: "Privacy Policy",
  urlPath: "/privacy-policy",
  title: "Privacy Policy",
  sub: "How Izha Blooms protects your personal & delivery details.",
  intro:
    "We respect your privacy and only collect contact and delivery information needed to fulfil orders, share tracking updates, and assist you personally.",
  status: "Published",
  sections: [
    {
      id: "sec-priv-1",
      title: "1. Information We Collect",
      contentType: "paragraph",
      items: [
        "We collect customer details such as your name, mobile number, email address, and delivery destination when you place an order or register on our site. This information is solely used to process and fulfill your order.",
      ],
    },
    {
      id: "sec-priv-2",
      title: "2. How We Use Your Data",
      contentType: "bullets",
      items: [
        "To process, dispatch, and track your purchased items.",
        "To communicate order status, dispatch updates, and delivery alerts via SMS or WhatsApp.",
        "To assist you with size inquiries, exchanges, or customer service requests.",
        "We never sell, rent, or trade your personal information to third-party marketing companies.",
      ],
    },
    {
      id: "sec-priv-3",
      title: "3. Payment & Security",
      contentType: "paragraph",
      items: [
        "Payment transactions are processed securely through certified payment gateways. Izha Blooms does not store your credit card, debit card, or net banking credentials on our servers.",
      ],
    },
    {
      id: "sec-priv-4",
      title: "4. Contact Us Regarding Privacy",
      contentType: "paragraph",
      items: [
        "If you have questions or concerns regarding our privacy practices or wish to review the information we hold, please contact our team.",
      ],
    },
  ],
  contactInfo: {
    email: "izhablooms@gmail.com",
    whatsapp: "9995757612",
  },
  closingMessage:
    "Your trust is our greatest asset. Thank you for shopping with Izha Blooms.",
};

export const DEFAULT_PAGE_TERMS: EditablePageData = {
  slug: "terms",
  name: "Terms & Conditions",
  urlPath: "/terms",
  title: "Terms & Conditions",
  sub: "Store guidelines for shopping with Izha Blooms · Izha Designs, Aluva.",
  intro:
    "All product photography, embroidered designs, and branding belong to Izha Designs (Izha Blooms), Aluva, Kerala, India.",
  status: "Published",
  sections: [
    {
      id: "sec-terms-1",
      title: "1. Intellectual Property & Brand Ownership",
      contentType: "paragraph",
      items: [
        "All product photography, handcrafted designs, embroidered artwork, textual descriptions, and brand logos belong exclusively to Izha Designs (Izha Blooms), Aluva, Kerala, India. Unauthorized reproduction, modification, distribution, or commercial use is strictly prohibited.",
      ],
    },
    {
      id: "sec-terms-2",
      title: "2. Pricing & Promotional Offers",
      contentType: "paragraph",
      items: [
        "All product prices listed on the website are in Indian Rupees (INR) and inclusive of applicable taxes. Prices and active promotional discounts are subject to change without prior notice. Promotional coupons and introductory offers cannot be combined unless specifically authorized.",
      ],
    },
    {
      id: "sec-terms-3",
      title: "3. Orders & Cancellations",
      contentType: "bullets",
      items: [
        "Orders are accepted subject to availability of fabrics and inventory.",
        "In the rare event that an item is out of stock after order placement, our team will promptly contact you for an exchange or full refund.",
        "Orders once dispatched cannot be cancelled.",
      ],
    },
    {
      id: "sec-terms-4",
      title: "4. Governing Jurisdiction",
      contentType: "paragraph",
      items: [
        "Any legal claims or disputes arising from transactions or usage of this website will fall under the exclusive jurisdiction of the competent courts in Ernakulam / Aluva, Kerala, India.",
      ],
    },
  ],
  contactInfo: {
    email: "izhablooms@gmail.com",
    whatsapp: "9995757612",
  },
  closingMessage:
    "By shopping with Izha Blooms, you acknowledge and agree to these terms of service.",
};

export const DEFAULT_PAGES_MAP: Record<string, EditablePageData> = {
  "faqs": DEFAULT_PAGE_FAQS,
  "shipping-policy": DEFAULT_PAGE_SHIPPING,
  "returns": DEFAULT_PAGE_RETURNS,
  "privacy-policy": DEFAULT_PAGE_PRIVACY,
  "terms": DEFAULT_PAGE_TERMS,
};

export const DEFAULT_PAGES_LIST: EditablePageData[] = [
  DEFAULT_PAGE_FAQS,
  DEFAULT_PAGE_SHIPPING,
  DEFAULT_PAGE_RETURNS,
  DEFAULT_PAGE_PRIVACY,
  DEFAULT_PAGE_TERMS,
];
