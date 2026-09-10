"use client";

import { useId, useState, type ReactNode } from "react";
import { CheckboxInput, controlClass, TextArea } from "@/components/admin/fields";
import { InlineAlert, StatusBadge } from "@/components/admin/ui";
import { CloseIcon, SearchIcon } from "@/components/icons";
import type { AdminApiError, ImageAsset, Paginated } from "@/lib/admin/client";
import { humanize, metalLabels, money, number as formatNumber, purityLabels } from "@/lib/admin/format";
import { useAdminResource, useDebouncedValue } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

export type Metal = "gold" | "silver";
export type Purity = "24k" | "22k" | "18k" | "14k" | "999" | "925";
export type MakingType = "per_gram" | "percentage" | "fixed";
export type DiscountType = "percentage" | "fixed";
export type TargetScope = "all" | "categories" | "products" | "collections" | "metal";

export const METALS: Metal[] = ["gold", "silver"];
export const PURITIES_BY_METAL: Record<Metal, Purity[]> = { gold: ["24k", "22k", "18k", "14k"], silver: ["999", "925"] };

export interface MetalRateRow {
  metal: Metal;
  purity: Purity;
  label: string;
  ratePerGram: number | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface ChargeRate {
  id: string;
  name: string;
  kind: "stone" | "other";
  unit: "per_carat" | "per_piece" | "fixed";
  rate: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RunningOfferDiscount {
  offerId: string;
  title: string;
  discount: { type: DiscountType; value: number };
  target: { scope: TargetScope; ids: string[] };
  endsAt: string | null;
}

export interface PricingOverview {
  rates: MetalRateRow[];
  gst: { rate: number | null; updatedBy: string | null; updatedAt: string | null };
  makingDefaults: { categoryId: string; categoryName: string; type: MakingType | null; value: number | null }[];
  chargeRates: ChargeRate[];
  runningOfferDiscounts: RunningOfferDiscount[];
}

export interface ProductOption {
  id: string;
  name: string;
  sku: string;
  image: ImageAsset | null;
  category: { id: string; name: string };
  metal: Metal;
  purity: Purity;
  netWeight: number;
  status: string;
}

export interface CategoryOption {
  id: string;
  slug: string;
  name: string;
  group: string;
  active: boolean;
}

export interface CollectionOption {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

export const metalOptions = METALS.map((metal) => ({ value: metal, label: metalLabels[metal] ?? humanize(metal) }));

export const makingTypeOptions: { value: MakingType; label: string }[] = [
  { value: "per_gram", label: "Per gram (₹/g)" },
  { value: "percentage", label: "% of metal value" },
  { value: "fixed", label: "Fixed amount (₹)" },
];

export const discountTypeOptions: { value: DiscountType; label: string }[] = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "fixed", label: "Fixed amount (₹)" },
];

export const metalPurityLabel = (metal: string, purity: string) => `${metalLabels[metal] ?? humanize(metal)} · ${purityLabels[purity] ?? purity}`;

export function makingLabel(type: MakingType | string | null | undefined, value: number | string | null | undefined) {
  if (!type || value === null || value === undefined || value === "") return "Not set";
  const amount = Number(value);
  if (type === "per_gram") return `${money(amount)}/g`;
  if (type === "percentage") return `${formatNumber(amount)}% of metal value`;
  return money(amount);
}

export function discountLabel(discount: { type: string; value: number | string } | null | undefined) {
  if (!discount) return "—";
  return discount.type === "percentage" ? `${formatNumber(discount.value)}% off` : `${money(discount.value)} off`;
}

export function targetSummary(target: { scope: string; ids: string[] }, names?: Record<string, string>) {
  const { scope, ids } = target;
  if (scope === "all") return "All products";
  if (scope === "metal") return ids.map((id) => metalLabels[id] ?? humanize(id)).join(", ") || "No metal chosen";
  const named = names ? ids.map((id) => names[id]).filter(Boolean) : [];
  if (named.length === ids.length && ids.length > 0 && ids.length <= 3) return named.join(", ");
  const noun = scope === "categories" ? "category" : scope === "collections" ? "collection" : "product";
  const plural = scope === "categories" ? "categories" : `${noun}s`;
  return `${ids.length} ${ids.length === 1 ? noun : plural}`;
}

/* ------------------------------------------------------------------ */
/* Dates (datetime-local ⇄ ISO in IST)                                  */
/* ------------------------------------------------------------------ */

const istParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ISO timestamp → `YYYY-MM-DDTHH:mm` in IST for a datetime-local input. */
export function isoToIstInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts: Record<string, string> = {};
  for (const part of istParts.formatToParts(date)) parts[part.type] = part.value;
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** datetime-local value (entered as IST) → ISO with the IST offset, or null when empty. */
export const istInputToIso = (value: string) => (value ? `${value}:00+05:30` : null);

/** Returns an error message when the end isn't after the start. */
export function windowError(startsAt: string, endsAt: string) {
  if (!startsAt || !endsAt) return undefined;
  return Date.parse(`${endsAt}:00+05:30`) <= Date.parse(`${startsAt}:00+05:30`) ? "The end must be after the start." : undefined;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/** Field error for `key`, or the first nested one (`key.something`). */
export function pickError(errors: Record<string, string | undefined>, key: string) {
  if (errors[key]) return errors[key];
  const nested = Object.keys(errors).find((name) => name.startsWith(`${key}.`) && errors[name]);
  return nested ? errors[nested] : undefined;
}

export function MutationAlert({ error, className }: { error: AdminApiError | null | undefined; className?: string }) {
  if (!error) return null;
  return <InlineAlert className={className}>{error.fieldErrors?._form ?? error.message}</InlineAlert>;
}

/* ------------------------------------------------------------------ */
/* Reason field (required for every pricing change)                     */
/* ------------------------------------------------------------------ */

export function ReasonField({ value, onChange, error, disabled, className }: { value: string; onChange: (value: string) => void; error?: string; disabled?: boolean; className?: string }) {
  return (
    <div className={cn("border-l-2 border-champagne-deep bg-champagne-mist/40 p-4 sm:col-span-2", className)}>
      <TextArea
        label="Reason for this change"
        required
        rows={2}
        maxLength={300}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        placeholder="e.g. Morning bullion rate update from the association board"
        hint="Required. Saved with the change in price history and the audit log."
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pickers                                                             */
/* ------------------------------------------------------------------ */

export function CheckboxGroup({
  label,
  options,
  value,
  onChange,
  error,
  hint,
  disabled,
  className,
}: {
  label: ReactNode;
  options: { value: string; label: string; description?: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <fieldset className={cn("min-w-0", className)} disabled={disabled}>
      <legend className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">{label}</legend>
      {options.length === 0 ? (
        <p className="border border-dashed border-line px-3 py-4 text-center text-[0.8125rem] text-muted">Nothing to choose from yet.</p>
      ) : (
        <div className={cn("grid max-h-56 gap-2.5 overflow-y-auto border bg-porcelain p-3 sm:grid-cols-2", error ? "border-danger" : "border-line")}>
          {options.map((option) => (
            <CheckboxInput
              key={option.value}
              label={option.label}
              description={option.description}
              checked={value.includes(option.value)}
              onChange={(event) => onChange(event.target.checked ? [...value, option.value] : value.filter((item) => item !== option.value))}
            />
          ))}
        </div>
      )}
      {hint && !error && <p className="mt-1 text-[0.75rem] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Type-ahead product search against `GET /products?q=`. */
export function ProductSearch({
  label = "Find a product",
  onPick,
  excludeIds = [],
  error,
  hint,
  disabled,
}: {
  label?: ReactNode;
  onPick: (product: ProductOption) => void;
  excludeIds?: string[];
  error?: string;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const q = useDebouncedValue(text.trim(), 300);
  const { data, loading, error: loadError } = useAdminResource<Paginated<ProductOption>>(q ? "/products" : null, { q, pageSize: 8 });
  const results = data?.items.filter((item) => !excludeIds.includes(item.id)) ?? [];
  const settling = q !== text.trim();

  return (
    <div className="flex min-w-0 flex-col">
      <label htmlFor={id} className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id={id}
          type="search"
          autoComplete="off"
          value={text}
          disabled={disabled}
          placeholder="Search by name, SKU or barcode"
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter") event.preventDefault();
          }}
          className={controlClass(error, "h-10 pl-9")}
        />
        {open && text.trim() && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto border border-line bg-porcelain shadow-[0_18px_40px_-20px_rgb(20_18_16/0.35)]">
            {loadError ? (
              <p className="px-3 py-3 text-[0.8125rem] text-danger">{loadError.message}</p>
            ) : settling || (loading && !data) ? (
              <p className="px-3 py-3 text-[0.8125rem] text-muted">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-3 text-[0.8125rem] text-muted">No products match “{q}”.</p>
            ) : (
              <ul className="divide-y divide-line">
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onPick(item);
                        setText("");
                        setOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-cream"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] text-ink">{item.name}</span>
                        <span className="block truncate text-[0.75rem] text-muted">
                          {item.sku} · {metalPurityLabel(item.metal, item.purity)}
                        </span>
                      </span>
                      <StatusBadge status={item.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {hint && !error && <p className="mt-1 text-[0.75rem] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function ProductName({ id, known }: { id: string; known?: string }) {
  const { data, error } = useAdminResource<{ name: string; sku: string }>(known ? null : `/products/${id}`);
  if (known) return <>{known}</>;
  if (data) return <>{`${data.name} (${data.sku})`}</>;
  if (error) return <span className="text-muted">{error.status === 404 ? "Deleted product" : `Product ${id.slice(0, 8)}…`}</span>;
  return <span className="text-muted">Loading…</span>;
}

/** Selected products shown as removable chips; names resolve lazily. */
export function ProductChips({ ids, known, onRemove, disabled }: { ids: string[]; known: Record<string, string>; onRemove: (id: string) => void; disabled?: boolean }) {
  if (!ids.length) return <p className="text-[0.75rem] text-muted">No products selected.</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {ids.map((id) => (
        <li key={id} className="inline-flex max-w-full items-center gap-1.5 border border-line bg-cream py-1 pl-2.5 pr-1 text-[0.75rem] text-ink">
          <span className="truncate">
            <ProductName id={id} known={known[id]} />
          </span>
          <button type="button" disabled={disabled} onClick={() => onRemove(id)} className="p-0.5 text-muted hover:text-ink disabled:opacity-40" aria-label="Remove product">
            <CloseIcon size={13} />
          </button>
        </li>
      ))}
    </ul>
  );
}
