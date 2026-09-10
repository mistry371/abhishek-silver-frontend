/** Admin order / return / refund shapes, mirroring backend `modules/admin/orders.ts`. */

import type { ImageAsset } from "@/lib/admin/client";

export const ORDER_STATUSES = ["new", "confirmed", "processing", "packed", "shipped", "delivered", "completed", "cancelled", "returned", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "authorized", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const RETURN_STATUSES = ["requested", "approved", "received", "rejected", "closed"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export type ReturnTargetStatus = Exclude<ReturnStatus, "requested">;

/** Mirrors backend RETURN_TRANSITIONS. */
export const RETURN_TRANSITIONS: Record<ReturnStatus, ReturnTargetStatus[]> = {
  requested: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["closed"],
  rejected: [],
  closed: [],
};

export const REFUND_STATUSES = ["pending", "processed", "failed"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_METHODS = ["original_payment", "bank_transfer", "cash", "upi"] as const;
export type RefundMethod = (typeof REFUND_METHODS)[number];
export const refundMethodLabels: Record<RefundMethod, string> = {
  original_payment: "Original payment (gateway)",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  upi: "UPI",
};

export const COMMUNICATION_CHANNELS = ["phone", "whatsapp", "email", "sms", "in_person"] as const;
export type CommunicationChannel = (typeof COMMUNICATION_CHANNELS)[number];
export const channelLabels: Record<CommunicationChannel, string> = {
  phone: "Phone",
  whatsapp: "WhatsApp",
  email: "Email",
  sms: "SMS",
  in_person: "In person",
};

/** Statuses after which the shipping address is locked (server rule). */
export const DISPATCHED_STATUSES: OrderStatus[] = ["shipped", "delivered", "completed", "returned", "refunded"];
/** Statuses for which a return can be recorded (server rule). */
export const RETURNABLE_STATUSES: OrderStatus[] = ["shipped", "delivered", "completed"];

export interface OrderListRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  grandTotal: number;
  stockCommitted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressSnapshot {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: ImageAsset | null;
  metal: string;
  purity: string;
  size?: string;
  customization?: Record<string, string>;
  grossWeight: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderNote {
  id: string;
  orderId: string;
  body: string;
  authorAdminId: string | null;
  authorName: string;
  createdAt: string;
}

export interface OrderCommunication {
  id: string;
  orderId: string;
  channel: CommunicationChannel;
  direction: "outbound" | "inbound";
  summary: string;
  authorName: string;
  createdAt: string;
}

export interface ReturnLine {
  orderItemId: string;
  productId: string | null;
  name: string;
  sku: string;
  quantity: number;
}

export interface OrderReturn {
  id: string;
  returnNumber: string;
  orderId: string;
  status: ReturnStatus;
  reason: string;
  items: ReturnLine[];
  restocked: boolean;
  restockLocationId: string | null;
  notes: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Refund {
  id: string;
  refundNumber: string;
  orderId: string;
  returnId: string | null;
  amount: number;
  method: RefundMethod;
  status: RefundStatus;
  reference: string | null;
  reason: string;
  createdByName: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: string;
  quantityDelta: number;
  locationId: string;
  toLocationId: string | null;
  totalBefore: number;
  totalAfter: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  referenceLabel: string | null;
  actorName: string;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  shippingAddress: AddressSnapshot;
  billingAddress: AddressSnapshot;
  totals: { itemCount: number; subtotal: number; productSavings: number; couponDiscount: number; gst: number; shipping: number; grandTotal: number };
  coupon: { code: string; description: string; discount: number } | null;
  payment: {
    id: string;
    provider: string;
    status: PaymentStatus;
    method?: string;
    amount: number;
    providerOrderId?: string;
    providerPaymentId?: string;
    paidAt?: string;
  };
  timeline: { status: OrderStatus; at: string; note?: string }[];
  invoiceUrl: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customerId: string | null;
  paymentProvider: string;
  stockCommitted: boolean;
  fulfilmentLocationId: string | null;
  allowedTransitions: OrderStatus[];
  internalNotes: OrderNote[];
  communications: OrderCommunication[];
  returns: OrderReturn[];
  refunds: Refund[];
  refundedAmount: number;
  pendingRefundAmount: number;
  invoices: { id: string; invoiceNumber: string | null; status: string; grandTotal: number }[];
  sales: { id: string; saleNumber: string; paymentStatus: string }[];
  stockMovements: StockMovement[];
}

export interface OrderListResponse {
  items: OrderListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts: Partial<Record<OrderStatus, number>>;
}

export type ReturnListRow = OrderReturn & { orderNumber: string; customerName: string };
export type RefundListRow = Refund & { orderNumber: string; customerName: string };

export interface StockLocation {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
  units: number;
}

/**
 * Paid order whose stock was never deducted (e.g. item sold out during
 * checkout). Cancelled orders are excluded: restocking a cancellation also
 * clears `stockCommitted`.
 */
export function needsStockReview(order: { paymentStatus: string; stockCommitted: boolean; status: string }) {
  return order.paymentStatus === "paid" && !order.stockCommitted && order.status !== "cancelled";
}

/** "9876543210" →"https://wa.me/919876543210" (null when not a usable number). */
export function whatsappUrl(phone: string | null | undefined) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 11 ? `https://wa.me/${digits}` : null;
}
