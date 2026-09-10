import { cn, formatINR } from "@/lib/utils";
import type { AppliedCoupon, CartTotals } from "@/types/commerce";

export function OrderTotals({
  totals,
  coupon,
  shippingLabel,
  className,
}: {
  totals: CartTotals;
  coupon?: AppliedCoupon | null;
  /** Shown instead of an amount before delivery details are known. */
  shippingLabel?: string;
  className?: string;
}) {
  return (
    <dl className={cn("space-y-3 type-body-sm", className)}>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">Subtotal ({totals.itemCount} {totals.itemCount === 1 ? "item" : "items"})</dt>
        <dd className="text-ink tabular-nums">{formatINR(totals.subtotal)}</dd>
      </div>
      {totals.productSavings > 0 && (
        <div className="flex justify-between gap-4 text-champagne-deep">
          <dt>Offer savings (included)</dt>
          <dd className="tabular-nums">{formatINR(totals.productSavings)}</dd>
        </div>
      )}
      {totals.couponDiscount > 0 && (
        <div className="flex justify-between gap-4 text-champagne-deep">
          <dt>Coupon{coupon ? ` (${coupon.code})` : ""}</dt>
          <dd className="tabular-nums">− {formatINR(totals.couponDiscount)}</dd>
        </div>
      )}
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">GST (included)</dt>
        <dd className="text-ink tabular-nums">{formatINR(totals.gst)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">Shipping</dt>
        <dd className="text-ink">{shippingLabel ?? (totals.shipping > 0 ? formatINR(totals.shipping) : "No charge")}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
        <dt className="type-caption tracking-[0.16em] text-ink">Grand Total</dt>
        <dd className="text-xl font-medium text-ink tabular-nums">{formatINR(totals.grandTotal)}</dd>
      </div>
    </dl>
  );
}
