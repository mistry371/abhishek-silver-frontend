/** Shapes returned by the backend sales & billing routes (`sales.ts`, `billing.ts`). */

export const PAYMENT_METHODS = ["cash", "upi", "card", "bank_transfer", "cheque", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

export const paymentMethodOptions = PAYMENT_METHODS.map((value) => ({ value, label: paymentMethodLabels[value] }));

export const methodLabel = (method: string | null | undefined) => (method ? (paymentMethodLabels[method as PaymentMethod] ?? method) : "—");

export type SaleChannel = "online" | "manual";
export type SalePaymentStatus = "pending" | "partially_paid" | "paid" | "refunded";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "cancelled";
export type InvoiceSource = "online_order" | "manual_sale" | "manual";

export const invoiceSourceLabels: Record<InvoiceSource, string> = {
  online_order: "Online order",
  manual_sale: "In-store sale",
  manual: "Manual",
};

export const sourceLabel = (source: string | null | undefined) => (source ? (invoiceSourceLabels[source as InvoiceSource] ?? source) : "—");

export const channelLabel = (channel: string | null | undefined) => (channel === "manual" ? "In-store" : channel === "online" ? "Online" : "—");

export interface SaleListItem {
  id: string;
  saleNumber: string;
  channel: SaleChannel;
  orderId: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  subtotal: number;
  discount: number;
  taxableValue: number;
  gst: number;
  grandTotal: number;
  paymentStatus: SalePaymentStatus;
  paymentMethod: string | null;
  locationId: string | null;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  invoice: { id: string; invoiceNumber: string | null } | null;
}

export interface SaleItem {
  id: string;
  productId: string | null;
  name: string;
  sku: string;
  size: string | null;
  metal: string;
  purity: string;
  quantity: number;
  grossWeight: number;
  netWeight: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
}

export interface SaleDetail extends Omit<SaleListItem, "invoice"> {
  items: SaleItem[];
  invoice: { id: string; invoiceNumber: string | null; status: InvoiceStatus; amountPaid: number; balanceDue: number } | null;
}

export interface QuoteLine {
  productId: string;
  name: string;
  sku: string;
  size: string | null;
  quantity: number;
  netWeight: number;
  grossWeight: number;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  available: number;
}

export interface DocumentTotals {
  subtotal: number;
  discount: number;
  taxableValue: number;
  gst: number;
  grandTotal: number;
}

export interface SaleQuote {
  lines: QuoteLine[];
  totals: DocumentTotals;
  stockShortfalls: { productId: string; sku: string; requested: number; available: number }[];
}

export interface InvoiceCustomer {
  name: string;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
}

export interface InvoiceListItem {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  source: InvoiceSource;
  customer: InvoiceCustomer;
  customerId: string | null;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  dueDate: string | null;
  issuedAt: string | null;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string | null;
  description: string;
  sku: string | null;
  size: string | null;
  metal: string | null;
  purity: string | null;
  quantity: number;
  grossWeight: number | null;
  netWeight: number | null;
  unitPrice: number;
  discount: number;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  lineTotal: number;
  position: number;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  receivedAt: string;
  recordedByName: string;
  createdAt: string;
}

export interface InvoiceEvent {
  id: string;
  action: string;
  note: string | null;
  actorName: string;
  createdAt: string;
}

export interface InvoiceDetail extends DocumentTotals {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  source: InvoiceSource;
  orderId: string | null;
  saleId: string | null;
  customerId: string | null;
  customer: InvoiceCustomer;
  amountPaid: number;
  balanceDue: number;
  issuedAt: string | null;
  dueDate: string | null;
  notes: string | null;
  cancelReason: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  events: InvoiceEvent[];
  order: { id: string; orderNumber: string } | null;
  sale: { id: string; saleNumber: string } | null;
  seller: {
    name?: string | null;
    gstin?: string | null;
    stateCode?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    footerNote?: string | null;
  };
}

export interface BillingSummary {
  period: { from: string; to: string };
  counts: { issued: number; paid: number; partiallyPaid: number; unpaid: number; drafts: number };
  billedTotal: number;
  collected: number;
  outstanding: number;
  overdueInvoices: number;
  exceptions: { paidOrdersWithoutInvoice: { id: string; orderNumber: string; grandTotal: number; paidAt: string | null }[] };
  recent: { id: string; invoiceNumber: string | null; status: InvoiceStatus; customer: InvoiceCustomer; grandTotal: number; balanceDue: number; issuedAt: string | null; createdAt: string }[];
}

export interface CustomerOption {
  id: string;
  customerCode: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  image: { url: string; alt: string } | null;
  metal: string;
  purity: string;
  netWeight: number;
  status: string;
  stock: number;
  stockStatus: string;
  finalPrice: number | null;
  pricingError: string | null;
}

export interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  status: string;
  metal: string;
  purity: string;
  sizeOptions: string[];
  defaultSize: string | null;
  stock: { total: number; levels: { locationId: string; quantity: number }[]; stockStatus: string };
  pricingError: string | null;
}

export interface StockLocation {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
  units: number;
}

/** Field error lookup for `{ fieldErrors }` keyed by dotted paths. */
export const fieldError = (errors: Record<string, string> | undefined, ...keys: string[]) => {
  if (!errors) return undefined;
  for (const key of keys) if (errors[key]) return errors[key];
  return undefined;
};

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
