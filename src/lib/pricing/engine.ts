import type { MetalType, PriceBreakdown, ProductDiscount, PurityCode } from "@/types/catalog";

/**
 * JEWELLERY PRICE ENGINE (reference implementation)
 * ------------------------------------------------------------------
 * Metal Rate × Net Weight + Making + Stone + Other − Discount + GST = Selling Price
 *
 * The backend is the single source of truth for prices. This module is used
 * by the mock backend during frontend development and mirrors the contract
 * the Node.js price service is expected to implement. The storefront must
 * never treat a client-side result as final — see `reconcilePrice`.
 */

export interface MetalRateTable {
  gold: Partial<Record<Extract<PurityCode, "24k" | "22k" | "18k" | "14k">, number>>;
  silver: Partial<Record<Extract<PurityCode, "999" | "925">, number>>;
  effectiveAt: string;
}

export type MakingChargeRule =
  | { type: "per_gram"; value: number }
  | { type: "percentage"; value: number }
  | { type: "fixed"; value: number };

export interface PriceInput {
  metal: MetalType;
  purity: PurityCode;
  netWeight: number;
  making: MakingChargeRule;
  stoneCharges: number;
  otherCharges: number;
  discount?: ProductDiscount | null;
  gstRate: number;
}

const round = (value: number) => Math.round(value);

export function rateFor(rates: MetalRateTable, metal: MetalType, purity: PurityCode): number {
  const table = rates[metal] as Record<string, number | undefined>;
  const rate = table[purity];
  if (rate === undefined) {
    throw new Error(`No ${metal} rate configured for purity ${purity}`);
  }
  return rate;
}

export function calculatePrice(input: PriceInput, rates: MetalRateTable): PriceBreakdown {
  const metalRatePerGram = rateFor(rates, input.metal, input.purity);
  const metalValue = round(metalRatePerGram * input.netWeight);

  const makingCharges = round(
    input.making.type === "per_gram"
      ? input.making.value * input.netWeight
      : input.making.type === "percentage"
        ? (metalValue * input.making.value) / 100
        : input.making.value,
  );

  const subtotal = metalValue + makingCharges + input.stoneCharges + input.otherCharges;

  const discount = input.discount
    ? round(
        input.discount.type === "percentage"
          ? (subtotal * input.discount.value) / 100
          : Math.min(input.discount.value, subtotal),
      )
    : 0;

  const taxableValue = subtotal - discount;
  const gst = round((taxableValue * input.gstRate) / 100);
  const finalPrice = taxableValue + gst;
  const originalPrice = subtotal + round((subtotal * input.gstRate) / 100);

  return {
    currency: "INR",
    metalRatePerGram,
    metalValue,
    makingCharges,
    stoneCharges: input.stoneCharges,
    otherCharges: input.otherCharges,
    discount,
    originalPrice,
    taxableValue,
    gstRate: input.gstRate,
    gst,
    finalPrice,
    rateEffectiveAt: rates.effectiveAt,
    isEstimate: false,
  };
}

/**
 * Compare a displayed (possibly client-estimated) price against the server's
 * authoritative response. The server value always wins.
 */
export function reconcilePrice(displayed: PriceBreakdown | null, authoritative: PriceBreakdown) {
  const changed = displayed !== null && displayed.finalPrice !== authoritative.finalPrice;
  return { price: { ...authoritative, isEstimate: false }, changed };
}
