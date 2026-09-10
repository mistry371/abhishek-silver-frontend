/**
 * Shared primitives used across every domain model.
 * All monetary values are in Indian Rupees (INR), expressed as numbers.
 */

export type ID = string;
export type ISODateString = string;
export type CurrencyCode = "INR";

export interface ImageAsset {
  url: string;
  alt: string;
  width?: number;
  height?: number;
  /** Optional low-quality placeholder (base64 data URI) supplied by the media pipeline. */
  blurDataUrl?: string;
}

export interface VideoAsset {
  url: string;
  poster?: ImageAsset;
  mimeType?: string;
}

export interface CtaLink {
  label: string;
  href: string;
}

export interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalPath?: string;
  ogImage?: ImageAsset;
  noIndex?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Generic CMS flags every admin-managed record carries. */
export interface Orderable {
  displayOrder: number;
  active: boolean;
}

/** Normalised, customer-safe error returned by the API layer. */
export interface ApiErrorShape {
  code:
    | "network_error"
    | "not_found"
    | "unauthorized"
    | "session_expired"
    | "validation_error"
    | "out_of_stock"
    | "coupon_invalid"
    | "payment_failed"
    | "rate_limited"
    | "server_error";
  message: string;
  fieldErrors?: Record<string, string>;
}
