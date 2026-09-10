import type { ImageAsset, Paginated } from "@/lib/admin/client";

/* ------------------------------------------------------------------ */
/* Customers (GET/POST/PATCH /v1/admin/customers)                      */
/* ------------------------------------------------------------------ */

export type CustomerStatus = "active" | "inactive" | "blocked";
export type CustomerSource = "website" | "admin" | "walk_in";

export interface CustomerRow {
  id: string;
  customerCode: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: CustomerStatus;
  source: CustomerSource;
  hasAccount: boolean;
  marketingOptIn: boolean;
  purchaseCount: number;
  totalSpent: number;
  lastPurchaseAt: string | null;
  createdAt: string;
}

/** Raw customer record returned by POST and PATCH /customers. */
export interface CustomerRecord {
  id: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  status: CustomerStatus;
  source: CustomerSource;
  marketingOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile extends CustomerRecord {
  name: string;
  hasAccount: boolean;
}

export interface CustomerAddress {
  id: string;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

/** Internal staff note — never shown to the customer. */
export interface CustomerNote {
  id: string;
  customerId: string;
  body: string;
  authorAdminId: string | null;
  authorName: string;
  createdAt: string;
}

export interface Customer360 {
  customer: CustomerProfile;
  stats: {
    totalSpent: number;
    purchaseCount: number;
    onlineOrderCount: number;
    averagePurchaseValue: number;
    firstPurchaseAt: string | null;
    lastPurchaseAt: string | null;
  };
  addresses: CustomerAddress[];
  orders: { id: string; orderNumber: string; status: string; paymentStatus: string; itemCount: number; grandTotal: number; createdAt: string }[];
  purchases: {
    id: string;
    saleNumber: string;
    channel: string;
    grandTotal: number;
    paymentStatus: string;
    createdAt: string;
    items: { saleId: string; name: string; sku: string; quantity: number; lineTotal: number }[];
  }[];
  invoices: {
    id: string;
    invoiceNumber: string | null;
    status: string;
    source: string;
    grandTotal: number;
    balanceDue: number;
    issuedAt: string | null;
    createdAt: string;
  }[];
  wishlist: { productId: string; name: string; sku: string; image: ImageAsset | null; status: string; addedAt: string }[];
  enquiries: { id: string; reference: string; type: EnquiryType; status: EnquiryStatus; message: string; createdAt: string }[];
  notes: CustomerNote[];
  activity: { at: string; type: string; label: string; href: string | null }[];
}

/* ------------------------------------------------------------------ */
/* Enquiries (GET/POST/PATCH /v1/admin/enquiries)                      */
/* ------------------------------------------------------------------ */

export type EnquiryStatus = "new" | "in_progress" | "responded" | "closed";
export type EnquiryType = "product" | "custom_jewellery" | "contact";
export type EnquirySource = "website_form" | "product_page" | "custom_jewellery" | "whatsapp" | "phone" | "walk_in";
export type ContactChannel = "phone" | "whatsapp" | "email" | "in_person";

export interface EnquiryProductRef {
  id: string;
  name: string;
  sku: string;
}

export interface EnquiryRow {
  id: string;
  reference: string;
  type: EnquiryType;
  source: EnquirySource;
  name: string;
  mobile: string;
  email: string;
  product: EnquiryProductRef | null;
  status: EnquiryStatus;
  assignedTo: string | null;
  assignedToAdminId: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EnquiryList = Paginated<EnquiryRow> & { statusCounts: Record<string, number> };

export interface EnquiryNote {
  id: string;
  enquiryId: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface EnquiryContactLog {
  id: string;
  enquiryId: string;
  channel: ContactChannel;
  outcome: string;
  note: string | null;
  authorName: string;
  createdAt: string;
}

export interface EnquiryDetail {
  id: string;
  reference: string;
  type: EnquiryType;
  source: EnquirySource;
  customerId: string | null;
  name: string;
  mobile: string;
  /** Empty string when the enquirer gave no email. */
  email: string;
  subject: string | null;
  message: string;
  product: EnquiryProductRef | null;
  jewelleryType: string | null;
  budgetRange: string | null;
  preferredMetal: string | null;
  preferredPurity: string | null;
  preferredContact: "phone" | "whatsapp" | "email" | null;
  attachments: { id: string; name: string; size: number; type: string; uploadedAt: string }[];
  status: EnquiryStatus;
  assignedToAdminId: string | null;
  assignedTo: { id: string; name: string | null } | null;
  /** Null when no match was found or the admin lacks `customers:view`. */
  customer: { id: string; customerCode: string; name: string; linked: boolean } | null;
  notes: EnquiryNote[];
  contactHistory: EnquiryContactLog[];
  createdAt: string;
  updatedAt: string;
}

export interface Assignee {
  id: string;
  name: string;
}
