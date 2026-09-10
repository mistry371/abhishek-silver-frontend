import type { Offer } from "@/types/commerce";
import type {
  BlogPost,
  FaqItem,
  HomepageContent,
  InstagramPost,
  PolicyPage,
  StoreLocation,
  Testimonial,
  TrustItem,
} from "@/types/content";
import { runMock, USE_MOCK_API } from "../config";
import { isApiError } from "../errors";
import { apiRequest } from "../http";

const mock = () => import("@/mocks/handlers/content");

/** CMS content is cached and revalidated; admins can purge by tag. */
const CMS_REVALIDATE = 300;

export async function getHomepageContent(): Promise<HomepageContent> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getHomepage(), 0);
  return apiRequest("/content/homepage", { revalidate: CMS_REVALIDATE, tags: ["content:homepage"] });
}

export async function getTestimonials(): Promise<Testimonial[]> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getTestimonials(), 0);
  return apiRequest("/content/testimonials", { revalidate: CMS_REVALIDATE, tags: ["content:testimonials"] });
}

export async function getInstagramPosts(): Promise<InstagramPost[]> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getInstagramPosts(), 0);
  return apiRequest("/content/instagram", { revalidate: CMS_REVALIDATE, tags: ["content:instagram", "content"] });
}

export async function getTrustItems(): Promise<TrustItem[]> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getTrustItems(), 0);
  return apiRequest("/content/trust", { revalidate: CMS_REVALIDATE, tags: ["content:trust", "content"] });
}

export async function getFaqs(): Promise<FaqItem[]> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getFaqs(), 0);
  return apiRequest("/content/faqs", { revalidate: CMS_REVALIDATE, tags: ["content:faqs"] });
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getBlogPosts(), 0);
  return apiRequest("/blog", { revalidate: CMS_REVALIDATE, tags: ["blog"] });
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getBlogPost(slug), 0);
  try {
    return await apiRequest<BlogPost>(`/blog/${encodeURIComponent(slug)}`, { revalidate: CMS_REVALIDATE, tags: [`blog:${slug}`] });
  } catch (error) {
    if (isApiError(error, "not_found")) return null;
    throw error;
  }
}

export async function getPolicy(slug: PolicyPage["slug"]): Promise<PolicyPage | null> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getPolicy(slug), 0);
  return apiRequest(`/content/policies/${slug}`, { revalidate: CMS_REVALIDATE, tags: [`content:policy:${slug}`, "content"] });
}

export async function getOffers(): Promise<Offer[]> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getOffers(), 0);
  return apiRequest("/offers", { revalidate: 60, tags: ["offers"] });
}

export async function getStoreLocation(): Promise<StoreLocation> {
  if (USE_MOCK_API) return runMock(async () => (await mock()).getStoreLocation(), 0);
  return apiRequest("/content/store", { revalidate: CMS_REVALIDATE, tags: ["content:store", "content"] });
}
