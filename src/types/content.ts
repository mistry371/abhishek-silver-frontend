import type { CtaLink, ID, ImageAsset, ISODateString, Orderable, SeoMeta } from "./common";

/* ------------------------------------------------------------------ */
/* Homepage & marketing blocks (CMS-managed)                           */
/* ------------------------------------------------------------------ */

export interface Banner extends Orderable {
  id: ID;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: ImageAsset;
  mobileImage?: ImageAsset;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  /** Controls text colour over the image. */
  tone: "light" | "dark";
  align: "left" | "center";
}

export interface ContentBlock extends Orderable {
  id: ID;
  key: string;
  eyebrow?: string;
  title: string;
  description?: string;
  image?: ImageAsset;
  mobileImage?: ImageAsset;
  cta?: CtaLink;
}

export interface Testimonial extends Orderable {
  id: ID;
  name: string;
  location?: string;
  quote: string;
  rating?: number;
  image?: ImageAsset;
  /** Marks placeholder copy so it is never mistaken for a real review. */
  isSample?: boolean;
}

export interface InstagramPost {
  id: ID;
  image: ImageAsset;
  url: string;
  caption?: string;
}

export interface TrustItem extends Orderable {
  id: ID;
  icon: "shield" | "gem" | "sparkle" | "message" | "truck" | "award" | "scale" | "pen";
  title: string;
  description: string;
}

export interface FaqItem extends Orderable {
  id: ID;
  category: string;
  question: string;
  answer: string;
}

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string; level: 2 | 3 }
  | { type: "image"; image: ImageAsset; caption?: string }
  | { type: "quote"; text: string; cite?: string }
  | { type: "list"; items: string[] };

export interface BlogPost {
  id: ID;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  coverImage: ImageAsset;
  author: { name: string; role?: string };
  content: BlogBlock[];
  tags: string[];
  readingMinutes: number;
  publishedAt: ISODateString;
  updatedAt: ISODateString;
  seo?: SeoMeta;
}

export interface StoreHours {
  label: string;
  value: string;
}

export interface StoreLocation {
  id: ID;
  name: string;
  addressLines: string[];
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: StoreHours[];
  mapEmbedUrl: string;
  directionsUrl: string;
  image: ImageAsset;
  geo?: { lat: number; lng: number };
}

export interface PolicySection {
  heading: string;
  body: string[];
}

export interface PolicyPage {
  slug: "shipping" | "returns" | "privacy" | "terms";
  title: string;
  intro: string;
  sections: PolicySection[];
  updatedAt?: ISODateString;
  /** True until the business supplies legally reviewed copy. */
  isPlaceholder: boolean;
}

export interface BrandStory {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  image: ImageAsset;
  secondaryImage?: ImageAsset;
  pillars: { title: string; description: string }[];
  cta?: CtaLink;
}

export interface HomepageContent {
  hero: Banner[];
  goldEditorial: ContentBlock;
  silverEditorial: ContentBlock;
  campaign: ContentBlock;
  festival: ContentBlock | null;
  customJewellery: ContentBlock;
  brandStory: BrandStory;
  seoContent: { title: string; paragraphs: string[] };
}
