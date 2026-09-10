import type { SocialLink, SocialPlatform } from "@/config/site";
import { defaultSiteContact, type SiteContact } from "@/lib/site-contact";
import { USE_MOCK_API } from "../config";
import { apiRequest } from "../http";

interface StoreResponse {
  name: string;
  addressLines: string[];
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phones?: { display: string; href: string }[];
  phone: string;
  whatsapp: string;
  email: string;
  hours: { label: string; value: string }[];
  directionsUrl: string;
}

interface SocialResponse {
  instagramHandle?: string;
  links?: { id: SocialPlatform; label: string; href: string }[];
}

/** Map query recovered from the API's directions URL (keeps the admin-entered search text). */
function mapQueryFrom(url: string, fallback: string) {
  try {
    return new URL(url).searchParams.get("destination") || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Contact details for the whole site. Falls back to the built-in values in
 * mock mode or when the API can't be reached, so a CMS outage never breaks pages.
 */
export async function loadSiteContact(): Promise<SiteContact> {
  if (USE_MOCK_API) return defaultSiteContact;

  const [store, social] = await Promise.all([
    apiRequest<StoreResponse>("/content/store", { revalidate: 300, tags: ["content:store", "content"] }).catch(() => null),
    apiRequest<SocialResponse>("/content/social", { revalidate: 300, tags: ["content:social", "content"] }).catch(() => null),
  ]);

  const links: SocialLink[] | null = social?.links?.length ? social.links.map((link) => ({ id: link.id, label: link.label, href: link.href })) : null;

  return {
    phones: store?.phones?.length ? store.phones : store?.phone ? [{ display: store.phone, href: `tel:${store.phone.replace(/[^\d+]/g, "")}` }] : defaultSiteContact.phones,
    email: store ? store.email : defaultSiteContact.email,
    whatsappNumber: store?.whatsapp || defaultSiteContact.whatsappNumber,
    store: store
      ? {
          name: store.name,
          addressLines: store.addressLines,
          city: store.city,
          state: store.state,
          postalCode: store.postalCode,
          country: store.country,
          hours: store.hours,
          mapQuery: mapQueryFrom(store.directionsUrl, defaultSiteContact.store.mapQuery),
        }
      : defaultSiteContact.store,
    socialLinks: links ?? defaultSiteContact.socialLinks,
    instagramHandle: social?.instagramHandle || defaultSiteContact.instagramHandle,
    instagramUrl: links?.find((link) => link.id === "instagram")?.href ?? defaultSiteContact.instagramUrl,
  };
}
