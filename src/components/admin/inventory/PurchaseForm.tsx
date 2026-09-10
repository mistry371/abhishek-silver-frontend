"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { FormSection, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { TrashIcon } from "@/components/admin/icons";
import { AdminButton, InlineAlert, Panel } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { AdminApiError, adminApi, errorMessage, type Paginated } from "@/lib/admin/client";
import { money, number, puritiesByMetal, todayIst, weight } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";
import { metalOptions, purityOptions } from "./options";
import { ProductPicker } from "./ProductPicker";
import type { ProductOption, PurchaseDetail, StockLocation, VendorListItem } from "./types";

interface HeaderDraft {
  vendorId: string;
  vendorInvoiceRef: string;
  purchaseDate: string;
  receivingLocationId: string;
  taxAmount: string;
  notes: string;
}

interface LineDraft {
  key: string;
  productId: string;
  productLabel: string;
  description: string;
  sku: string;
  metal: string;
  purity: string;
  quantity: string;
  grossWeight: string;
  netWeight: string;
  ratePerGram: string;
  makingCharges: string;
  otherCharges: string;
}

const MAX_LINES = 200;
const LINE_FIELDS = ["productId", "description", "sku", "metal", "purity", "quantity", "grossWeight", "netWeight", "ratePerGram", "makingCharges", "otherCharges"];
const HEADER_FIELDS = ["vendorId", "vendorInvoiceRef", "purchaseDate", "receivingLocationId", "taxAmount", "notes"];
const LINE_ERROR = new RegExp(`^items\\.\\d+\\.(${LINE_FIELDS.join("|")})$`);

const str = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value));
const round2 = (value: number) => Math.round(value * 100) / 100;
const isNonNegative = (value: string) => {
  const parsed = toNumberOrNull(value);
  return parsed !== null && parsed >= 0;
};

function emptyLine(key: string): LineDraft {
  return { key, productId: "", productLabel: "", description: "", sku: "", metal: "", purity: "", quantity: "1", grossWeight: "", netWeight: "", ratePerGram: "", makingCharges: "", otherCharges: "" };
}

function initialState(purchase: PurchaseDetail | undefined, vendorId: string | undefined): { header: HeaderDraft; lines: LineDraft[] } {
  if (!purchase) {
    return { header: { vendorId: vendorId ?? "", vendorInvoiceRef: "", purchaseDate: todayIst(), receivingLocationId: "", taxAmount: "", notes: "" }, lines: [emptyLine("line-0")] };
  }
  return {
    header: {
      vendorId: purchase.vendorId,
      vendorInvoiceRef: purchase.vendorInvoiceRef ?? "",
      purchaseDate: purchase.purchaseDate,
      receivingLocationId: purchase.receivingLocationId,
      taxAmount: purchase.taxAmount ? str(purchase.taxAmount) : "",
      notes: purchase.notes ?? "",
    },
    lines: purchase.items.map((item, index) => ({
      key: `line-${index}`,
      productId: item.productId ?? "",
      productLabel: item.productId ? `${item.productName ?? item.description}${item.productSku ? ` (${item.productSku})` : ""}` : "",
      description: item.description,
      sku: item.sku ?? "",
      metal: item.metal,
      purity: item.purity,
      quantity: str(item.quantity),
      grossWeight: str(item.grossWeight),
      netWeight: str(item.netWeight),
      ratePerGram: str(item.ratePerGram),
      makingCharges: item.makingCharges ? str(item.makingCharges) : "",
      otherCharges: item.otherCharges ? str(item.otherCharges) : "",
    })),
  };
}

/** Comparable form state for dirty tracking (ignores React keys and display labels). */
const snapshot = (header: HeaderDraft, lines: LineDraft[]) => JSON.stringify({ header, lines: lines.map((line) => LINE_FIELDS.map((field) => line[field as keyof LineDraft])) });

/** Client-side preview only — the server computes the authoritative line total. */
function lineEstimate(line: LineDraft) {
  const net = toNumberOrNull(line.netWeight);
  const rate = toNumberOrNull(line.ratePerGram);
  if (net === null || rate === null) return null;
  return round2(net * rate + (toNumberOrNull(line.makingCharges) ?? 0) + (toNumberOrNull(line.otherCharges) ?? 0));
}

export function PurchaseForm({
  purchase,
  initialVendorId,
  onSaved,
  onStale,
  extraActions,
}: {
  /** Existing draft to edit (PUT); omit to create (POST). */
  purchase?: PurchaseDetail;
  initialVendorId?: string;
  onSaved: (purchase: PurchaseDetail) => void;
  /** Called when the server says the record changed (e.g. no longer a draft). */
  onStale?: () => void;
  extraActions?: (state: { dirty: boolean; saving: boolean }) => ReactNode;
}) {
  const [initial] = useState(() => initialState(purchase, initialVendorId));
  const [header, setHeader] = useState<HeaderDraft>(initial.header);
  const [lines, setLines] = useState<LineDraft[]>(initial.lines);
  const [nextKey, setNextKey] = useState(initial.lines.length);
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshot(initial.header, initial.lines));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);

  const vendors = useAdminResource<Paginated<VendorListItem>>("/vendors", { status: "active", pageSize: 100, sort: "name:asc" });
  const locations = useAdminResource<StockLocation[]>("/locations");

  const activeLocations = (locations.latest ?? []).filter((location) => location.active);
  const receivingLocationId = header.receivingLocationId || activeLocations[0]?.id || "";
  const vendorOptions = (vendors.latest?.items ?? []).map((vendor) => ({ value: vendor.id, label: `${vendor.name} (${vendor.code})` }));
  if (purchase && header.vendorId === purchase.vendorId && !vendorOptions.some((option) => option.value === purchase.vendorId)) {
    vendorOptions.unshift({ value: purchase.vendorId, label: `${purchase.vendor.name} (${purchase.vendor.code}) — inactive` });
  }
  const locationOptions = activeLocations.map((location) => ({ value: location.id, label: location.name }));
  if (receivingLocationId && !locationOptions.some((option) => option.value === receivingLocationId)) {
    locationOptions.unshift({ value: receivingLocationId, label: purchase?.receivingLocationId === receivingLocationId ? `${purchase.locationName} — inactive` : receivingLocationId });
  }

  const dirty = snapshot(header, lines) !== savedSnapshot;
  const estimates = lines.map(lineEstimate);
  const subtotalEstimate = round2(estimates.reduce<number>((sum, value) => sum + (value ?? 0), 0));
  const taxEstimate = toNumberOrNull(header.taxAmount) ?? 0;
  const incomplete = estimates.some((value) => value === null);
  const totalQuantity = lines.reduce((sum, line) => sum + (toNumberOrNull(line.quantity) ?? 0), 0);
  const totalNet = lines.reduce((sum, line) => sum + (toNumberOrNull(line.netWeight) ?? 0), 0);
  const totalGross = lines.reduce((sum, line) => sum + (toNumberOrNull(line.grossWeight) ?? 0), 0);
  const unlinked = lines.filter((line) => !line.productId).length;

  const clearError = (key: string) =>
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });

  const setHeaderField = (key: keyof HeaderDraft) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setHeader((current) => ({ ...current, [key]: value }));
    clearError(key);
  };

  const updateLine = (index: number, patch: Partial<LineDraft>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    for (const field of Object.keys(patch)) clearError(`items.${index}.${field}`);
  };

  const setLineField = (index: number, field: keyof LineDraft) => (event: { target: { value: string } }) => updateLine(index, { [field]: event.target.value });

  function selectProduct(index: number, product: ProductOption) {
    updateLine(index, { productId: product.id, productLabel: `${product.name} (${product.sku})`, description: product.name, sku: product.sku, metal: product.metal, purity: product.purity });
  }

  function addLine() {
    setLines((current) => [...current, emptyLine(`line-${nextKey}`)]);
    setNextKey((value) => value + 1);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
    // Server/client line errors are index-based; drop them rather than show them on the wrong line.
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith("items"))));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!header.vendorId) next.vendorId = "Choose a vendor.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(header.purchaseDate)) next.purchaseDate = "Enter a valid date.";
    if (!receivingLocationId) next.receivingLocationId = "Choose an active stock location.";
    if (header.taxAmount.trim() && !isNonNegative(header.taxAmount)) next.taxAmount = "Enter 0 or more.";
    if (lines.length === 0) next.items = "Add at least one line item.";
    lines.forEach((line, index) => {
      const key = (field: string) => `items.${index}.${field}`;
      if (!line.description.trim()) next[key("description")] = "Enter a description.";
      if (!line.metal) next[key("metal")] = "Choose a metal.";
      if (!line.purity) next[key("purity")] = "Choose a purity.";
      else if (line.metal && !(puritiesByMetal[line.metal] ?? []).includes(line.purity)) next[key("purity")] = "Purity doesn't match the metal.";
      if (!/^\d+$/.test(line.quantity.trim()) || Number(line.quantity) < 1) next[key("quantity")] = "Whole number, at least 1.";
      if (!isNonNegative(line.grossWeight)) next[key("grossWeight")] = "Enter the gross weight.";
      if (!isNonNegative(line.netWeight)) next[key("netWeight")] = "Enter the net weight.";
      if (isNonNegative(line.grossWeight) && isNonNegative(line.netWeight) && Number(line.grossWeight) < Number(line.netWeight)) next[key("grossWeight")] = "Can't be less than net weight.";
      if (!isNonNegative(line.ratePerGram)) next[key("ratePerGram")] = "Enter the rate per gram.";
      if (line.makingCharges.trim() && !isNonNegative(line.makingCharges)) next[key("makingCharges")] = "Enter 0 or more.";
      if (line.otherCharges.trim() && !isNonNegative(line.otherCharges)) next[key("otherCharges")] = "Enter 0 or more.";
    });
    return next;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setStale(false);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError(next.items ?? "Please review the highlighted fields.");
      return;
    }

    const current = snapshot(header, lines);
    const payload = {
      vendorId: header.vendorId,
      vendorInvoiceRef: header.vendorInvoiceRef.trim() || null,
      purchaseDate: header.purchaseDate,
      receivingLocationId,
      taxAmount: toNumberOrNull(header.taxAmount) ?? 0,
      notes: header.notes.trim() || null,
      items: lines.map((line) => ({
        productId: line.productId || null,
        description: line.description.trim(),
        sku: line.sku.trim() || null,
        metal: line.metal,
        purity: line.purity,
        quantity: Number(line.quantity),
        grossWeight: Number(line.grossWeight),
        netWeight: Number(line.netWeight),
        ratePerGram: Number(line.ratePerGram),
        makingCharges: toNumberOrNull(line.makingCharges) ?? 0,
        otherCharges: toNumberOrNull(line.otherCharges) ?? 0,
      })),
    };

    setSaving(true);
    try {
      const saved = purchase ? await adminApi.put<PurchaseDetail>(`/purchases/${purchase.id}`, payload) : await adminApi.post<PurchaseDetail>("/purchases", payload);
      setSavedSnapshot(current);
      toast({ title: purchase ? "Draft saved" : "Purchase draft created", description: `${saved.purchaseNumber} · total ${money(saved.total)}`, tone: "success" });
      onSaved(saved);
    } catch (caught) {
      if (caught instanceof AdminApiError) {
        const fieldErrors = caught.fieldErrors ?? {};
        setErrors(fieldErrors);
        const unplaced = Object.entries(fieldErrors).filter(([key]) => !HEADER_FIELDS.includes(key) && !LINE_ERROR.test(key));
        setFormError([caught.message, ...unplaced.map(([key, message]) => (key === "_form" ? message : `${key}: ${message}`))].join(" "));
        if (purchase && (caught.status === 409 || (caught.status === 422 && !Object.keys(fieldErrors).length))) setStale(true);
      } else {
        setFormError(errorMessage(caught));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {formError && (
        <InlineAlert>
          {formError}
          {stale && onStale && (
            <>
              {" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setStale(false);
                  setFormError(null);
                  onStale();
                }}
              >
                Reload purchase
              </button>
            </>
          )}
        </InlineAlert>
      )}

      <FormSection title="Purchase details" description="Stock is added to the receiving location only when this purchase is approved.">
        <SelectInput
          label="Vendor"
          required
          value={header.vendorId}
          onChange={setHeaderField("vendorId")}
          placeholder={vendors.loading && !vendors.latest ? "Loading vendors…" : "Choose a vendor"}
          options={vendorOptions}
          error={errors.vendorId ?? (vendors.error ? (vendors.error.code === "forbidden" ? "You don't have access to the vendor list." : vendors.error.message) : undefined)}
          hint={
            vendors.latest && vendorOptions.length === 0 ? (
              <>
                No active vendors. <Link href="/admin/vendors" className="underline">Add a vendor</Link> first.
              </>
            ) : undefined
          }
        />
        <TextInput label="Vendor invoice ref" maxLength={80} value={header.vendorInvoiceRef} onChange={setHeaderField("vendorInvoiceRef")} error={errors.vendorInvoiceRef} />
        <TextInput label="Purchase date" type="date" required value={header.purchaseDate} onChange={setHeaderField("purchaseDate")} error={errors.purchaseDate} />
        <SelectInput
          label="Receiving location"
          required
          value={receivingLocationId}
          onChange={setHeaderField("receivingLocationId")}
          placeholder={locations.loading && !locations.latest ? "Loading locations…" : "Choose a location"}
          options={locationOptions}
          error={errors.receivingLocationId ?? (locations.error ? (locations.error.code === "forbidden" ? "You don't have access to stock locations (inventory:view)." : locations.error.message) : undefined)}
        />
        <NumberInput label="Tax amount (₹)" min={0} value={header.taxAmount} onChange={setHeaderField("taxAmount")} error={errors.taxAmount} placeholder="0" />
        <TextArea label="Notes" rows={2} maxLength={2000} value={header.notes} onChange={setHeaderField("notes")} error={errors.notes} containerClassName="sm:col-span-2" />
      </FormSection>

      <Panel
        title="Line items"
        description="Weights are line totals in grams, as on the vendor invoice."
        actions={
          <AdminButton size="sm" onClick={addLine} disabled={lines.length >= MAX_LINES}>
            <PlusIcon size={14} />
            Add line
          </AdminButton>
        }
      >
        {errors.items && <InlineAlert className="mb-4">{errors.items}</InlineAlert>}
        {lines.length === 0 ? (
          <p className="border border-dashed border-line px-4 py-8 text-center text-[0.8125rem] text-muted">No line items. Add at least one line.</p>
        ) : (
          <ol className="space-y-4">
            {lines.map((line, index) => {
              const err = (field: string) => errors[`items.${index}.${field}`];
              const estimate = estimates[index];
              return (
                <li key={line.key} className="border border-line bg-ivory p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[0.75rem] font-medium uppercase tracking-[0.12em] text-muted">Line {index + 1}</span>
                    <AdminButton size="sm" variant="ghost" onClick={() => removeLine(index)} aria-label={`Remove line ${index + 1}`} disabled={lines.length === 1}>
                      <TrashIcon size={14} />
                      Remove
                    </AdminButton>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="sm:col-span-2 lg:col-span-3">
                      <p className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">Linked product</p>
                      {line.productId ? (
                        <div className="flex min-h-10 items-center justify-between gap-2 border border-line bg-porcelain px-3 py-1.5 text-[0.8125rem]">
                          <span className="min-w-0 truncate text-ink">{line.productLabel || "Linked product"}</span>
                          <button type="button" className="shrink-0 text-[0.75rem] text-champagne-deep hover:underline" onClick={() => updateLine(index, { productId: "", productLabel: "" })}>
                            Unlink
                          </button>
                        </div>
                      ) : (
                        <ProductPicker label={`Search product for line ${index + 1}`} onSelect={(product) => selectProduct(index, product)} error={err("productId")} />
                      )}
                      {line.productId && err("productId") && <p className="mt-1 text-[0.75rem] text-danger">{err("productId")}</p>}
                    </div>
                    <TextInput label="Description" required maxLength={200} value={line.description} onChange={setLineField(index, "description")} error={err("description")} containerClassName="sm:col-span-2 lg:col-span-2" />
                    <TextInput label="SKU" maxLength={40} value={line.sku} onChange={setLineField(index, "sku")} error={err("sku")} />

                    <SelectInput
                      label="Metal"
                      required
                      value={line.metal}
                      disabled={Boolean(line.productId)}
                      onChange={(event) => {
                        const metal = event.target.value;
                        updateLine(index, { metal, ...(line.purity && !(puritiesByMetal[metal] ?? []).includes(line.purity) ? { purity: "" } : {}) });
                      }}
                      placeholder="Choose"
                      options={metalOptions}
                      error={err("metal")}
                    />
                    <SelectInput label="Purity" required value={line.purity} disabled={Boolean(line.productId)} onChange={setLineField(index, "purity")} placeholder="Choose" options={purityOptions(line.metal || undefined)} error={err("purity")} />
                    <NumberInput label="Quantity" required min={1} step="1" inputMode="numeric" value={line.quantity} onChange={setLineField(index, "quantity")} error={err("quantity")} />
                    <NumberInput label="Gross wt (g)" required min={0} step="0.001" value={line.grossWeight} onChange={setLineField(index, "grossWeight")} error={err("grossWeight")} />
                    <NumberInput label="Net wt (g)" required min={0} step="0.001" value={line.netWeight} onChange={setLineField(index, "netWeight")} error={err("netWeight")} />
                    <NumberInput label="Rate / gram (₹)" required min={0} step="0.01" value={line.ratePerGram} onChange={setLineField(index, "ratePerGram")} error={err("ratePerGram")} />
                    <NumberInput label="Making (₹)" min={0} step="0.01" value={line.makingCharges} onChange={setLineField(index, "makingCharges")} error={err("makingCharges")} placeholder="0" />
                    <NumberInput label="Other charges (₹)" min={0} step="0.01" value={line.otherCharges} onChange={setLineField(index, "otherCharges")} error={err("otherCharges")} placeholder="0" />
                    <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-4 lg:items-end">
                      <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Line total · Estimate</p>
                      <p className="text-[1rem] tabular-nums text-ink">{estimate === null ? "—" : money(estimate)}</p>
                      <p className="text-[0.6875rem] text-muted">Net wt × rate + making + other</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {unlinked > 0 && lines.length > 0 && (
          <InlineAlert tone="info" className="mt-4">
            {unlinked === 1 ? "1 line isn't" : `${unlinked} lines aren't`} linked to a product. Drafts can be saved this way, but every line must be linked before the purchase can be approved — and purchases awaiting approval can&apos;t be edited.
          </InlineAlert>
        )}
      </Panel>

      <Panel title="Totals · Estimate" description="Preview only. The server calculates the final totals when you save.">
        <dl className="grid gap-x-6 gap-y-3 text-[0.875rem] sm:grid-cols-3">
          <TotalRow label="Quantity" value={number(totalQuantity)} />
          <TotalRow label="Gross weight" value={weight(totalGross)} />
          <TotalRow label="Net weight" value={weight(totalNet)} />
          <TotalRow label="Subtotal (estimate)" value={money(subtotalEstimate)} />
          <TotalRow label="Tax" value={money(taxEstimate)} />
          <TotalRow label="Total (estimate)" value={money(round2(subtotalEstimate + taxEstimate))} strong />
        </dl>
        {incomplete && <p className="mt-3 text-[0.75rem] text-muted">Lines without a net weight and rate are not included in the estimate.</p>}
      </Panel>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-ivory/95 px-1 py-3 backdrop-blur">
        {purchase && <span className="mr-auto text-[0.8125rem] text-muted">{dirty ? "You have unsaved changes." : "All changes saved."}</span>}
        {extraActions?.({ dirty, saving })}
        <AdminButton type="submit" variant="primary" loading={saving} disabled={Boolean(purchase) && !dirty}>
          {purchase ? "Save draft" : "Create draft"}
        </AdminButton>
      </div>
    </form>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div>
      <dt className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className={strong ? "mt-0.5 font-serif text-[1.375rem] tabular-nums text-ink" : "mt-0.5 tabular-nums text-ink"}>{value}</dd>
    </div>
  );
}

