import type { ImageAsset } from "@/lib/admin/client";

/* Shapes returned by the admin catalogue API (backend `modules/admin/catalogue.ts`). */

export type Metal = "gold" | "silver";
export type Purity = "24k" | "22k" | "18k" | "14k" | "999" | "925";
export type Gender = "women" | "men" | "kids" | "unisex";
export type ProductStatus = "active" | "draft" | "disabled";
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unavailable";
export type MakingType = "per_gram" | "percentage" | "fixed";
export type SizingType = "ring" | "bangle" | "chain" | "bracelet";
export type CustomizationKey = "engraving" | "initial" | "note";
export type CategoryGroup = "metal" | "type" | "audience" | "service";
export type FlagKey = "featured" | "bestSeller" | "trending" | "newArrival" | "limited";
export type MerchandisingFlags = Record<FlagKey, boolean>;

export interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ProductDiscount {
  type: "percentage" | "fixed";
  value: number;
  label?: string;
  endsAt?: string;
}

export interface VideoAsset {
  url: string;
  poster?: ImageAsset;
  mimeType?: string;
}

export interface PriceBreakdown {
  currency: "INR";
  metalRatePerGram: number;
  metalValue: number;
  makingCharges: number;
  stoneCharges: number;
  otherCharges: number;
  discount: number;
  originalPrice: number;
  taxableValue: number;
  /** Percent, e.g. 3 for 3%. */
  gstRate: number;
  gst: number;
  finalPrice: number;
  rateEffectiveAt?: string;
  isEstimate?: boolean;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string | null;
  image: ImageAsset | null;
  category: { id: string; name: string };
  metal: Metal;
  purity: Purity;
  gender: Gender;
  netWeight: number;
  status: ProductStatus;
  flags: MerchandisingFlags;
  stock: number;
  stockStatus: StockStatus;
  finalPrice: number | null;
  pricingError: string | null;
  updatedAt: string;
  purchasePrice?: number | null;
  vendorId?: string | null;
}

export interface ProductDetail {
  id: string;
  slug: string;
  sku: string;
  barcode: string | null;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  subcategoryId: string | null;
  metal: Metal;
  purity: Purity;
  gender: Gender;
  netWeight: number;
  grossWeight: number | null;
  stoneWeight: number | null;
  stoneDetails: string | null;
  makingType: MakingType;
  makingValue: number;
  stoneCharges: number;
  otherCharges: number;
  discount: ProductDiscount | null;
  sizing: SizingType | null;
  sizeOptions: string[];
  defaultSize: string | null;
  sizeWeights: Record<string, number>;
  unavailableSizes: string[];
  customization: CustomizationKey[];
  images: ImageAsset[];
  video: VideoAsset | null;
  flags: MerchandisingFlags;
  status: ProductStatus;
  seo: SeoMeta;
  lowStockThreshold: number;
  salesCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  /** Present only for roles with `products:view_confidential`. */
  purchasePrice?: number | null;
  vendorId?: string | null;
  vendor?: { id: string; name: string } | null;
  category: { id: string; name: string; slug: string } | null;
  collectionIds: string[];
  stock: { total: number; levels: { locationId: string; quantity: number }[]; stockStatus: StockStatus };
  pricing: PriceBreakdown | null;
  pricingError: string | null;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingRule {
  metal?: Metal;
  genders?: Gender[];
  customizable?: boolean;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  description: string;
  image: ImageAsset;
  group: CategoryGroup;
  listingRule: ListingRule | null;
  seo: SeoMeta;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  productCount: number;
  subcategories: Subcategory[];
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  eyebrow: string | null;
  description: string;
  image: ImageAsset;
  mobileImage: ImageAsset | null;
  seo: SeoMeta;
  displayOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  productCount: number;
}

export interface StockLocation {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
  units: number;
}

export interface VendorOption {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
}
