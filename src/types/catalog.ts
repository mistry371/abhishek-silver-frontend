import type {
  CtaLink,
  ID,
  ImageAsset,
  ISODateString,
  Orderable,
  Paginated,
  SeoMeta,
  VideoAsset,
} from "./common";

/* ------------------------------------------------------------------ */
/* Metals & purity                                                     */
/* ------------------------------------------------------------------ */

export type MetalType = "gold" | "silver";

export interface Metal {
  id: MetalType;
  name: string;
  slug: string;
}

export type PurityCode = "24k" | "22k" | "18k" | "14k" | "999" | "925";

export interface Purity {
  code: PurityCode;
  /** Customer-facing label, e.g. "22KT". */
  label: string;
  /** Millesimal fineness, e.g. 916 for 22KT gold. */
  fineness: number;
  metal: MetalType;
}

export type Gender = "women" | "men" | "kids" | "unisex";

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

export interface Subcategory {
  id: ID;
  slug: string;
  name: string;
  categoryId: ID;
}

export type CategoryGroup = "metal" | "type" | "audience" | "service";

export interface Category extends Orderable {
  id: ID;
  slug: string;
  name: string;
  /** Short label for compact UI such as chips and breadcrumbs. */
  shortName?: string;
  description: string;
  image: ImageAsset;
  group: CategoryGroup;
  productCount?: number;
  subcategories: Subcategory[];
  seo?: SeoMeta;
}

export interface Collection extends Orderable {
  id: ID;
  slug: string;
  name: string;
  eyebrow?: string;
  description: string;
  image: ImageAsset;
  mobileImage?: ImageAsset;
  cta?: CtaLink;
  seo?: SeoMeta;
}

export interface TaxonomyRef {
  id: ID;
  slug: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/* Pricing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Customer-safe price breakdown. Produced by the backend price engine:
 * Metal Rate × Purity × Weight + Making + Stone + Other + GST − Discount.
 *
 * NEVER add purchase price, supplier cost, margin or valuation here.
 */
export interface PriceBreakdown {
  currency: "INR";
  /** Rate per gram for the product's purity, as applied by the backend. */
  metalRatePerGram: number;
  metalValue: number;
  makingCharges: number;
  stoneCharges: number;
  otherCharges: number;
  /** Discount amount applied before tax. */
  discount: number;
  /** Price before discount, tax inclusive. Used for strike-through display. */
  originalPrice: number;
  taxableValue: number;
  gstRate: number;
  gst: number;
  finalPrice: number;
  /** When the metal rate used for this price was last published. */
  rateEffectiveAt?: ISODateString;
  /** True when the value is a client-side preview awaiting server confirmation. */
  isEstimate?: boolean;
}

export interface ProductDiscount {
  type: "percentage" | "fixed";
  value: number;
  label?: string;
  endsAt?: ISODateString;
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unavailable";

export interface InventoryAvailability {
  status: StockStatus;
  /** Whether checkout is allowed. Backend-controlled. */
  purchasable: boolean;
  /** Optional customer-facing note, e.g. "Made to order in 10–12 days". */
  message?: string;
}

/* ------------------------------------------------------------------ */
/* Product                                                             */
/* ------------------------------------------------------------------ */

export interface ProductSizeOption {
  value: string;
  label: string;
  available: boolean;
}

export type CustomizationFieldType = "text" | "textarea" | "select";

export interface CustomizationOption {
  id: ID;
  type: CustomizationFieldType;
  label: string;
  required: boolean;
  maxLength?: number;
  helpText?: string;
  options?: { value: string; label: string }[];
}

export interface ProductVariant {
  id: ID;
  sku: string;
  size?: string;
  grossWeight: number;
  netWeight: number;
  availability: InventoryAvailability;
}

export type ProductBadge = "new" | "best_seller" | "trending" | "sale" | "limited" | "out_of_stock";

export interface Product {
  id: ID;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  images: ImageAsset[];
  video?: VideoAsset | null;

  category: TaxonomyRef;
  subcategory?: TaxonomyRef | null;
  collections: TaxonomyRef[];

  metal: MetalType;
  purity: PurityCode;
  gender: Gender;

  /** Grams */
  grossWeight: number;
  /** Grams */
  netWeight: number;
  /** Carats */
  stoneWeight?: number | null;
  stoneDetails?: string | null;

  makingCharges: number;
  stoneCharges: number;
  otherCharges: number;
  /** Price before discount and tax. */
  basePrice: number;
  discount?: ProductDiscount | null;
  gst: { rate: number; amount: number };
  finalPrice: number;
  pricing: PriceBreakdown;

  availability: InventoryAvailability;
  stockStatus: StockStatus;

  sizes: ProductSizeOption[];
  /** Size the listed price and weights refer to. */
  defaultSize?: string | null;
  variants: ProductVariant[];
  customization: CustomizationOption[];

  /** Merchandising badges exactly as supplied by admin data. */
  badges: ProductBadge[];
  featured: boolean;
  bestSeller: boolean;
  trending: boolean;
  newArrival: boolean;

  seo: SeoMeta;
  published: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Lightweight shape for listings, carousels and search results. */
export type ProductSummary = Pick<
  Product,
  | "id"
  | "name"
  | "slug"
  | "sku"
  | "images"
  | "category"
  | "collections"
  | "metal"
  | "purity"
  | "gender"
  | "grossWeight"
  | "netWeight"
  | "makingCharges"
  | "discount"
  | "finalPrice"
  | "pricing"
  | "availability"
  | "stockStatus"
  | "sizes"
  | "defaultSize"
  | "customization"
  | "badges"
  | "createdAt"
>;

/* ------------------------------------------------------------------ */
/* Listing, filtering & search                                         */
/* ------------------------------------------------------------------ */

export type SortOption =
  | "featured"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "best_selling"
  | "trending"
  | "most_viewed";

export type ViewMode = "grid" | "list";

export interface ProductFilters {
  /** Category landing page the listing is scoped to, e.g. "gold-jewellery" or "rings". */
  base?: string;
  /** Jewellery type slugs selected in the filter panel, e.g. ["rings", "earrings"]. */
  category?: string[];
  sub?: string;
  collection?: string;
  metal?: MetalType[];
  purity?: PurityCode[];
  gender?: Gender[];
  size?: string[];
  inStock?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minWeight?: number;
  maxWeight?: number;
  q?: string;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface ProductFacets {
  categories: FacetOption[];
  metals: FacetOption[];
  purities: FacetOption[];
  genders: FacetOption[];
  sizes: FacetOption[];
  collections: FacetOption[];
  price: { min: number; max: number };
  weight: { min: number; max: number };
}

export interface ProductListResponse extends Paginated<ProductSummary> {
  facets: ProductFacets;
}

export interface SearchSuggestionLink {
  label: string;
  href: string;
  meta?: string;
}

export interface SearchSuggestions {
  query: string;
  products: ProductSummary[];
  categories: SearchSuggestionLink[];
  collections: SearchSuggestionLink[];
  total: number;
}

export interface ProductPriceRequest {
  size?: string;
  quantity?: number;
}

export interface ProductPriceResponse {
  productId: ID;
  size?: string;
  pricing: PriceBreakdown;
  availability: InventoryAvailability;
  grossWeight: number;
  netWeight: number;
}
