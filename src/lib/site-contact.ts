import { siteConfig, type SocialLink } from "@/config/site";

/**
 * STORE CONTACT DETAILS (runtime)
 * ------------------------------------------------------------------
 * Phones, WhatsApp, email, address, hours and social links are edited in
 * Admin → Content (Contact / Social). The site layout loads them from the API
 * and installs them here; `siteConfig` remains the fallback (mock mode or if
 * the API is unreachable), so pages always render.
 */

export interface SiteContact {
  phones: { display: string; href: string }[];
  email: string;
  whatsappNumber: string;
  store: {
    name: string;
    addressLines: string[];
    city: string;
    state: string;
    postalCode: string;
    country: string;
    hours: { label: string; value: string }[];
    mapQuery: string;
  };
  socialLinks: SocialLink[];
  instagramHandle: string;
  instagramUrl: string;
}

export const defaultSiteContact: SiteContact = {
  phones: siteConfig.contact.phones.map((phone) => ({ ...phone })),
  email: siteConfig.contact.email,
  whatsappNumber: siteConfig.contact.whatsappNumber,
  store: {
    name: siteConfig.store.name,
    addressLines: [...siteConfig.store.addressLines],
    city: siteConfig.store.city,
    state: siteConfig.store.state,
    postalCode: siteConfig.store.postalCode,
    country: siteConfig.store.country,
    hours: siteConfig.store.hours.map((hour) => ({ ...hour })),
    mapQuery: siteConfig.store.mapQuery,
  },
  socialLinks: siteConfig.socialLinks.map((link) => ({ ...link })),
  instagramHandle: siteConfig.instagramHandle,
  instagramUrl: siteConfig.social.instagram,
};

let current: SiteContact = defaultSiteContact;

/** Installed once per render by the site layout (server) and SiteContactProvider (client). */
export function installSiteContact(contact: SiteContact) {
  current = contact;
}

export function getSiteContact(): SiteContact {
  return current;
}

export function primaryPhone(contact = current) {
  return contact.phones[0] ?? { display: "", href: "" };
}

export function contactAddress(contact = current) {
  const { addressLines, city, state, postalCode } = contact.store;
  return `${addressLines.join(", ")}, ${city}, ${state} ${postalCode}`.trim();
}

export function contactDirectionsUrl(contact = current) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(contact.store.mapQuery)}`;
}

export function contactMapEmbedUrl(contact = current) {
  return `https://www.google.com/maps?q=${encodeURIComponent(contact.store.mapQuery)}&output=embed`;
}
