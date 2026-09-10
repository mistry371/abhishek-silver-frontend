import { filtersToApiQuery } from "@/lib/catalog/filters";
import type {
  Category,
  Collection,
  Product,
  ProductFilters,
  ProductListResponse,
  ProductPriceRequest,
  ProductPriceResponse,
  ProductSummary,
  SearchSuggestions,
} from "@/types/catalog";
import type { ComparisonItem } from "@/types/commerce";
import { MOCK_LATENCY, runMock, USE_MOCK_API } from "../config";
import { isApiError } from "../errors";
import { apiRequest } from "../http";

const mock = () => import("@/mocks/handlers/catalog");

async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (isApiError(error, "not_found")) return null;
    throw error;
  }
}

export async function getProducts(filters: ProductFilters = {}, signal?: AbortSignal): Promise<ProductListResponse> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.listProducts(filters));
  }
  return apiRequest("/products", { query: filtersToApiQuery(filters), signal, revalidate: 60, tags: ["products"] });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.getProduct(slug));
  }
  return orNull(apiRequest<Product>(`/products/${encodeURIComponent(slug)}`, { revalidate: 60, tags: [`product:${slug}`] }));
}

export async function getAllProductSlugs(): Promise<{ slug: string; updatedAt: string }[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return m.getAllSlugs();
  }
  return apiRequest("/products/slugs", { revalidate: 3600 });
}

export async function getCategories(): Promise<Category[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.getCategoriesWithCounts(), 0);
  }
  return apiRequest("/categories", { revalidate: 300, tags: ["categories"] });
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.getCategory(slug), 0);
  }
  return orNull(apiRequest<Category>(`/categories/${encodeURIComponent(slug)}`, { revalidate: 300 }));
}

export async function getCollections(): Promise<Collection[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.getCollections(), 0);
  }
  return apiRequest("/collections", { revalidate: 300, tags: ["collections"] });
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.getCollection(slug), 0);
  }
  return orNull(apiRequest<Collection>(`/collections/${encodeURIComponent(slug)}`, { revalidate: 300 }));
}

type MerchandisingKind = "featured" | "bestSeller" | "trending" | "newArrival";

async function getMerchandised(kind: MerchandisingKind, limit: number): Promise<ProductSummary[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.listMerchandised(kind, limit), 0);
  }
  return apiRequest("/products/merchandising", { query: { kind, limit }, revalidate: 120, tags: ["products"] });
}

export const getFeaturedProducts = (limit = 10) => getMerchandised("featured", limit);
export const getNewArrivals = (limit = 10) => getMerchandised("newArrival", limit);
export const getBestSellers = (limit = 10) => getMerchandised("bestSeller", limit);
export const getTrendingProducts = (limit = 10) => getMerchandised("trending", limit);

export async function getProductsByMetal(metal: "gold" | "silver", limit = 10): Promise<ProductSummary[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.listByMetal(metal, limit), 0);
  }
  return apiRequest("/products/merchandising", { query: { metal, limit }, revalidate: 120, tags: ["products"] });
}

export async function getProductsByCollection(slug: string, limit = 10): Promise<ProductSummary[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.listByCollection(slug, limit), 0);
  }
  return apiRequest("/products/merchandising", { query: { collection: slug, limit }, revalidate: 120, tags: ["products"] });
}

export async function getRelatedProducts(productId: string, limit = 8): Promise<ProductSummary[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.getRelated(productId, limit), 0);
  }
  return apiRequest(`/products/${encodeURIComponent(productId)}/related`, { query: { limit }, revalidate: 300 });
}

/** Authoritative, size-aware price and availability for a product. */
export async function getProductPrice(productId: string, request: ProductPriceRequest = {}): Promise<ProductPriceResponse> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.getPrice(productId, request.size), MOCK_LATENCY.fast);
  }
  return apiRequest(`/products/${encodeURIComponent(productId)}/price`, { query: { size: request.size, quantity: request.quantity } });
}

export async function searchProducts(query: string, signal?: AbortSignal): Promise<SearchSuggestions> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.search(query), MOCK_LATENCY.fast);
  }
  return apiRequest("/search/suggestions", { query: { q: query }, signal });
}

export async function compareProducts(productIds: string[]): Promise<ComparisonItem[]> {
  if (USE_MOCK_API) {
    const m = await mock();
    return runMock(() => m.compare(productIds));
  }
  return apiRequest("/products/compare", { query: { ids: productIds } });
}
