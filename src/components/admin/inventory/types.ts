import type { ImageAsset } from "@/lib/admin/client";

/* ------------------------------------------------------------------ */
/* Inventory (backend: modules/admin/inventory.ts)                     */
/* ------------------------------------------------------------------ */

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unavailable";
export type ProductStatus = "active" | "draft" | "disabled";
export type MovementType = "opening" | "purchase" | "sale" | "return" | "add" | "reduce" | "adjustment" | "transfer";
export type ReferenceType = "purchase" | "order" | "sale" | "return" | "manual" | "seed";

export interface StockLocation {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
  units: number;
}

export interface CategoryOption {
  id: string;
  name: string;
  group: string;
  active?: boolean;
}

export interface InventoryRow {
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  image: ImageAsset | null;
  category: { id: string; name: string };
  metal: string;
  purity: string;
  netWeight: number;
  grossWeight: number | null;
  stoneWeight: number | null;
  productStatus: ProductStatus;
  lowStockThreshold: number;
  stockVersion: number;
  total: number;
  /** Quantity keyed by location id. */
  levels: Record<string, number>;
  stockStatus: StockStatus;
  /** Only with `products:view_confidential`. */
  vendor?: { id: string; name: string | null } | null;
  purchasePrice?: number | null;
  /** Only with `inventory:view_valuation`. */
  valuation?: number | null;
}

export interface InventorySummary {
  products: number;
  totalUnits: number;
  lowStock: number;
  outOfStock: number;
  byLocation: { locationId: string; name: string; units: number }[];
  valuation?: number;
  productsMissingCost?: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: MovementType;
  quantityDelta: number;
  locationId: string;
  toLocationId: string | null;
  totalBefore: number;
  totalAfter: number;
  locationBefore: number;
  locationAfter: number;
  toLocationBefore: number | null;
  toLocationAfter: number | null;
  reason: string | null;
  referenceType: ReferenceType | null;
  referenceId: string | null;
  referenceLabel: string | null;
  actorAdminId: string | null;
  actorName: string;
  createdAt: string;
  /** Present on the movement list endpoint. */
  productName?: string;
  sku?: string;
}

export interface InventoryDetail {
  product: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    image: ImageAsset | null;
    category: string;
    metal: string;
    purity: string;
    netWeight: number;
    grossWeight: number | null;
    status: ProductStatus;
    lowStockThreshold: number;
    purchasePrice?: number | null;
    vendorId?: string | null;
  };
  stockVersion: number;
  total: number;
  stockStatus: StockStatus;
  levels: { locationId: string; name: string; active: boolean; quantity: number }[];
  movements: StockMovement[];
}

/* ------------------------------------------------------------------ */
/* Vendors & purchases (backend: modules/admin/purchasing.ts)          */
/* ------------------------------------------------------------------ */

export type VendorStatus = "active" | "inactive";
export type PurchaseStatus = "draft" | "pending_approval" | "approved" | "cancelled";

export interface Vendor {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  mobile: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  status: VendorStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorListItem extends Vendor {
  /** Only with `purchases:view`. */
  purchases?: number;
  approvedValue?: number;
}

export interface VendorDetail extends Vendor {
  /** `null` without `purchases:view`. */
  purchases: { id: string; purchaseNumber: string; purchaseDate: string; status: PurchaseStatus; total: number }[] | null;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  vendorId: string;
  vendorInvoiceRef: string | null;
  purchaseDate: string;
  receivingLocationId: string;
  status: PurchaseStatus;
  totalQuantity: number;
  totalGrossWeight: number;
  totalNetWeight: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  createdById: string | null;
  createdByName: string;
  submittedAt: string | null;
  approvedById: string | null;
  approvedByName: string | null;
  approvedAt: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseListItem extends Purchase {
  vendorName: string;
  locationName: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string | null;
  description: string;
  sku: string | null;
  metal: string;
  purity: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  ratePerGram: number;
  makingCharges: number;
  otherCharges: number;
  lineTotal: number;
  position: number;
  productName: string | null;
  productSku: string | null;
}

export interface PurchaseDetail extends Purchase {
  vendor: { id: string; code: string; name: string; gstin: string | null };
  locationName: string;
  items: PurchaseItem[];
  history: { action: string; actorName: string; reason: string | null; createdAt: string }[];
}

/** Row from `GET /products` used by the purchase line product picker. */
export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  image: ImageAsset | null;
  category: { id: string; name: string };
  metal: string;
  purity: string;
  netWeight: number;
  status: ProductStatus;
  stock: number;
  stockStatus: StockStatus;
}
