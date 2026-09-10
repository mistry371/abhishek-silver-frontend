import type { CartItemInput } from "@/types/commerce";

/** Jewellery is high-value; the backend enforces its own per-line limit too. */
export const MAX_LINE_QUANTITY = 5;

/** Stable identity for a cart line: product + size + personalisation. */
export function lineIdFor(item: Pick<CartItemInput, "productId" | "size" | "customization">) {
  const custom = item.customization
    ? Object.entries(item.customization)
        .filter(([, value]) => value && value.trim() !== "")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value.trim()}`)
        .join("|")
    : "";
  return `${item.productId}::${item.size ?? "-"}::${custom}`;
}
