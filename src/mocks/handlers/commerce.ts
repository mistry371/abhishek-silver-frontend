import { lineIdFor, MAX_LINE_QUANTITY } from "@/lib/cart";
import { formatINR } from "@/lib/utils";
import type { AppliedCoupon, Cart, CartIssue, CartItem, CartItemInput, CartQuoteRequest } from "@/types/commerce";
import { demoCoupons } from "../data/content";
import { findRecord, resolveAvailability, resolvePricing, resolveVariant, sizeTables, toProduct, toSummary } from "./catalog";

/**
 * Server-authoritative cart quote. The client only sends product ids, sizes,
 * quantities and personalisation; every price, stock state and coupon result
 * is computed here — exactly as the real backend must do.
 */
export function quoteCart({ items, couponCode }: CartQuoteRequest): Cart {
  const issues: CartIssue[] = [];
  const lines: CartItem[] = [];

  // Normalise sizes first so identical lines merge.
  const merged = new Map<string, CartItemInput>();
  for (const input of items) {
    const record = findRecord(input.productId) ?? findRecord(input.slug);
    const size = record ? resolveVariant(record, input.size).size : input.size;
    const normalised = { ...input, size };
    const id = lineIdFor(normalised);
    const existing = merged.get(id);
    merged.set(id, existing ? { ...existing, quantity: existing.quantity + input.quantity } : normalised);
  }

  let productSavings = 0;
  let gst = 0;

  for (const [lineId, input] of merged) {
    const record = findRecord(input.productId) ?? findRecord(input.slug);
    if (!record) {
      issues.push({ lineId, type: "unavailable", message: "An item in your bag is no longer available and was removed." });
      continue;
    }
    const product = toProduct(record);
    const variant = resolveVariant(record, input.size);
    const pricing = resolvePricing(record, variant.netWeight);
    const availability = resolveAvailability(record, variant.size);
    const sizeLabel = record.sizing && variant.size ? sizeTables[record.sizing].label(variant.size) : null;

    const requested = Math.floor(Number(input.quantity)) || 1;
    const quantity = Math.min(Math.max(requested, 1), MAX_LINE_QUANTITY);
    if (quantity !== requested) {
      issues.push({ lineId, type: "quantity_adjusted", message: `${product.name}: quantity adjusted to ${quantity} (maximum per piece).` });
    }
    if (!availability.purchasable) {
      issues.push({
        lineId,
        type: availability.status === "unavailable" ? "unavailable" : "out_of_stock",
        message: `${product.name}${sizeLabel ? ` (${sizeLabel})` : ""} is currently out of stock.`,
      });
    }

    lines.push({
      ...input,
      quantity,
      lineId,
      product: { ...toSummary(product), pricing, finalPrice: pricing.finalPrice, netWeight: variant.netWeight, grossWeight: variant.grossWeight },
      unitPrice: pricing.finalPrice,
      lineTotal: pricing.finalPrice * quantity,
      availability,
    });

    if (availability.purchasable) {
      productSavings += (pricing.originalPrice - pricing.finalPrice) * quantity;
      gst += pricing.gst * quantity;
    }
  }

  const payable = lines.filter((line) => line.availability.purchasable);
  const subtotal = payable.reduce((sum, line) => sum + line.lineTotal, 0);

  let coupon: AppliedCoupon | null = null;
  if (couponCode) {
    const result = evaluateCoupon(couponCode, payable, subtotal);
    if (result.ok) coupon = result.coupon;
    else issues.push({ type: "coupon_invalid", message: result.message });
  }
  const couponDiscount = coupon?.discount ?? 0;

  return {
    items: lines,
    coupon,
    totals: {
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal,
      productSavings,
      couponDiscount,
      gst: subtotal > 0 ? Math.round(gst * (1 - couponDiscount / subtotal)) : 0,
      shipping: 0,
      grandTotal: Math.max(0, subtotal - couponDiscount),
    },
    issues,
    currency: "INR",
    quotedAt: new Date().toISOString(),
  };
}

function evaluateCoupon(
  code: string,
  lines: CartItem[],
  subtotal: number,
): { ok: true; coupon: AppliedCoupon } | { ok: false; message: string } {
  const normalised = code.trim().toUpperCase();
  const coupon = demoCoupons.find((c) => c.code === normalised);
  if (!coupon) return { ok: false, message: `The code “${normalised}” isn't valid.` };
  if (subtotal === 0) return { ok: false, message: "Add an available piece to your bag to use this code." };

  const slugs = coupon.appliesTo?.categorySlugs;
  const eligibleLines = slugs
    ? lines.filter((line) =>
        slugs.some((slug) =>
          slug === "silver-jewellery"
            ? line.product.metal === "silver"
            : slug === "gold-jewellery"
              ? line.product.metal === "gold"
              : line.product.category.slug === slug,
        ),
      )
    : lines;
  const eligibleTotal = eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0);

  if (eligibleTotal === 0) return { ok: false, message: `${coupon.code} doesn't apply to the pieces in your bag.` };
  if (coupon.minOrderValue && subtotal < coupon.minOrderValue) {
    return { ok: false, message: `${coupon.code} applies to orders of ${formatINR(coupon.minOrderValue)} or more.` };
  }

  let discount = coupon.type === "percentage" ? Math.round((eligibleTotal * coupon.value) / 100) : Math.min(coupon.value, eligibleTotal);
  if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);

  return { ok: true, coupon: { code: coupon.code, description: coupon.description, discount } };
}
