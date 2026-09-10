import type { WishlistItem } from "@/types/commerce";
import type { Address, Customer, Enquiry, Order, OrderItem, OrderStatus } from "@/types/customer";
import { findRecord, resolvePricing, resolveVariant, toProduct } from "./handlers/catalog";

/**
 * MOCK DATABASE
 * ------------------------------------------------------------------
 * Customer-specific demo data (accounts, orders, addresses, enquiries).
 * Persisted to localStorage in the browser so flows survive reloads.
 * Replaced entirely by the Node.js backend in production.
 */

const STORAGE_KEY = "storefront-mockdb-v1";

export interface MockCustomerRecord extends Customer {
  password: string;
}

export interface MockDatabase {
  customers: MockCustomerRecord[];
  addresses: Record<string, Address[]>;
  orders: (Order & { customerId: string | null })[];
  enquiries: (Enquiry & { customerId: string | null })[];
  wishlists: Record<string, WishlistItem[]>;
  newsletter: string[];
  otpCodes: Record<string, string>;
  sequence: number;
}

export const DEMO_ACCOUNT = {
  email: "demo@example.com",
  password: "Demo@1234",
  phone: "9000000000",
  otp: "123456",
};

let memoryDb: MockDatabase | null = null;

function orderItem(slug: string, size?: string, quantity = 1): OrderItem {
  const record = findRecord(slug)!;
  const product = toProduct(record);
  const variant = resolveVariant(record, size);
  const pricing = resolvePricing(record, variant.netWeight);
  return {
    id: `oi_${record.id}_${variant.size ?? "x"}`,
    productId: record.id,
    slug: record.slug,
    name: record.name,
    sku: record.sku,
    image: product.images[0],
    metal: record.metal,
    purity: record.purity,
    size: variant.size,
    grossWeight: variant.grossWeight,
    quantity,
    unitPrice: pricing.finalPrice,
    lineTotal: pricing.finalPrice * quantity,
  };
}

function timeline(entries: [OrderStatus, string][]) {
  return entries.map(([status, at]) => ({ status, at }));
}

function seed(): MockDatabase {
  const customer: MockCustomerRecord = {
    id: "cus_demo",
    firstName: "Demo",
    lastName: "Customer",
    email: DEMO_ACCOUNT.email,
    phone: DEMO_ACCOUNT.phone,
    marketingOptIn: false,
    createdAt: "2026-03-01T10:00:00+05:30",
    password: DEMO_ACCOUNT.password,
  };

  const address: Address = {
    id: "addr_demo_home",
    label: "Home",
    fullName: "Demo Customer",
    phone: DEMO_ACCOUNT.phone,
    line1: "Demo address line 1",
    line2: "Demo area",
    city: "Surat",
    state: "Gujarat",
    postalCode: "395001",
    country: "India",
    isDefaultShipping: true,
    isDefaultBilling: true,
  };
  const { id: _ignored, ...addressInput } = address;
  void _ignored;

  const deliveredItems = [orderItem("twisted-gold-hoop-earrings"), orderItem("classic-rope-gold-chain", "20")];
  const shippedItems = [orderItem("sterling-solitaire-silver-ring", "12")];

  const totalsFor = (items: OrderItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    return {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      productSavings: 0,
      couponDiscount: 0,
      gst: Math.round(subtotal - subtotal / 1.03),
      shipping: 0,
      grandTotal: subtotal,
    };
  };

  const delivered: Order & { customerId: string } = {
    id: "ord_demo_1001",
    orderNumber: "ORD-2608-1001",
    status: "completed",
    customerId: customer.id,
    customer: { name: "Demo Customer", email: customer.email, phone: customer.phone },
    items: deliveredItems,
    shippingAddress: addressInput,
    billingAddress: addressInput,
    totals: totalsFor(deliveredItems),
    coupon: null,
    payment: {
      id: "pay_demo_1001",
      provider: "demo",
      status: "paid",
      method: "UPI",
      amount: totalsFor(deliveredItems).grandTotal,
      paidAt: "2026-08-02T11:04:00+05:30",
    },
    timeline: timeline([
      ["new", "2026-08-02T11:02:00+05:30"],
      ["confirmed", "2026-08-02T11:04:00+05:30"],
      ["processing", "2026-08-03T10:30:00+05:30"],
      ["packed", "2026-08-04T16:10:00+05:30"],
      ["shipped", "2026-08-05T12:00:00+05:30"],
      ["delivered", "2026-08-08T15:20:00+05:30"],
      ["completed", "2026-08-15T09:00:00+05:30"],
    ]),
    invoiceUrl: null,
    carrier: "Demo Courier",
    trackingNumber: "DEMO100200300",
    createdAt: "2026-08-02T11:02:00+05:30",
    updatedAt: "2026-08-15T09:00:00+05:30",
  };

  const inTransit: Order & { customerId: string } = {
    ...delivered,
    id: "ord_demo_1002",
    orderNumber: "ORD-2609-1002",
    status: "shipped",
    items: shippedItems,
    totals: totalsFor(shippedItems),
    payment: {
      id: "pay_demo_1002",
      provider: "demo",
      status: "paid",
      method: "Card",
      amount: totalsFor(shippedItems).grandTotal,
      paidAt: "2026-09-06T18:40:00+05:30",
    },
    timeline: timeline([
      ["new", "2026-09-06T18:38:00+05:30"],
      ["confirmed", "2026-09-06T18:40:00+05:30"],
      ["processing", "2026-09-07T10:15:00+05:30"],
      ["packed", "2026-09-08T17:45:00+05:30"],
      ["shipped", "2026-09-09T11:30:00+05:30"],
    ]),
    trackingNumber: "DEMO400500600",
    createdAt: "2026-09-06T18:38:00+05:30",
    updatedAt: "2026-09-09T11:30:00+05:30",
  };

  return {
    customers: [customer],
    addresses: { [customer.id]: [address] },
    orders: [inTransit, delivered],
    enquiries: [
      {
        id: "enq_demo_1",
        reference: "ENQ-1001",
        customerId: customer.id,
        type: "custom_jewellery",
        name: "Demo Customer",
        mobile: customer.phone,
        email: customer.email,
        message: "Looking for a pair of engraved couple bands for our anniversary.",
        jewelleryType: "Rings",
        budgetRange: "₹50,000 – ₹1,00,000",
        preferredMetal: "Gold",
        preferredPurity: "22KT",
        preferredContact: "whatsapp",
        status: "responded",
        createdAt: "2026-07-18T13:20:00+05:30",
      },
    ],
    wishlists: { [customer.id]: [] },
    newsletter: [],
    otpCodes: {},
    sequence: 1003,
  };
}

export function readDb(): MockDatabase {
  if (typeof window === "undefined") {
    memoryDb ??= seed();
    return memoryDb;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockDatabase;
  } catch {
    // Corrupt or unavailable storage — reseed below.
  }
  const db = seed();
  writeDb(db);
  return db;
}

export function writeDb(db: MockDatabase) {
  if (typeof window === "undefined") {
    memoryDb = db;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    memoryDb = db;
  }
}

export function mutateDb<T>(mutator: (db: MockDatabase) => T): T {
  const db = readDb();
  const result = mutator(db);
  writeDb(db);
  return result;
}

export function nextSequence(db: MockDatabase) {
  db.sequence += 1;
  return db.sequence;
}
