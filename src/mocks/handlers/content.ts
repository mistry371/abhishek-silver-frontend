import { directionsUrl, mapEmbedUrl, siteConfig } from "@/config/site";
import { media } from "@/lib/media";
import type { StoreLocation } from "@/types/content";
import {
  blogPosts,
  faqs,
  homepageContent,
  instagramPosts,
  offers,
  policies,
  testimonials,
  trustItems,
} from "../data/content";

export function getHomepage() {
  return homepageContent;
}

export function getTestimonials() {
  return testimonials
    .filter((t) => t.active && (!t.isSample || siteConfig.features.showSampleContent))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getInstagramPosts() {
  return instagramPosts;
}

export function getTrustItems() {
  return trustItems.filter((t) => t.active).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getFaqs() {
  return faqs.filter((f) => f.active).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getBlogPosts() {
  return [...blogPosts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug) ?? null;
}

export function getPolicy(slug: keyof typeof policies) {
  return policies[slug] ?? null;
}

export function getOffers() {
  return offers.filter((o) => o.active);
}

export function getStoreLocation(): StoreLocation {
  const { store, contact } = siteConfig;
  return {
    id: store.id,
    name: store.name,
    addressLines: [...store.addressLines],
    city: store.city,
    state: store.state,
    postalCode: store.postalCode,
    country: store.country,
    phone: contact.phoneDisplay,
    whatsapp: contact.whatsappNumber,
    email: contact.email,
    hours: store.hours.map((h) => ({ ...h })),
    mapEmbedUrl: mapEmbedUrl(),
    directionsUrl: directionsUrl(),
    image: media.editorial.store,
  };
}
