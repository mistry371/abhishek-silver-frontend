import { apiError } from "@/lib/api/errors";
import { genderLabels, metalLabels, purityFineness, purityLabels } from "@/lib/catalog/filters";
import { productPhoto } from "@/lib/media";
import { calculatePrice } from "@/lib/pricing/engine";
import { clamp } from "@/lib/utils";
import type {
  Category,
  Collection,
  CustomizationOption,
  FacetOption,
  InventoryAvailability,
  MetalType,
  Product,
  ProductBadge,
  ProductFacets,
  ProductFilters,
  ProductListResponse,
  ProductPriceResponse,
  ProductSummary,
  SearchSuggestions,
  SortOption,
} from "@/types/catalog";
import type { ComparisonItem } from "@/types/commerce";
import { productRecords, type CustomizationKey, type MockProductRecord, type SizingType } from "../data/products";
import { DEMO_GST_RATE, demoRates } from "../data/rates";
import { categories, collections, productTypes } from "../data/taxonomy";

/* ------------------------------------------------------------------ */
/* Sizes & variants                                                    */
/* ------------------------------------------------------------------ */

interface SizeTable {
  values: string[];
  base: string;
  label: (value: string) => string;
  factor: (value: string) => number;
}

const RING_SIZES = ["10", "12", "14", "16", "18", "20"];
const BANGLE_SIZES = ["2.4", "2.6", "2.8"];
const CHAIN_LENGTHS = ["16", "18", "20", "22"];
const BRACELET_LENGTHS = ["6.5", "7", "7.5"];

export const sizeTables: Record<SizingType, SizeTable> = {
  ring: {
    values: RING_SIZES,
    base: "14",
    label: (v) => `Size ${v}`,
    factor: (v) => 1 + (RING_SIZES.indexOf(v) - RING_SIZES.indexOf("14")) * 0.04,
  },
  bangle: {
    values: BANGLE_SIZES,
    base: "2.6",
    label: (v) => `${v}"`,
    factor: (v) => 1 + (BANGLE_SIZES.indexOf(v) - BANGLE_SIZES.indexOf("2.6")) * 0.05,
  },
  chain: {
    values: CHAIN_LENGTHS,
    base: "18",
    label: (v) => `${v} in`,
    factor: (v) => Number(v) / 18,
  },
  bracelet: {
    values: BRACELET_LENGTHS,
    base: "7",
    label: (v) => `${v} in`,
    factor: (v) => Number(v) / 7,
  },
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const customizationCatalog: Record<CustomizationKey, CustomizationOption> = {
  engraving: {
    id: "engraving",
    type: "text",
    label: "Engraving",
    required: false,
    maxLength: 12,
    helpText: "Up to 12 characters.",
  },
  initial: {
    id: "initial",
    type: "select",
    label: "Initial",
    required: false,
    options: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({ value: letter, label: letter })),
  },
  note: {
    id: "note",
    type: "textarea",
    label: "Special request",
    required: false,
    maxLength: 240,
    helpText: "Our team will confirm feasibility before your order is processed.",
  },
};

export function findRecord(idOrSlug: string | undefined) {
  if (!idOrSlug) return undefined;
  return productRecords.find((record) => record.id === idOrSlug || record.slug === idOrSlug);
}

export function resolveVariant(record: MockProductRecord, size?: string) {
  const table = record.sizing ? sizeTables[record.sizing] : null;
  const selected = table ? (size && table.values.includes(size) ? size : table.base) : undefined;
  const factor = table && selected ? table.factor(selected) : 1;
  const netWeight = round2(record.netWeight * factor);
  const nonMetal = (record.grossWeight ?? record.netWeight) - record.netWeight + (record.stoneWeight ?? 0) * 0.2;
  return { size: selected, netWeight, grossWeight: round2(netWeight + nonMetal) };
}

export function resolveAvailability(record: MockProductRecord, size?: string): InventoryAvailability {
  if (record.stock === "out_of_stock") {
    return { status: "out_of_stock", purchasable: false, message: "Enquire to be notified when it returns" };
  }
  if (record.stock === "unavailable") return { status: "unavailable", purchasable: false };
  if (size && record.unavailableSizes?.includes(size)) {
    return { status: "out_of_stock", purchasable: false, message: "Not available in this size" };
  }
  if (record.stock === "low_stock") return { status: "low_stock", purchasable: true };
  return { status: "in_stock", purchasable: true };
}

export function resolvePricing(record: MockProductRecord, netWeight: number) {
  return calculatePrice(
    {
      metal: record.metal,
      purity: record.purity,
      netWeight,
      making: record.making,
      stoneCharges: record.stoneCharges ?? 0,
      otherCharges: record.otherCharges ?? 0,
      discount: record.discount ?? null,
      gstRate: DEMO_GST_RATE,
    },
    demoRates,
  );
}

function resolveBadges(record: MockProductRecord): ProductBadge[] {
  const badges: ProductBadge[] = [];
  if (record.stock === "out_of_stock") badges.push("out_of_stock");
  if (record.discount) badges.push("sale");
  if (record.flags?.limited) badges.push("limited");
  if (record.flags?.newArrival) badges.push("new");
  if (record.flags?.bestSeller) badges.push("best_seller");
  if (record.flags?.trending) badges.push("trending");
  return badges;
}

function categoryName(slug: string) {
  return categories.find((category) => category.slug === slug)?.name ?? slug;
}

/* ------------------------------------------------------------------ */
/* Record -> customer-safe product                                     */
/* ------------------------------------------------------------------ */

export function toProduct(record: MockProductRecord): Product {
  const variant = resolveVariant(record);
  const pricing = resolvePricing(record, variant.netWeight);
  const table = record.sizing ? sizeTables[record.sizing] : null;
  const category = categories.find((c) => c.slug === record.type)!;
  const sub = record.sub ? category.subcategories.find((s) => s.slug === record.sub) : undefined;
  const availability = resolveAvailability(record);

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    sku: record.sku,
    shortDescription: record.short,
    description: record.description,
    images: record.images.map(([id, alt]) => productPhoto(id, alt)),
    video: null,
    category: { id: category.id, slug: category.slug, name: category.name },
    subcategory: sub ? { id: sub.id, slug: sub.slug, name: sub.name } : null,
    collections: record.collections.map((slug) => {
      const collection = collections.find((c) => c.slug === slug)!;
      return { id: collection.id, slug: collection.slug, name: collection.name };
    }),
    metal: record.metal,
    purity: record.purity,
    gender: record.gender,
    grossWeight: variant.grossWeight,
    netWeight: variant.netWeight,
    stoneWeight: record.stoneWeight ?? null,
    stoneDetails: record.stoneDetails ?? null,
    makingCharges: pricing.makingCharges,
    stoneCharges: pricing.stoneCharges,
    otherCharges: pricing.otherCharges,
    basePrice: pricing.taxableValue + pricing.discount,
    discount: record.discount ?? null,
    gst: { rate: pricing.gstRate, amount: pricing.gst },
    finalPrice: pricing.finalPrice,
    pricing,
    availability,
    stockStatus: availability.status,
    sizes: table
      ? table.values.map((value) => ({
          value,
          label: table.label(value),
          available: record.stock !== "out_of_stock" && !record.unavailableSizes?.includes(value),
        }))
      : [],
    defaultSize: variant.size ?? null,
    variants: table
      ? table.values.map((value) => {
          const v = resolveVariant(record, value);
          return {
            id: `${record.id}-${value}`,
            sku: `${record.sku}-${value.replace(".", "")}`,
            size: value,
            grossWeight: v.grossWeight,
            netWeight: v.netWeight,
            availability: resolveAvailability(record, value),
          };
        })
      : [],
    customization: (record.customization ?? []).map((key) => customizationCatalog[key]),
    badges: resolveBadges(record),
    featured: Boolean(record.flags?.featured),
    bestSeller: Boolean(record.flags?.bestSeller),
    trending: Boolean(record.flags?.trending),
    newArrival: Boolean(record.flags?.newArrival),
    seo: {
      title: `${record.name} — ${metalLabels[record.metal]} ${category.name}`,
      description: `${record.short} ${purityLabels[record.purity]} ${metalLabels[record.metal].toLowerCase()}, ${variant.grossWeight} g.`,
    },
    published: true,
    createdAt: record.createdAt,
    updatedAt: record.createdAt,
  };
}

export function toSummary(product: Product): ProductSummary {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    images: product.images,
    category: product.category,
    collections: product.collections,
    metal: product.metal,
    purity: product.purity,
    gender: product.gender,
    grossWeight: product.grossWeight,
    netWeight: product.netWeight,
    makingCharges: product.makingCharges,
    discount: product.discount,
    finalPrice: product.finalPrice,
    pricing: product.pricing,
    availability: product.availability,
    stockStatus: product.stockStatus,
    sizes: product.sizes,
    defaultSize: product.defaultSize,
    customization: product.customization,
    badges: product.badges,
    createdAt: product.createdAt,
  };
}

function allProducts() {
  return productRecords.map(toProduct);
}

const recordsById = new Map(productRecords.map((record) => [record.id, record]));

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

const baseMatchers: Record<string, (product: Product) => boolean> = {
  "gold-jewellery": (p) => p.metal === "gold",
  "silver-jewellery": (p) => p.metal === "silver",
  men: (p) => p.gender === "men" || p.gender === "unisex",
  women: (p) => p.gender === "women" || p.gender === "unisex",
  kids: (p) => p.gender === "kids",
  "custom-jewellery": (p) => p.customization.length > 0,
};

function matchesBase(product: Product, base?: string) {
  if (!base) return true;
  const matcher = baseMatchers[base];
  return matcher ? matcher(product) : product.category.slug === base;
}

function searchHaystack(product: Product) {
  return [
    product.name,
    product.sku,
    product.category.name,
    product.subcategory?.name,
    ...product.collections.map((c) => c.name),
    metalLabels[product.metal],
    `${metalLabels[product.metal]} jewellery`,
    purityLabels[product.purity],
    product.purity,
    String(purityFineness[product.purity]),
    genderLabels[product.gender],
    product.gender === "men" || product.gender === "unisex" ? "mens men's" : "",
    product.gender === "women" || product.gender === "unisex" ? "womens women's" : "",
  ]
    .join(" ")
    .toLowerCase();
}

function matchesQuery(product: Product, query: string) {
  const haystack = searchHaystack(product);
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function matchesGender(product: Product, genders: string[]) {
  if (genders.includes(product.gender)) return true;
  return product.gender === "unisex" && genders.some((g) => g === "men" || g === "women");
}

function facetFrom<T extends string>(
  products: Product[],
  values: readonly T[],
  getValues: (product: Product) => string[],
  label: (value: T) => string,
): FacetOption[] {
  return values
    .map((value) => ({
      value,
      label: label(value),
      count: products.filter((p) => getValues(p).includes(value)).length,
    }))
    .filter((option) => option.count > 0);
}

function buildFacets(scoped: Product[], filters: ProductFilters): ProductFacets {
  const typeScoped = filters.category?.length ? scoped.filter((p) => filters.category!.includes(p.category.slug)) : scoped;
  const sizingTypes = new Set(
    typeScoped.map((p) => recordsById.get(p.id)?.sizing).filter((s): s is SizingType => Boolean(s)),
  );
  const sizes: FacetOption[] = [];
  if (sizingTypes.size === 1) {
    const table = sizeTables[[...sizingTypes][0]];
    for (const value of table.values) {
      const count = typeScoped.filter((p) => p.sizes.some((s) => s.value === value && s.available)).length;
      if (count > 0) sizes.push({ value, label: table.label(value), count });
    }
  }

  const prices = scoped.map((p) => p.finalPrice);
  const weights = scoped.map((p) => p.grossWeight);

  return {
    categories: facetFrom(scoped, productTypes, (p) => [p.category.slug], categoryName),
    metals: facetFrom(scoped, ["gold", "silver"] as const, (p) => [p.metal], (v) => metalLabels[v]),
    purities: facetFrom(scoped, ["24k", "22k", "18k", "14k", "999", "925"] as const, (p) => [p.purity], (v) => purityLabels[v]),
    genders: facetFrom(scoped, ["women", "men", "kids", "unisex"] as const, (p) => [p.gender], (v) => genderLabels[v]),
    sizes,
    collections: facetFrom(
      scoped,
      collections.map((c) => c.slug),
      (p) => p.collections.map((c) => c.slug),
      (slug) => collections.find((c) => c.slug === slug)?.name ?? slug,
    ),
    price: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
    weight: { min: weights.length ? Math.min(...weights) : 0, max: weights.length ? Math.max(...weights) : 0 },
  };
}

function sortProducts(list: Product[], sort: SortOption) {
  const metric = (p: Product, key: "sales" | "views") => recordsById.get(p.id)?.[key] ?? 0;
  const sorted = [...list];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "price_asc":
      return sorted.sort((a, b) => a.finalPrice - b.finalPrice);
    case "price_desc":
      return sorted.sort((a, b) => b.finalPrice - a.finalPrice);
    case "best_selling":
      return sorted.sort((a, b) => metric(b, "sales") - metric(a, "sales"));
    case "trending":
      return sorted.sort((a, b) => Number(b.trending) - Number(a.trending) || metric(b, "views") - metric(a, "views"));
    case "most_viewed":
      return sorted.sort((a, b) => metric(b, "views") - metric(a, "views"));
    default:
      return sorted.sort(
        (a, b) =>
          Number(b.availability.purchasable) - Number(a.availability.purchasable) ||
          Number(b.featured) - Number(a.featured) ||
          Number(b.bestSeller) - Number(a.bestSeller) ||
          metric(b, "sales") - metric(a, "sales"),
      );
  }
}

export function listProducts(filters: ProductFilters = {}): ProductListResponse {
  if (filters.base && !categories.some((c) => c.slug === filters.base)) {
    throw apiError("not_found");
  }

  const scoped = allProducts().filter(
    (p) =>
      matchesBase(p, filters.base) &&
      (!filters.collection || p.collections.some((c) => c.slug === filters.collection)) &&
      (!filters.q || matchesQuery(p, filters.q)),
  );

  const facets = buildFacets(scoped, filters);

  const filtered = scoped.filter((p) => {
    if (filters.category?.length && !filters.category.includes(p.category.slug)) return false;
    if (filters.sub && p.subcategory?.slug !== filters.sub) return false;
    if (filters.metal?.length && !filters.metal.includes(p.metal)) return false;
    if (filters.purity?.length && !filters.purity.includes(p.purity)) return false;
    if (filters.gender?.length && !matchesGender(p, filters.gender)) return false;
    if (filters.size?.length && !p.sizes.some((s) => filters.size!.includes(s.value) && s.available)) return false;
    if (filters.inStock && !p.availability.purchasable) return false;
    if (filters.newArrival && !p.newArrival) return false;
    if (filters.bestSeller && !p.bestSeller) return false;
    if (filters.minPrice !== undefined && p.finalPrice < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && p.finalPrice > filters.maxPrice) return false;
    if (filters.minWeight !== undefined && p.grossWeight < filters.minWeight) return false;
    if (filters.maxWeight !== undefined && p.grossWeight > filters.maxWeight) return false;
    return true;
  });

  const sorted = sortProducts(filtered, filters.sort ?? "featured");
  const pageSize = clamp(filters.pageSize ?? 12, 1, 48);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = clamp(filters.page ?? 1, 1, totalPages);

  return {
    items: sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
    total: sorted.length,
    page,
    pageSize,
    totalPages,
    facets,
  };
}

export type MerchandisingKind = "featured" | "bestSeller" | "trending" | "newArrival";

export function listMerchandised(kind: MerchandisingKind, limit = 10): ProductSummary[] {
  const sortBy: Record<MerchandisingKind, SortOption> = {
    featured: "featured",
    bestSeller: "best_selling",
    trending: "most_viewed",
    newArrival: "newest",
  };
  return sortProducts(
    allProducts().filter((p) => p[kind]),
    sortBy[kind],
  )
    .slice(0, limit)
    .map(toSummary);
}

export function listByMetal(metal: MetalType, limit = 10): ProductSummary[] {
  return sortProducts(
    allProducts().filter((p) => p.metal === metal && p.availability.purchasable),
    "featured",
  )
    .slice(0, limit)
    .map(toSummary);
}

export function listByCollection(slug: string, limit = 10): ProductSummary[] {
  return sortProducts(
    allProducts().filter((p) => p.collections.some((c) => c.slug === slug)),
    "featured",
  )
    .slice(0, limit)
    .map(toSummary);
}

export function getProduct(slug: string): Product | null {
  const record = productRecords.find((r) => r.slug === slug);
  return record ? toProduct(record) : null;
}

export function getRelated(productId: string, limit = 8): ProductSummary[] {
  const source = findRecord(productId);
  if (!source) return [];
  return productRecords
    .filter((r) => r.id !== source.id && r.stock !== "out_of_stock")
    .map((r) => ({
      record: r,
      score:
        (r.type === source.type ? 3 : 0) +
        r.collections.filter((c) => source.collections.includes(c)).length +
        (r.metal === source.metal ? 1 : 0),
    }))
    .filter((entry) => entry.score > 1)
    .sort((a, b) => b.score - a.score || b.record.sales - a.record.sales)
    .slice(0, limit)
    .map((entry) => toSummary(toProduct(entry.record)));
}

export function getAllSlugs() {
  return productRecords.map((record) => ({ slug: record.slug, updatedAt: record.createdAt }));
}

export function getCategoriesWithCounts(): Category[] {
  const products = allProducts();
  return categories
    .filter((c) => c.active)
    .map((category) => ({
      ...category,
      productCount: products.filter((p) => matchesBase(p, category.slug)).length,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getCategory(slug: string): Category | null {
  return getCategoriesWithCounts().find((c) => c.slug === slug) ?? null;
}

export function getCollections(): Collection[] {
  return collections.filter((c) => c.active).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function getCollection(slug: string): Collection | null {
  return collections.find((c) => c.slug === slug && c.active) ?? null;
}

export function getPrice(idOrSlug: string, size?: string): ProductPriceResponse {
  const record = findRecord(idOrSlug);
  if (!record) throw apiError("not_found");
  if (size && record.sizing && !sizeTables[record.sizing].values.includes(size)) {
    throw apiError("validation_error", "Please choose a valid size.");
  }
  const variant = resolveVariant(record, size);
  return {
    productId: record.id,
    size: variant.size,
    pricing: resolvePricing(record, variant.netWeight),
    availability: resolveAvailability(record, variant.size),
    grossWeight: variant.grossWeight,
    netWeight: variant.netWeight,
  };
}

export function search(query: string): SearchSuggestions {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) {
    return { query, products: [], categories: [], collections: [], total: 0 };
  }
  const products = sortProducts(
    allProducts().filter((p) => matchesQuery(p, normalized)),
    "featured",
  );
  const tokens = normalized.split(/\s+/);
  const matchingCategories = getCategoriesWithCounts()
    .filter((c) => tokens.some((t) => c.name.toLowerCase().includes(t)))
    .slice(0, 4)
    .map((c) => ({ label: c.name, href: `/shop/${c.slug}`, meta: `${c.productCount ?? 0} pieces` }));
  const matchingCollections = getCollections()
    .filter((c) => tokens.some((t) => c.name.toLowerCase().includes(t)))
    .slice(0, 3)
    .map((c) => ({ label: c.name, href: `/collection/${c.slug}`, meta: "Collection" }));

  return {
    query,
    products: products.slice(0, 6).map(toSummary),
    categories: matchingCategories,
    collections: matchingCollections,
    total: products.length,
  };
}

export function compare(ids: string[]): ComparisonItem[] {
  return ids
    .map((id) => findRecord(id))
    .filter((r): r is MockProductRecord => Boolean(r))
    .map((record) => {
      const product = toProduct(record);
      return {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.images[0],
        sku: product.sku,
        metal: product.metal,
        purity: product.purity,
        grossWeight: product.grossWeight,
        netWeight: product.netWeight,
        makingCharges: product.makingCharges,
        finalPrice: product.finalPrice,
        availability: product.availability,
      };
    });
}
