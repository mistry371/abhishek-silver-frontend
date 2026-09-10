import { apiError } from "@/lib/api/errors";
import type { WishlistItem } from "@/types/commerce";
import type {
  Address,
  AddressInput,
  AuthSession,
  CreateOrderInput,
  CreateOrderResponse,
  Customer,
  Enquiry,
  EnquiryInput,
  LoginInput,
  Order,
  OtpRequestInput,
  OtpVerifyInput,
  RegisterInput,
  VerifyPaymentInput,
} from "@/types/customer";
import { DEMO_ACCOUNT, mutateDb, nextSequence, readDb, type MockCustomerRecord } from "../db";
import { findRecord, toProduct, toSummary } from "./catalog";
import { quoteCart } from "./commerce";

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

const SESSION_DAYS = 7;

function publicCustomer(record: MockCustomerRecord): Customer {
  const { password: _password, ...customer } = record;
  void _password;
  return customer;
}

function issueSession(record: MockCustomerRecord): AuthSession {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return {
    customer: publicCustomer(record),
    accessToken: `demo.${record.id}.${expires}`,
    expiresAt: new Date(expires).toISOString(),
  };
}

function requireCustomer(token?: string | null): MockCustomerRecord {
  if (!token) throw apiError("unauthorized");
  const [prefix, id, expires] = token.split(".");
  if (prefix !== "demo" || !id) throw apiError("unauthorized");
  if (Number(expires) < Date.now()) throw apiError("session_expired");
  const customer = readDb().customers.find((c) => c.id === id);
  if (!customer) throw apiError("unauthorized");
  return customer;
}

function normalisePhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

export function login({ identifier, password }: LoginInput): AuthSession {
  const id = identifier.trim().toLowerCase();
  const phone = normalisePhone(id);
  const customer = readDb().customers.find(
    (c) => c.email.toLowerCase() === id || (phone.length === 10 && normalisePhone(c.phone) === phone),
  );
  if (!customer || customer.password !== password) {
    throw apiError("unauthorized", "The email/mobile number or password you entered is incorrect.");
  }
  return issueSession(customer);
}

export function register(input: RegisterInput): AuthSession {
  return mutateDb((db) => {
    const email = input.email.trim().toLowerCase();
    if (db.customers.some((c) => c.email.toLowerCase() === email)) {
      throw apiError("validation_error", "", { email: "An account with this email already exists." });
    }
    if (db.customers.some((c) => normalisePhone(c.phone) === normalisePhone(input.phone))) {
      throw apiError("validation_error", "", { phone: "An account with this mobile number already exists." });
    }
    const record: MockCustomerRecord = {
      id: `cus_${nextSequence(db)}`,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      phone: normalisePhone(input.phone),
      marketingOptIn: input.marketingOptIn,
      createdAt: new Date().toISOString(),
      password: input.password,
    };
    db.customers.push(record);
    db.addresses[record.id] = [];
    db.wishlists[record.id] = [];
    return issueSession(record);
  });
}

export function requestOtp({ phone }: OtpRequestInput) {
  const digits = normalisePhone(phone);
  if (digits.length !== 10) throw apiError("validation_error", "", { phone: "Enter a valid 10-digit mobile number." });
  mutateDb((db) => {
    db.otpCodes[digits] = DEMO_ACCOUNT.otp;
  });
  return { sent: true, expiresInSeconds: 300, demoCode: DEMO_ACCOUNT.otp };
}

export function verifyOtp({ phone, otp }: OtpVerifyInput): AuthSession {
  const digits = normalisePhone(phone);
  const db = readDb();
  if (db.otpCodes[digits] !== otp.trim()) {
    throw apiError("validation_error", "", { otp: "The code you entered is incorrect or has expired." });
  }
  const customer = db.customers.find((c) => normalisePhone(c.phone) === digits);
  if (!customer) {
    throw apiError("not_found", "No account is linked to this mobile number. Please create an account.");
  }
  return issueSession(customer);
}

export function requestPasswordReset(_email: string) {
  void _email;
  // Always succeed so the response never reveals whether an account exists.
  return { ok: true };
}

export function getProfile(token: string): Customer {
  return publicCustomer(requireCustomer(token));
}

export function updateProfile(token: string, patch: Partial<Pick<Customer, "firstName" | "lastName" | "phone" | "marketingOptIn">>) {
  const current = requireCustomer(token);
  return mutateDb((db) => {
    const record = db.customers.find((c) => c.id === current.id)!;
    Object.assign(record, patch);
    return publicCustomer(record);
  });
}

export function changePassword(token: string, currentPassword: string, newPassword: string) {
  const current = requireCustomer(token);
  if (current.password !== currentPassword) {
    throw apiError("validation_error", "", { currentPassword: "Your current password is incorrect." });
  }
  mutateDb((db) => {
    db.customers.find((c) => c.id === current.id)!.password = newPassword;
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Addresses                                                           */
/* ------------------------------------------------------------------ */

export function listAddresses(token: string): Address[] {
  const customer = requireCustomer(token);
  return readDb().addresses[customer.id] ?? [];
}

export function saveAddress(token: string, input: AddressInput & { id?: string }): Address[] {
  const customer = requireCustomer(token);
  return mutateDb((db) => {
    const list = (db.addresses[customer.id] ??= []);
    const makeDefault = input.isDefaultShipping || list.length === 0;
    if (makeDefault) list.forEach((a) => (a.isDefaultShipping = false));
    if (input.id) {
      const existing = list.find((a) => a.id === input.id);
      if (!existing) throw apiError("not_found");
      Object.assign(existing, input, { isDefaultShipping: makeDefault || existing.isDefaultShipping });
    } else {
      list.push({ ...input, id: `addr_${nextSequence(db)}`, isDefaultShipping: makeDefault });
    }
    return list;
  });
}

export function deleteAddress(token: string, id: string): Address[] {
  const customer = requireCustomer(token);
  return mutateDb((db) => {
    const list = (db.addresses[customer.id] ?? []).filter((a) => a.id !== id);
    if (list.length && !list.some((a) => a.isDefaultShipping)) list[0].isDefaultShipping = true;
    db.addresses[customer.id] = list;
    return list;
  });
}

/* ------------------------------------------------------------------ */
/* Orders & payments                                                   */
/* ------------------------------------------------------------------ */

export function listOrders(token: string): Order[] {
  const customer = requireCustomer(token);
  return readDb()
    .orders.filter((o) => o.customerId === customer.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(id: string, token?: string | null): Order {
  const order = readDb().orders.find((o) => o.id === id || o.orderNumber === id);
  if (!order) throw apiError("not_found");
  if (order.customerId && token) {
    const customer = requireCustomer(token);
    if (customer.id !== order.customerId) throw apiError("not_found");
  }
  return order;
}

export function createOrder(input: CreateOrderInput, token?: string | null): CreateOrderResponse {
  const customer = token ? requireCustomer(token) : null;
  const quote = quoteCart({ items: input.items, couponCode: input.couponCode });
  const blocking = quote.issues.filter((i) => i.type === "out_of_stock" || i.type === "unavailable");
  if (blocking.length || quote.items.length === 0) {
    throw apiError("out_of_stock", "Some pieces in your bag are no longer available. Please review your bag before paying.");
  }

  return mutateDb((db) => {
    const seq = nextSequence(db);
    const now = new Date();
    const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const order: Order & { customerId: string | null } = {
      id: `ord_${seq}`,
      orderNumber: `ORD-${stamp}-${seq}`,
      status: "new",
      customerId: customer?.id ?? null,
      customer: input.customer,
      items: quote.items.map((line) => ({
        id: `oi_${seq}_${line.lineId}`,
        productId: line.productId,
        slug: line.slug,
        name: line.product.name,
        sku: line.product.sku,
        image: line.product.images[0],
        metal: line.product.metal,
        purity: line.product.purity,
        size: line.size,
        customization: line.customization,
        grossWeight: line.product.grossWeight,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      totals: quote.totals,
      coupon: quote.coupon,
      payment: {
        id: `pay_${seq}`,
        provider: "demo",
        status: "pending",
        amount: quote.totals.grandTotal,
        providerOrderId: `order_demo_${seq}`,
      },
      timeline: [{ status: "new", at: now.toISOString() }],
      invoiceUrl: null,
      notes: input.notes,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    db.orders.unshift(order);
    return {
      order,
      paymentIntent: {
        provider: "demo",
        providerOrderId: order.payment.providerOrderId!,
        amount: order.totals.grandTotal,
        currency: "INR",
      },
    };
  });
}

/** Demo gateway: the signature "demo_valid_signature" represents a verified payment. */
export function verifyPayment(input: VerifyPaymentInput): Order {
  return mutateDb((db) => {
    const order = db.orders.find((o) => o.id === input.orderId);
    if (!order || order.payment.providerOrderId !== input.providerOrderId) throw apiError("not_found");
    const now = new Date().toISOString();
    if (input.signature !== "demo_valid_signature") {
      order.payment.status = "failed";
      order.updatedAt = now;
      throw apiError("payment_failed");
    }
    order.payment = { ...order.payment, status: "paid", providerPaymentId: input.providerPaymentId, method: "Demo payment", paidAt: now };
    order.status = "confirmed";
    order.timeline.push({ status: "confirmed", at: now });
    order.updatedAt = now;
    return order;
  });
}

export function markPaymentFailed(orderId: string): Order {
  return mutateDb((db) => {
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) throw apiError("not_found");
    order.payment.status = "failed";
    order.updatedAt = new Date().toISOString();
    return order;
  });
}

/* ------------------------------------------------------------------ */
/* Enquiries & newsletter                                              */
/* ------------------------------------------------------------------ */

export function submitEnquiry(input: EnquiryInput, token?: string | null): Enquiry {
  let customerId: string | null = null;
  if (token) {
    try {
      customerId = requireCustomer(token).id;
    } catch {
      customerId = null;
    }
  }
  return mutateDb((db) => {
    const seq = nextSequence(db);
    const enquiry = {
      ...input,
      id: `enq_${seq}`,
      reference: `ENQ-${seq}`,
      customerId,
      status: "new" as const,
      createdAt: new Date().toISOString(),
    };
    db.enquiries.unshift(enquiry);
    return enquiry;
  });
}

export function listEnquiries(token: string): Enquiry[] {
  const customer = requireCustomer(token);
  const db = readDb();
  return db.enquiries.filter(
    (e) => e.customerId === customer.id || e.email.toLowerCase() === customer.email.toLowerCase(),
  );
}

export function subscribeNewsletter(email: string) {
  return mutateDb((db) => {
    const normalised = email.trim().toLowerCase();
    const alreadySubscribed = db.newsletter.includes(normalised);
    if (!alreadySubscribed) db.newsletter.push(normalised);
    return { ok: true, alreadySubscribed };
  });
}

/* ------------------------------------------------------------------ */
/* Wishlist                                                            */
/* ------------------------------------------------------------------ */

function hydrateWishlist(items: WishlistItem[]): WishlistItem[] {
  return items.flatMap((item): WishlistItem[] => {
    const record = findRecord(item.productId);
    return record ? [{ ...item, product: toSummary(toProduct(record)) }] : [];
  });
}

export function getWishlist(token: string) {
  const customer = requireCustomer(token);
  return hydrateWishlist(readDb().wishlists[customer.id] ?? []);
}

export function addToWishlist(token: string, productId: string) {
  const customer = requireCustomer(token);
  return hydrateWishlist(
    mutateDb((db) => {
      const list = (db.wishlists[customer.id] ??= []);
      const record = findRecord(productId);
      if (!record) throw apiError("not_found");
      if (!list.some((i) => i.productId === record.id)) {
        list.unshift({ productId: record.id, slug: record.slug, addedAt: new Date().toISOString() });
      }
      return list;
    }),
  );
}

export function removeFromWishlist(token: string, productId: string) {
  const customer = requireCustomer(token);
  return hydrateWishlist(
    mutateDb((db) => {
      db.wishlists[customer.id] = (db.wishlists[customer.id] ?? []).filter((i) => i.productId !== productId);
      return db.wishlists[customer.id];
    }),
  );
}

export function mergeWishlist(token: string, items: WishlistItem[]) {
  const customer = requireCustomer(token);
  return hydrateWishlist(
    mutateDb((db) => {
      const list = (db.wishlists[customer.id] ??= []);
      for (const item of items) {
        if (!list.some((i) => i.productId === item.productId)) {
          list.push({ productId: item.productId, slug: item.slug, addedAt: item.addedAt });
        }
      }
      return list;
    }),
  );
}
