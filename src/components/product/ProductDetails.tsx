import { metalLabels, purityFineness, purityLabels } from "@/lib/catalog/filters";
import { cn, formatCarat, formatDate, formatINR, formatWeight } from "@/lib/utils";
import type { PriceBreakdown, Product } from "@/types/catalog";

/** Customer-safe price breakdown. Never renders purchase cost, margin or valuation. */
export function PriceBreakdownTable({
  pricing,
  netWeight,
  purityLabel,
  className,
}: {
  pricing: PriceBreakdown;
  netWeight: number;
  purityLabel: string;
  className?: string;
}) {
  const rows: { label: string; detail?: string; value: string; tone?: "discount" }[] = [
    {
      label: "Metal value",
      detail: `${purityLabel} · ${formatINR(pricing.metalRatePerGram)}/g × ${formatWeight(netWeight)}`,
      value: formatINR(pricing.metalValue),
    },
    { label: "Making charges", value: formatINR(pricing.makingCharges) },
  ];
  if (pricing.stoneCharges > 0) rows.push({ label: "Stone charges", value: formatINR(pricing.stoneCharges) });
  if (pricing.otherCharges > 0) rows.push({ label: "Other charges", value: formatINR(pricing.otherCharges) });
  if (pricing.discount > 0) rows.push({ label: "Discount", value: `− ${formatINR(pricing.discount)}`, tone: "discount" });
  rows.push({ label: `GST (${pricing.gstRate}%)`, value: formatINR(pricing.gst) });

  return (
    <div className={className}>
      <table className="w-full border-collapse type-body-sm">
        <caption className="sr-only">Price breakdown</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line">
              <th scope="row" className="py-3 pr-4 text-left font-normal text-ink-soft">
                {row.label}
                {row.detail && <span className="block text-[0.75rem] text-subtle">{row.detail}</span>}
              </th>
              <td className={cn("py-3 text-right tabular-nums", row.tone === "discount" ? "text-champagne-deep" : "text-ink")}>{row.value}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pt-4 text-left text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-ink">
              Final price
            </th>
            <td className="pt-4 text-right text-lg font-medium text-ink tabular-nums">{formatINR(pricing.finalPrice)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="mt-4 type-body-sm text-muted">
        {pricing.isEstimate ? "Estimated price — " : ""}
        {pricing.rateEffectiveAt ? `Based on the metal rate published ${formatDate(pricing.rateEffectiveAt)}. ` : ""}
        The final price is confirmed at checkout.
      </p>
    </div>
  );
}

export function SpecificationList({
  product,
  netWeight,
  grossWeight,
  size,
  className,
}: {
  product: Product;
  netWeight: number;
  grossWeight: number;
  size?: string;
  className?: string;
}) {
  const sizeLabel = size ? product.sizes.find((s) => s.value === size)?.label : undefined;
  const specs: { label: string; value: string }[] = [
    { label: "Metal", value: `${product.metal === "gold" ? purityLabels[product.purity] + " " : ""}${metalLabels[product.metal]}` },
    { label: "Purity", value: `${purityLabels[product.purity]} (${purityFineness[product.purity]})` },
    { label: "Gross weight", value: formatWeight(grossWeight) },
    { label: "Net weight", value: formatWeight(netWeight) },
  ];
  if (product.stoneWeight) specs.push({ label: "Stone weight", value: formatCarat(product.stoneWeight) });
  if (product.stoneDetails) specs.push({ label: "Stones", value: product.stoneDetails });
  specs.push({ label: "Making charges", value: formatINR(product.makingCharges) });
  if (sizeLabel) specs.push({ label: "Selected size", value: sizeLabel });
  specs.push({ label: "Category", value: product.subcategory ? `${product.category.name} · ${product.subcategory.name}` : product.category.name });
  if (product.collections.length) specs.push({ label: "Collection", value: product.collections.map((c) => c.name).join(", ") });
  specs.push({ label: "SKU", value: product.sku });

  return (
    <dl className={cn("grid grid-cols-1 border-t border-line sm:grid-cols-2", className)}>
      {specs.map((spec) => (
        <div key={spec.label} className="flex items-baseline justify-between gap-4 border-b border-line py-3 sm:flex-col sm:justify-start sm:gap-1 sm:odd:pr-6">
          <dt className="text-[0.6875rem] uppercase tracking-[0.16em] text-muted">{spec.label}</dt>
          <dd className="text-right type-body-sm text-ink sm:text-left">{spec.value}</dd>
        </div>
      ))}
    </dl>
  );
}
