import type { ID, ImageAsset, ISODateString } from "./common";
import type { MetalType, PurityCode } from "./catalog";
import type { AppliedCoupon, CartItemInput, CartTotals } from "./commerce";

/* ------------------------------------------------------------------ */
/* Customer & auth                                                     */
/* ------------------------------------------------------------------ */

export interface Address {
  id: ID;
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
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

export type AddressInput = Omit<Address, "id">;

export interface Customer {
  id: ID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  marketingOptIn: boolean;
  createdAt: ISODateString;
}

export interface AuthSession {
  customer: Customer;
  /**
   * In production the backend should issue an httpOnly cookie. The token is
   * kept here only so the API layer can attach it during mock development.
   */
  accessToken: string;
  expiresAt: ISODateString;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  marketingOptIn: boolean;
}

export interface OtpRequestInput {
  phone: string;
}

export interface OtpVerifyInput {
  phone: string;
  otp: string;
}

/* ------------------------------------------------------------------ */
/* Orders & payments                                                   */
/* ------------------------------------------------------------------ */

export type OrderStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "packed"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned"
  | "refunded";

export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "refunded";

export interface OrderItem {
  id: ID;
  productId: ID;
  slug: string;
  name: string;
  sku: string;
  image: ImageAsset;
  metal: MetalType;
  purity: PurityCode;
  size?: string;
  customization?: Record<string, string>;
  grossWeight: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Payment {
  id: ID;
  provider: string;
  status: PaymentStatus;
  method?: string;
  amount: number;
  providerOrderId?: string;
  providerPaymentId?: string;
  paidAt?: ISODateString;
}

export interface OrderStatusEvent {
  status: OrderStatus;
  at: ISODateString;
  note?: string;
}

export interface Order {
  id: ID;
  orderNumber: string;
  status: OrderStatus;
  customer: { name: string; email: string; phone: string };
  items: OrderItem[];
  shippingAddress: AddressInput;
  billingAddress: AddressInput;
  totals: CartTotals;
  coupon: AppliedCoupon | null;
  payment: Payment;
  timeline: OrderStatusEvent[];
  invoiceUrl?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  notes?: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CreateOrderInput {
  items: CartItemInput[];
  couponCode?: string | null;
  customer: { name: string; email: string; phone: string };
  shippingAddress: AddressInput;
  billingAddress: AddressInput;
  notes?: string;
  paymentProvider: "razorpay";
}

/** Returned by the backend so the client can open the payment gateway. */
export interface PaymentIntent {
  provider: "razorpay" | "demo";
  keyId?: string;
  providerOrderId: string;
  amount: number;
  currency: "INR";
}

export interface CreateOrderResponse {
  order: Order;
  paymentIntent: PaymentIntent;
}

export interface VerifyPaymentInput {
  orderId: ID;
  providerOrderId: string;
  providerPaymentId: string;
  signature: string;
}

/* ------------------------------------------------------------------ */
/* Enquiries                                                           */
/* ------------------------------------------------------------------ */

export type EnquiryType = "product" | "custom_jewellery" | "contact";
export type PreferredContact = "phone" | "whatsapp" | "email";

export interface EnquiryInput {
  type: EnquiryType;
  name: string;
  mobile: string;
  email: string;
  message: string;
  subject?: string;
  product?: { id: ID; name: string; sku: string };
  jewelleryType?: string;
  budgetRange?: string;
  preferredMetal?: string;
  preferredPurity?: string;
  preferredContact?: PreferredContact;
  attachments?: { name: string; size: number; type: string }[];
}

export interface Enquiry extends EnquiryInput {
  id: ID;
  reference: string;
  status: "new" | "in_progress" | "responded" | "closed";
  createdAt: ISODateString;
}
