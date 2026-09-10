import type { ID, ImageAsset, ISODateString } from "./common";
import type { InventoryAvailability, MetalType, ProductSummary, PurityCode } from "./catalog";

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

/** What the client sends. Prices are never sent — the server computes them. */
export interface CartItemInput {
  productId: ID;
  slug: string;
  size?: string;
  quantity: number;
  customization?: Record<string, string>;
}

export interface CartItem extends CartItemInput {
  /** Stable line id (product + size + customization). */
  lineId: string;
  product: ProductSummary;
  unitPrice: number;
  lineTotal: number;
  availability: InventoryAvailability;
}

export type CartIssueType =
  | "out_of_stock"
  | "unavailable"
  | "price_changed"
  | "quantity_adjusted"
  | "coupon_invalid";

export interface CartIssue {
  lineId?: string;
  type: CartIssueType;
  message: string;
}

export interface CartTotals {
  itemCount: number;
  /** Sum of line totals (tax inclusive), before coupon. */
  subtotal: number;
  /** Product-level savings already reflected in line prices. */
  productSavings: number;
  couponDiscount: number;
  /** GST contained in the grand total. */
  gst: number;
  shipping: number;
  grandTotal: number;
}

export interface AppliedCoupon {
  code: string;
  description: string;
  discount: number;
}

export interface Cart {
  id?: ID;
  items: CartItem[];
  coupon: AppliedCoupon | null;
  totals: CartTotals;
  issues: CartIssue[];
  currency: "INR";
  /** Server timestamp of this quote; stale quotes are re-validated at checkout. */
  quotedAt: ISODateString;
}

export interface CartQuoteRequest {
  items: CartItemInput[];
  couponCode?: string | null;
}

/* ------------------------------------------------------------------ */
/* Coupons & offers                                                    */
/* ------------------------------------------------------------------ */

export interface Coupon {
  code: string;
  type: "percentage" | "fixed";
  value: number;
  description: string;
  minOrderValue?: number;
  maxDiscount?: number;
  validUntil?: ISODateString;
  appliesTo?: { categorySlugs?: string[]; productIds?: ID[] };
}

export type OfferType =
  | "percentage"
  | "fixed"
  | "product"
  | "category"
  | "limited_time"
  | "festival";

export interface Offer {
  id: ID;
  type: OfferType;
  eyebrow?: string;
  title: string;
  description: string;
  couponCode?: string;
  image?: ImageAsset;
  mobileImage?: ImageAsset;
  cta?: { label: string; href: string };
  startsAt?: ISODateString;
  /** Countdown is only shown when the backend supplies an end date. */
  endsAt?: ISODateString;
  active: boolean;
  displayOrder: number;
}

/* ------------------------------------------------------------------ */
/* Wishlist & compare                                                  */
/* ------------------------------------------------------------------ */

export interface WishlistItem {
  productId: ID;
  slug: string;
  addedAt: ISODateString;
  product?: ProductSummary;
}

export interface ComparisonItem {
  productId: ID;
  slug: string;
  name: string;
  image: ImageAsset;
  sku: string;
  metal: MetalType;
  purity: PurityCode;
  grossWeight: number;
  netWeight: number;
  makingCharges: number;
  finalPrice: number;
  availability: InventoryAvailability;
}
