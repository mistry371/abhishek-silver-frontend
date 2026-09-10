/**
 * SITE CONFIGURATION
 * ------------------------------------------------------------------
 * Every business fact shown on the storefront lives here (or comes from
 * the backend CMS once connected). Values marked TO CONFIRM or PLACEHOLDER
 * should be verified / supplied by the business before launch.
 * Do not add certifications, awards, years of experience or customer
 * counts unless the business provides them.
 */

export type SocialPlatform = "instagram" | "facebook" | "youtube" | "pinterest";

export interface SocialLink {
  id: SocialPlatform;
  label: string;
  href: string;
}

const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
  guestCheckout: process.env.NEXT_PUBLIC_ENABLE_GUEST_CHECKOUT !== "false",
  showSampleContent: process.env.NEXT_PUBLIC_SHOW_SAMPLE_CONTENT !== "false",
  gaId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
  googleVerification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
};

const social = {
  instagram: "https://www.instagram.com/abhisheksilver/",
  facebook: "https://www.facebook.com/asbhisheksilver",
};

/** Only platforms the business actually uses are listed. */
const socialLinks: SocialLink[] = [
  { id: "instagram", label: "Instagram", href: social.instagram },
  { id: "facebook", label: "Facebook", href: social.facebook },
];

export const siteConfig = {
  name: "Abhishek Silver",
  legalName: "Abhishek Silver",
  tagline: "Fine Gold & Silver Jewellery",
  description:
    "Abhishek Silver, Surat — gold and silver jewellery including rings, earrings, necklaces, bangles, mangalsutra and personalised designs, with transparent pricing and secure checkout.",
  url: env.siteUrl.replace(/\/$/, ""),
  locale: "en_IN",
  language: "en-IN",
  currency: "INR" as const,

  logo: {
    url: "/brand/abhishek-silver-logo.jpg",
    alt: "Abhishek Silver logo",
    width: 157,
    height: 157,
  },

  contact: {
    /** From the business's Instagram profile — TO CONFIRM. */
    phones: [
      { display: "+91 99985 55281", href: "tel:+919998555281" },
      { display: "+91 98243 65444", href: "tel:+919824365444" },
    ],
    phoneDisplay: "+91 99985 55281",
    phoneHref: "tel:+919998555281",
    /** Not yet provided — email links are hidden while empty. */
    email: "" as string,
    /** Digits only. NEXT_PUBLIC_WHATSAPP_NUMBER overrides the default (TO CONFIRM which number uses WhatsApp). */
    whatsappNumber: env.whatsapp || "919998555281",
  },

  store: {
    id: "abhishek-silver-surat",
    name: "Abhishek Silver, Surat",
    addressLines: ["103/104 Silver Arcade", "Near Sadriwala Market, Bhagal Main Road"],
    city: "Surat",
    state: "Gujarat",
    postalCode: "395003",
    country: "India",
    /** From public listings (11:00–21:00) — TO CONFIRM days open. */
    hours: [{ label: "Store hours", value: "11:00 AM – 9:00 PM" }],
    mapQuery: "Abhishek Silver, 103/104 Silver Arcade, Bhagal Main Road, Surat, Gujarat 395003",
  },

  social,
  socialLinks,
  instagramHandle: "@abhisheksilver",

  /** Rotating announcement bar messages. Keep claims factual. */
  announcements: [
    { id: "a1", text: "Explore the new collection", href: "/shop?new=true" },
    { id: "a2", text: "Personalised jewellery, made for your occasion", href: "/custom-jewellery" },
    { id: "a3", text: "Visit us at Silver Arcade, Bhagal, Surat", href: "/contact#store" },
  ],

  features: {
    guestCheckout: env.guestCheckout,
    showSampleContent: env.showSampleContent,
  },

  analytics: {
    gaMeasurementId: env.gaId,
    googleSiteVerification: env.googleVerification,
  },
} as const;

export type SiteConfig = typeof siteConfig;

export function absoluteUrl(path = "/") {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function mapEmbedUrl(query: string = siteConfig.store.mapQuery) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function directionsUrl(query: string = siteConfig.store.mapQuery) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function fullAddress() {
  const { addressLines, city, state, postalCode } = siteConfig.store;
  return `${addressLines.join(", ")}, ${city}, ${state} ${postalCode}`;
}
