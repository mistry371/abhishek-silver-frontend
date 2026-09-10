"use client";

import { useState, type FormEvent } from "react";
import { NumberInput, SelectInput, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, EmptyNote, InlineAlert, KeyValue, LoadingBlock, Panel } from "@/components/admin/ui";
import { adminApi } from "@/lib/admin/client";
import { formatDate, metalLabels, money, percent, purityLabels, weight } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";
import {
  discountLabel,
  discountTypeOptions,
  makingLabel,
  makingTypeOptions,
  metalOptions,
  metalPurityLabel,
  MutationAlert,
  pickError,
  ProductSearch,
  PURITIES_BY_METAL,
  type DiscountType,
  type MakingType,
  type Metal,
  type PricingOverview,
  type ProductOption,
  type Purity,
} from "./shared";

interface ProductDetail {
  id: string;
  name: string;
  sku: string;
  metal: Metal;
  purity: Purity;
  netWeight: number;
  sizeOptions: string[];
  defaultSize: string | null;
  sizeWeights: Record<string, number>;
  makingType: MakingType;
  makingValue: number;
  stoneCharges: number;
  otherCharges: number;
  discount: { type: DiscountType; value: number; label?: string; endsAt?: string } | null;
}

interface Breakdown {
  metalRatePerGram: number;
  metalValue: number;
  makingCharges: number;
  stoneCharges: number;
  otherCharges: number;
  discount: number;
  originalPrice: number;
  taxableValue: number;
  gstRate: number;
  gst: number;
  finalPrice: number;
}

interface PricedResult {
  pricing: Breakdown;
  discount: { type: DiscountType; value: number; label?: string; endsAt?: string } | null;
}

interface PreviewResponse {
  netWeight: number;
  proposed: PricedResult;
  current: PricedResult | null;
}

interface PreviewBody {
  productId?: string;
  size?: string;
  metal?: Metal;
  purity?: Purity;
  netWeight?: number;
  makingType?: MakingType;
  makingValue?: number;
  stoneCharges?: number;
  otherCharges?: number;
  discount?: { type: DiscountType; value: number } | null;
  gstRate?: number;
  rateOverrides?: { metal: Metal; purity: Purity; ratePerGram: number }[];
}

type DiscountMode = "auto" | "none" | "custom";

const LINES: { key: keyof Breakdown; label: string; tone?: "minus" | "subtotal" | "total" }[] = [
  { key: "metalRatePerGram", label: "Metal rate (per gram)" },
  { key: "metalValue", label: "Metal value" },
  { key: "makingCharges", label: "Making charges" },
  { key: "stoneCharges", label: "Stone charges" },
  { key: "otherCharges", label: "Other charges" },
  { key: "originalPrice", label: "Price before discount (incl. GST)" },
  { key: "discount", label: "Discount", tone: "minus" },
  { key: "taxableValue", label: "Taxable value", tone: "subtotal" },
  { key: "gst", label: "GST" },
  { key: "finalPrice", label: "Final price", tone: "total" },
];

function signedMoney(value: number) {
  if (Math.abs(value) < 0.005) return "No change";
  return `${value > 0 ? "+" : "−"}${money(Math.abs(value))}`;
}

const rateKey = (metal: string, purity: string) => `${metal}:${purity}`;

export function PreviewTab({ overview }: { overview: PricingOverview }) {
  const [mode, setMode] = useState<"product" | "manual">("product");
  const [product, setProduct] = useState<ProductOption | null>(null);
  const [size, setSize] = useState("");
  const [manual, setManual] = useState<{ metal: Metal; purity: Purity; netWeight: string; makingType: MakingType; makingValue: string }>({
    metal: "silver",
    purity: "925",
    netWeight: "",
    makingType: "per_gram",
    makingValue: "",
  });
  const [stoneCharges, setStoneCharges] = useState("");
  const [otherCharges, setOtherCharges] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("auto");
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [gstRate, setGstRate] = useState("");
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ key: string; data: PreviewResponse } | null>(null);

  const detail = useAdminResource<ProductDetail>(mode === "product" && product ? `/products/${product.id}` : null);
  const mutation = useMutation((body: PreviewBody) => adminApi.post<PreviewResponse>("/pricing/preview", body));

  /* Build the request from the current inputs (pure, runs every render). */
  const body: PreviewBody = {};
  const requestErrors: Record<string, string> = {};
  if (mode === "product") {
    if (!product) requestErrors.productId = "Choose a product to preview.";
    else {
      body.productId = product.id;
      if (size) body.size = size;
    }
  } else {
    body.metal = manual.metal;
    body.purity = manual.purity;
    const netWeight = toNumberOrNull(manual.netWeight);
    if (netWeight === null || netWeight <= 0 || netWeight > 10_000) requestErrors.netWeight = "Enter a net weight above 0 and up to 10,000 g.";
    else body.netWeight = netWeight;
    body.makingType = manual.makingType;
    const makingValue = toNumberOrNull(manual.makingValue);
    if (makingValue === null || makingValue < 0 || makingValue > 10_000_000) requestErrors.makingValue = "Enter 0 or more.";
    else body.makingValue = makingValue;
  }
  for (const [key, raw] of [
    ["stoneCharges", stoneCharges],
    ["otherCharges", otherCharges],
  ] as const) {
    if (!raw.trim()) continue;
    const value = toNumberOrNull(raw);
    if (value === null || value < 0 || value > 100_000_000) requestErrors[key] = "Enter 0 or more.";
    else body[key] = value;
  }
  if (discountMode === "none") body.discount = null;
  if (discountMode === "custom") {
    const value = toNumberOrNull(discountValue);
    if (value === null || value <= 0) requestErrors["discount.value"] = "Enter a discount above 0.";
    else body.discount = { type: discountType, value };
  }
  if (gstRate.trim()) {
    const value = toNumberOrNull(gstRate);
    if (value === null || value < 0 || value > 28) requestErrors.gstRate = "GST must be between 0% and 28%.";
    else body.gstRate = value;
  }
  const rateOverrides = overview.rates.flatMap((row) => {
    const raw = overrides[rateKey(row.metal, row.purity)] ?? "";
    if (!raw.trim()) return [];
    const value = toNumberOrNull(raw);
    if (value === null || value <= 0 || value > 1_000_000) {
      requestErrors[`override:${rateKey(row.metal, row.purity)}`] = "Enter a rate above ₹0.";
      return [];
    }
    return [{ metal: row.metal, purity: row.purity, ratePerGram: value }];
  });
  if (rateOverrides.length) body.rateOverrides = rateOverrides;
  const requestKey = JSON.stringify(body);

  const errors: Record<string, string | undefined> = { ...mutation.fieldErrors, ...localErrors };
  const stale = Boolean(result && result.key !== requestKey);

  async function run(event: FormEvent) {
    event.preventDefault();
    setLocalErrors(requestErrors);
    if (Object.keys(requestErrors).length) return;
    const response = await mutation.run(body);
    if (response) setResult({ key: requestKey, data: response });
  }

  const sizeOptions = detail.data?.sizeOptions ?? [];
  const serverOnlyMessage = mutation.error && !Object.keys(mutation.fieldErrors).some((key) => key !== "_form") ? mutation.error : null;

  return (
    <div className="space-y-5">
      <InlineAlert tone="info">
        <strong className="font-medium">Preview — the server’s price engine calculates live prices.</strong> Nothing here is saved or shown to customers.
      </InlineAlert>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={run} className="space-y-5" noValidate>
          <Panel title="What to price">
            <div className="mb-4 inline-flex border border-line" role="group" aria-label="Preview source">
              {(
                [
                  ["product", "Existing product"],
                  ["manual", "Enter details"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={cn("px-4 py-2 text-[0.8125rem] transition-colors", mode === value ? "bg-ink text-ivory" : "bg-porcelain text-ink-soft hover:text-ink")}
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "product" ? (
              product ? (
                <div className="border border-line bg-ivory p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{product.name}</p>
                      <p className="text-[0.75rem] text-muted">
                        {product.sku} · {metalPurityLabel(product.metal, product.purity)}
                      </p>
                    </div>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setProduct(null);
                        setSize("");
                      }}
                    >
                      Change
                    </AdminButton>
                  </div>
                  {detail.error ? (
                    <InlineAlert className="mt-3">{detail.error.message}</InlineAlert>
                  ) : !detail.data ? (
                    <LoadingBlock rows={2} className="mt-3" />
                  ) : (
                    <div className="mt-4 space-y-4">
                      <KeyValue
                        items={[
                          { label: "Net weight", value: weight(size && detail.data.sizeWeights[size] !== undefined ? detail.data.sizeWeights[size] : detail.data.netWeight) },
                          { label: "Making", value: makingLabel(detail.data.makingType, detail.data.makingValue) },
                          { label: "Stone charges", value: money(detail.data.stoneCharges) },
                          { label: "Other charges", value: money(detail.data.otherCharges) },
                          {
                            label: "Product discount",
                            value: detail.data.discount ? `${discountLabel(detail.data.discount)}${detail.data.discount.endsAt ? ` until ${formatDate(detail.data.discount.endsAt)}` : ""}` : "None",
                          },
                        ]}
                      />
                      {sizeOptions.length > 0 && (
                        <SelectInput
                          label="Size"
                          value={size}
                          onChange={(event) => setSize(event.target.value)}
                          placeholder={`Default size (${detail.data.defaultSize ?? sizeOptions[0]})`}
                          options={sizeOptions.map((option) => ({
                            value: option,
                            label: detail.data?.sizeWeights[option] !== undefined ? `${option} · ${weight(detail.data.sizeWeights[option])}` : option,
                          }))}
                          error={errors.size}
                          containerClassName="max-w-xs"
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <ProductSearch
                  onPick={(picked) => {
                    setProduct(picked);
                    setSize("");
                  }}
                  error={errors.productId}
                />
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectInput
                  label="Metal"
                  required
                  options={metalOptions}
                  value={manual.metal}
                  onChange={(event) => {
                    const metal = event.target.value as Metal;
                    setManual({ ...manual, metal, purity: PURITIES_BY_METAL[metal][0]! });
                  }}
                  error={errors.metal}
                />
                <SelectInput
                  label="Purity"
                  required
                  options={PURITIES_BY_METAL[manual.metal].map((purity) => ({ value: purity, label: purityLabels[purity] ?? purity }))}
                  value={manual.purity}
                  onChange={(event) => setManual({ ...manual, purity: event.target.value as Purity })}
                  error={errors.purity}
                />
                <NumberInput label="Net weight (g)" required min={0} step="0.001" value={manual.netWeight} onChange={(event) => setManual({ ...manual, netWeight: event.target.value })} error={errors.netWeight} />
                <div className="hidden sm:block" />
                <SelectInput
                  label="Making charged as"
                  required
                  options={makingTypeOptions}
                  value={manual.makingType}
                  onChange={(event) => setManual({ ...manual, makingType: event.target.value as MakingType })}
                  error={errors.makingType}
                />
                <NumberInput
                  label={manual.makingType === "percentage" ? "Making (%)" : manual.makingType === "per_gram" ? "Making (₹ per gram)" : "Making (₹)"}
                  required
                  min={0}
                  step="0.01"
                  value={manual.makingValue}
                  onChange={(event) => setManual({ ...manual, makingValue: event.target.value })}
                  error={errors.makingValue}
                />
              </div>
            )}
          </Panel>

          <Panel title="What-if overrides" description="Optional. Leave blank to use the product’s values and the live settings.">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput label="Stone charges (₹)" min={0} step="0.01" value={stoneCharges} onChange={(event) => setStoneCharges(event.target.value)} error={errors.stoneCharges} />
              <NumberInput label="Other charges (₹)" min={0} step="0.01" value={otherCharges} onChange={(event) => setOtherCharges(event.target.value)} error={errors.otherCharges} />
              <SelectInput
                label="Discount"
                value={discountMode}
                onChange={(event) => setDiscountMode(event.target.value as DiscountMode)}
                options={[
                  { value: "auto", label: "Automatic (product discount & running offers)" },
                  { value: "none", label: "No discount" },
                  { value: "custom", label: "Test a discount" },
                ]}
                containerClassName="sm:col-span-2"
              />
              {discountMode === "custom" && (
                <>
                  <SelectInput label="Discount type" options={discountTypeOptions} value={discountType} onChange={(event) => setDiscountType(event.target.value as DiscountType)} />
                  <NumberInput
                    label={discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}
                    min={0}
                    step="0.01"
                    value={discountValue}
                    onChange={(event) => setDiscountValue(event.target.value)}
                    error={pickError(errors, "discount")}
                  />
                </>
              )}
              <NumberInput
                label="GST rate (%)"
                min={0}
                max={28}
                step="0.01"
                value={gstRate}
                placeholder={overview.gst.rate === null ? "Not set" : String(overview.gst.rate)}
                onChange={(event) => setGstRate(event.target.value)}
                error={errors.gstRate}
                hint={`Live: ${overview.gst.rate === null ? "not set (0%)" : percent(overview.gst.rate)}`}
              />
            </div>

            <fieldset className="mt-5 border-t border-line pt-4">
              <legend className="sr-only">Proposed metal rates</legend>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[0.75rem] font-medium text-ink-soft">Proposed metal rates (₹ per gram)</p>
                {Object.values(overrides).some((value) => value.trim()) && (
                  <AdminButton size="sm" variant="ghost" onClick={() => setOverrides({})}>
                    Clear
                  </AdminButton>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {overview.rates.map((row) => {
                  const key = rateKey(row.metal, row.purity);
                  return (
                    <NumberInput
                      key={key}
                      label={`${metalLabels[row.metal] ?? row.metal} · ${row.label}`}
                      min={0}
                      step="0.01"
                      value={overrides[key] ?? ""}
                      placeholder={row.ratePerGram === null ? "Not set" : String(row.ratePerGram)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setOverrides((current) => ({ ...current, [key]: value }));
                      }}
                      error={errors[`override:${key}`]}
                    />
                  );
                })}
              </div>
              {pickError(errors, "rateOverrides") && (
                <p role="alert" className="mt-2 text-[0.75rem] text-danger">
                  {pickError(errors, "rateOverrides")}
                </p>
              )}
            </fieldset>
          </Panel>

          <MutationAlert error={serverOnlyMessage} />
          <div className="flex justify-end">
            <AdminButton variant="primary" type="submit" loading={mutation.pending}>
              Calculate preview
            </AdminButton>
          </div>
        </form>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Panel title="Price breakdown" description={result ? `Net weight ${weight(result.data.netWeight)}` : undefined} flush>
            {!result ? (
              <EmptyNote title="No preview yet" description="Choose a product or enter details, add any what-if changes, then calculate." />
            ) : (
              <PreviewResult data={result.data} stale={stale} />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function PreviewResult({ data, stale }: { data: PreviewResponse; stale: boolean }) {
  const { current, proposed } = data;
  const hasCurrent = current !== null;
  return (
    <div className={cn("transition-opacity", stale && "opacity-60")}>
      {stale && <InlineAlert tone="warning" className="border-x-0 border-t-0">Inputs have changed since this preview. Calculate again to refresh it.</InlineAlert>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.8125rem]">
          <thead>
            <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Component
              </th>
              {hasCurrent && (
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Current
                </th>
              )}
              <th scope="col" className="px-4 py-2.5 text-right font-medium">
                {hasCurrent ? "Proposed" : "Preview"}
              </th>
              {hasCurrent && (
                <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                  Difference
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {LINES.map((line) => {
              const next = proposed.pricing[line.key];
              const before = current?.pricing[line.key];
              const format = (value: number) => (line.tone === "minus" && value > 0 ? `−${money(value)}` : money(value));
              return (
                <tr key={line.key} className={cn("border-b border-line last:border-0", line.tone === "total" && "bg-champagne-mist/40", line.tone === "subtotal" && "bg-cream/40")}>
                  <th scope="row" className={cn("px-4 py-2.5 text-left font-normal text-ink-soft", line.tone === "total" && "font-medium text-ink")}>
                    {line.label}
                  </th>
                  {hasCurrent && (
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                      {before === undefined ? "—" : format(before)}
                      {line.key === "gst" && current && <span className="block text-[0.6875rem] text-muted">at {percent(current.pricing.gstRate)}</span>}
                    </td>
                  )}
                  <td className={cn("px-4 py-2.5 text-right tabular-nums text-ink", line.tone === "total" && "text-[0.9375rem] font-medium")}>
                    {format(next)}
                    {line.key === "gst" && <span className="block text-[0.6875rem] text-muted">at {percent(proposed.pricing.gstRate)}</span>}
                  </td>
                  {hasCurrent && (
                    <td className="hidden px-4 py-2.5 text-right tabular-nums text-ink-soft sm:table-cell">{before === undefined ? "—" : signedMoney(next - before)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-1 border-t border-line px-4 py-3 text-[0.75rem] text-muted">
        {hasCurrent && <p>Current discount: {current.discount ? `${current.discount.label ? `${current.discount.label} — ` : ""}${discountLabel(current.discount)}` : "none"}</p>}
        <p>
          {hasCurrent ? "Proposed" : "Applied"} discount: {proposed.discount ? `${proposed.discount.label ? `${proposed.discount.label} — ` : ""}${discountLabel(proposed.discount)}` : "none"}
        </p>
        <p>Customers get the single best discount available; discounts aren’t combined.</p>
      </div>
    </div>
  );
}
