import type { ImageAsset } from "@/lib/admin/client";
import type { BlogBlock, BrandStory, Banner, ContentBlock, InstagramPost, PolicyPage, TrustItem } from "@/types/content";

/**
 * Admin-side shapes of the CMS documents. They mirror the backend validation
 * schemas in `modules/content/types.ts` and the storefront `types/content.ts`.
 */

export type { BlogBlock, BrandStory, Banner, ContentBlock, InstagramPost, TrustItem };

export interface CtaLink {
  label: string;
  href: string;
}

/** Row returned by `GET /content/:key` and `GET /content/policies/:slug`. */
export interface ContentRow<T> {
  key: string;
  value: T | null;
  updatedByName: string | null;
  updatedAt: string | null;
}

export interface ContentIndexRow {
  key: string;
  updatedByName: string | null;
  updatedAt: string | null;
}

export interface PolicySummary {
  slug: PolicyPage["slug"];
  title: string;
  isPlaceholder: boolean;
  updatedByName: string | null;
  updatedAt: string | null;
}

export interface HomepageDoc {
  hero: Banner[];
  goldEditorial: ContentBlock;
  silverEditorial: ContentBlock;
  campaign: ContentBlock;
  festival: ContentBlock | null;
  customJewellery: ContentBlock;
  brandStory: BrandStory;
  seoContent: { title: string; paragraphs: string[] };
}

export interface AboutTextItem {
  title: string;
  text: string;
}

export interface Certification {
  name: string;
  description: string;
  image?: ImageAsset;
}

export interface AboutDoc {
  hero: { eyebrow: string; title: string; description: string; image?: ImageAsset; wideImage?: ImageAsset };
  story: { title: string; paragraphs: string[]; image?: ImageAsset };
  vision: string;
  mission: string;
  expertise: { eyebrow: string; title: string; text: string; image?: ImageAsset }[];
  craftsmanship: { title: string; text: string; images: ImageAsset[]; pillars: AboutTextItem[] };
  quality: string[];
  customerCommitment: AboutTextItem[];
  certifications: Certification[];
  [extra: string]: unknown;
}

export interface ContactDoc {
  storeId: string;
  storeName: string;
  addressLines: string[];
  city: string;
  state: string;
  postalCode: string;
  country: string;
  mapQuery: string;
  phones: { display: string; href: string }[];
  whatsappNumber: string;
  email: string;
  hours: { label: string; value: string }[];
  image?: ImageAsset;
}

export const SOCIAL_PLATFORMS = ["instagram", "facebook", "youtube", "pinterest"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialDoc {
  instagramHandle: string;
  links: { id: SocialPlatform; label: string; href: string }[];
}

export interface TrustDoc {
  items: TrustItem[];
}

export interface InstagramDoc {
  posts: InstagramPost[];
}

export type PolicySlug = PolicyPage["slug"];
export const POLICY_SLUGS: readonly PolicySlug[] = ["shipping", "returns", "privacy", "terms"];

export interface PolicyDoc {
  slug: PolicySlug;
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
  updatedAt?: string;
  isPlaceholder: boolean;
}

export interface AdminTestimonial {
  id: string;
  name: string;
  location: string | null;
  quote: string;
  rating: number | null;
  image: ImageAsset | null;
  productName: string | null;
  isSample: boolean;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFaq {
  id: string;
  slug: string;
  category: string;
  question: string;
  answer: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BlogStatus = "draft" | "published";

export interface BlogListItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: BlogStatus;
  publishedAt: string | null;
  updatedAt: string;
}

export interface AdminBlogPost extends BlogListItem {
  excerpt: string;
  coverImage: ImageAsset | null;
  author: { name: string; role?: string };
  content: BlogBlock[];
  tags: string[];
  readingMinutes: number;
  seo: { title?: string; description?: string; keywords?: string[] };
  createdAt: string;
}
