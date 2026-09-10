import type { Gender, MetalType, ProductFilters, PurityCode, SortOption } from "@/types/catalog";

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const metalLabels: Record<MetalType, string> = {
  gold: "Gold",
  silver: "Silver",
};

export const purityLabels: Record<PurityCode, string> = {
  "24k": "24KT",
  "22k": "22KT",
  "18k": "18KT",
  "14k": "14KT",
  "999": "999 Fine Silver",
  "925": "925 Sterling Silver",
};

export const purityFineness: Record<PurityCode, number> = {
  "24k": 999,
  "22k": 916,
  "18k": 750,
  "14k": 585,
  "999": 999,
  "925": 925,
};

export const genderLabels: Record<Gender, string> = {
  women: "Women",
  men: "Men",
  kids: "Kids",
  unisex: "Unisex",
};

export function metalPurityLabel(metal: MetalType, purity: PurityCode) {
  return metal === "gold" ? `${purityLabels[purity]} Gold` : purityLabels[purity];
}

export const sortOptions: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "best_selling", label: "Best Selling" },
  { value: "trending", label: "Trending" },
  { value: "most_viewed", label: "Most Viewed" },
];

export interface RangeOption {
  id: string;
  label: string;
  min?: number;
  max?: number;
}

export const priceRanges: RangeOption[] = [
  { id: "under-25k", label: "Under ₹25,000", max: 25000 },
  { id: "25k-50k", label: "₹25,000 – ₹50,000", min: 25000, max: 50000 },
  { id: "50k-1l", label: "₹50,000 – ₹1,00,000", min: 50000, max: 100000 },
  { id: "1l-2.5l", label: "₹1,00,000 – ₹2,50,000", min: 100000, max: 250000 },
  { id: "above-2.5l", label: "Above ₹2,50,000", min: 250000 },
];

export const weightRanges: RangeOption[] = [
  { id: "under-5", label: "Under 5 g", max: 5 },
  { id: "5-10", label: "5 – 10 g", min: 5, max: 10 },
  { id: "10-20", label: "10 – 20 g", min: 10, max: 20 },
  { id: "20-40", label: "20 – 40 g", min: 20, max: 40 },
  { id: "above-40", label: "Above 40 g", min: 40 },
];

/* ------------------------------------------------------------------ */
/* URL <-> filters                                                     */
/* ------------------------------------------------------------------ */

const METALS: MetalType[] = ["gold", "silver"];
const PURITIES: PurityCode[] = ["24k", "22k", "18k", "14k", "999", "925"];
const GENDERS: Gender[] = ["women", "men", "kids", "unisex"];
const SORTS = sortOptions.map((option) => option.value);

export type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined>;

function getParam(params: SearchParamsInput, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function getList(params: SearchParamsInput, key: string) {
  const raw = getParam(params, key);
  return raw
    ? raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
}

function getNumber(params: SearchParamsInput, key: string) {
  const raw = getParam(params, key);
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

export function parseFilters(params: SearchParamsInput, base?: string): ProductFilters {
  const sort = getParam(params, "sort") as SortOption | undefined;
  const page = Number.parseInt(getParam(params, "page") ?? "1", 10);
  return {
    base,
    category: getList(params, "category"),
    sub: getParam(params, "sub") || undefined,
    collection: getParam(params, "collection") || undefined,
    metal: getList(params, "metal").filter((v): v is MetalType => METALS.includes(v as MetalType)),
    purity: getList(params, "purity").filter((v): v is PurityCode => PURITIES.includes(v as PurityCode)),
    gender: getList(params, "gender").filter((v): v is Gender => GENDERS.includes(v as Gender)),
    size: getList(params, "size"),
    inStock: getParam(params, "inStock") === "true" || undefined,
    newArrival: getParam(params, "new") === "true" || undefined,
    bestSeller: getParam(params, "best") === "true" || undefined,
    minPrice: getNumber(params, "minPrice"),
    maxPrice: getNumber(params, "maxPrice"),
    minWeight: getNumber(params, "minWeight"),
    maxWeight: getNumber(params, "maxWeight"),
    q: getParam(params, "q")?.trim().slice(0, 80) || undefined,
    sort: sort && SORTS.includes(sort) ? sort : undefined,
    page: Number.isFinite(page) && page > 1 ? page : undefined,
  };
}

/** Serialises filters for the storefront URL (the `base` lives in the path). */
export function filtersToSearchParams(filters: ProductFilters) {
  const params = new URLSearchParams();
  const setList = (key: string, values?: string[]) => {
    if (values?.length) params.set(key, values.join(","));
  };
  setList("category", filters.category);
  if (filters.sub) params.set("sub", filters.sub);
  if (filters.collection) params.set("collection", filters.collection);
  setList("metal", filters.metal);
  setList("purity", filters.purity);
  setList("gender", filters.gender);
  setList("size", filters.size);
  if (filters.inStock) params.set("inStock", "true");
  if (filters.newArrival) params.set("new", "true");
  if (filters.bestSeller) params.set("best", "true");
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minWeight !== undefined) params.set("minWeight", String(filters.minWeight));
  if (filters.maxWeight !== undefined) params.set("maxWeight", String(filters.maxWeight));
  if (filters.q) params.set("q", filters.q);
  if (filters.sort && filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

/** Query object for the backend `/products` endpoint. */
export function filtersToApiQuery(filters: ProductFilters) {
  const params = Object.fromEntries(filtersToSearchParams(filters));
  return {
    ...params,
    base: filters.base,
    pageSize: filters.pageSize,
  };
}

export function rangeMatches(option: RangeOption, min?: number, max?: number) {
  return option.min === min && option.max === max;
}

export function countActiveFilters(filters: ProductFilters) {
  let count = 0;
  count += filters.category?.length ?? 0;
  count += filters.metal?.length ?? 0;
  count += filters.purity?.length ?? 0;
  count += filters.gender?.length ?? 0;
  count += filters.size?.length ?? 0;
  if (filters.sub) count += 1;
  if (filters.inStock) count += 1;
  if (filters.newArrival) count += 1;
  if (filters.bestSeller) count += 1;
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) count += 1;
  if (filters.minWeight !== undefined || filters.maxWeight !== undefined) count += 1;
  return count;
}
