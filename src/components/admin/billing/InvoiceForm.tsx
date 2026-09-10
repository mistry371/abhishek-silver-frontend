"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { SaveIcon, TrashIcon } from "@/components/admin/icons";
import { AdminButton, AdminLinkButton, InlineAlert, Panel } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { metalLabels, money, purityLabels, puritiesByMetal } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { CustomerSearch } from "./SearchPicker";
import { TotalsList } from "./TotalsList";
import { round2, type CustomerOption, type InvoiceDetail } from "./types";

interface ItemDraft {
  key: string;
  productId: string | null;
  description: string;
  sku: string;
  size: string;
  metal: string;
  purity: string;
  quantity: string;
  grossWeight: string;
  netWeight: string;
  unitPrice: string;
  discount: string;
  gstRate: string;
}

interface CustomerDraft {
  name: string;
  mobile: string;
  email: string;
  address: string;
  gstin: string;
}

export interface InvoicePayload {
  customerId: string | null;
  customer: { name: string; mobile: string | null; email: string | null; address: string | null; gstin: string | null };
  items: {
    productId: string | null;
    description: string;
    sku: string | null;
    size: string | null;
    metal: string | null;
    purity: string | null;
    quantity: number;
    grossWeight: number | null;
    netWeight: number | null;
    unitPrice: number;
    discount: number;
    gstRate: number;
  }[];
  dueDate: string | null;
  notes: string | null;
}

const DEFAULT_GST_RATE = "3";
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

let keySeed = 0;
function newItem(): ItemDraft {
  keySeed += 1;
  return { key: `item-${keySeed}`, productId: null, description: "", sku: "", size: "", metal: "", purity: "", quantity: "1", grossWeight: "", netWeight: "", unitPrice: "", discount: "", gstRate: DEFAULT_GST_RATE };
}

const asText = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value));
const optional = (value: string) => value.trim() || null;

const metalOptions = Object.entries(metalLabels).map(([value, label]) => ({ value, label }));
const purityOptions = (metal: string) => (puritiesByMetal[metal] ?? Object.keys(purityLabels)).map((value) => ({ value, label: purityLabels[value] ?? value }));

function parseDiscount(value: string) {
  return value.trim() === "" ? 0 : toNumberOrNull(value);
}

/** Client-side estimate only; the server recalculates every total on save. */
function estimate(item: ItemDraft) {
  const quantity = Number(item.quantity);
  const unitPrice = toNumberOrNull(item.unitPrice);
  const gstRate = toNumberOrNull(item.gstRate);
  const discountValue = parseDiscount(item.discount);
  if (item.quantity.trim() === "" || !Number.isInteger(quantity) || quantity < 1 || unitPrice === null || unitPrice < 0 || gstRate === null || gstRate < 0 || discountValue === null || discountValue < 0) return null;
  const gross = round2(unitPrice * quantity);
  const discount = round2(Math.min(discountValue, gross));
  const taxableValue = round2(gross - discount);
  const gstAmount = round2((taxableValue * gstRate) / 100);
  return { gross, discount, taxableValue, gstAmount, lineTotal: round2(taxableValue + gstAmount) };
}

function validate(customer: CustomerDraft, items: ItemDraft[]) {
  const errors: Record<string, string> = {};
  if (!customer.name.trim()) errors["customer.name"] = "Enter the customer's name.";
  if (customer.gstin.trim() && !GSTIN_PATTERN.test(customer.gstin.trim().toUpperCase())) errors["customer.gstin"] = "Enter a valid 15-character GSTIN.";
  if (!items.length) errors.items = "Add at least one item.";
  items.forEach((item, index) => {
    const prefix = `items.${index}`;
    if (!item.description.trim()) errors[`${prefix}.description`] = "Describe the item.";
    const quantity = Number(item.quantity);
    const quantityOk = item.quantity.trim() !== "" && Number.isInteger(quantity) && quantity >= 1 && quantity <= 10_000;
    if (!quantityOk) errors[`${prefix}.quantity`] = "Whole number, 1 to 10,000.";
    const price = toNumberOrNull(item.unitPrice);
    if (price === null || price < 0) errors[`${prefix}.unitPrice`] = "Enter the pre-tax unit price.";
    const discount = parseDiscount(item.discount);
    if (discount === null || discount < 0) errors[`${prefix}.discount`] = "Enter a valid amount.";
    else if (price !== null && quantityOk && discount > round2(price * quantity)) errors[`${prefix}.discount`] = "The discount can't exceed the line value.";
    const rate = toNumberOrNull(item.gstRate);
    if (rate === null || rate < 0 || rate > 28) errors[`${prefix}.gstRate`] = "Enter 0 to 28.";
    for (const field of ["grossWeight", "netWeight"] as const) {
      if (!item[field].trim()) continue;
      const grams = toNumberOrNull(item[field]);
      if (grams === null || grams < 0) errors[`${prefix}.${field}`] = "Enter grams (0 or more).";
    }
  });
  return errors;
}

function toPayload(customerId: string | null, customer: CustomerDraft, items: ItemDraft[], dueDate: string, notes: string): InvoicePayload {
  return {
    customerId,
    customer: {
      name: customer.name.trim(),
      mobile: optional(customer.mobile),
      email: optional(customer.email),
      address: optional(customer.address),
      gstin: customer.gstin.trim() ? customer.gstin.trim().toUpperCase() : null,
    },
    items: items.map((item) => ({
      productId: item.productId,
      description: item.description.trim(),
      sku: optional(item.sku),
      size: optional(item.size),
      metal: item.metal || null,
      purity: item.purity || null,
      quantity: Number(item.quantity),
      grossWeight: toNumberOrNull(item.grossWeight),
      netWeight: toNumberOrNull(item.netWeight),
      unitPrice: toNumberOrNull(item.unitPrice) ?? 0,
      discount: parseDiscount(item.discount) ?? 0,
      gstRate: toNumberOrNull(item.gstRate) ?? 0,
    })),
    dueDate: dueDate || null,
    notes: optional(notes),
  };
}

function itemsFromInvoice(invoice: InvoiceDetail): ItemDraft[] {
  return invoice.items.map((item) => ({
    key: item.id,
    productId: item.productId,
    description: item.description,
    sku: item.sku ?? "",
    size: item.size ?? "",
    metal: item.metal ?? "",
    purity: item.purity ?? "",
    quantity: String(item.quantity),
    grossWeight: asText(item.grossWeight),
    netWeight: asText(item.netWeight),
    unitPrice: String(item.unitPrice),
    discount: item.discount ? String(item.discount) : "",
    gstRate: String(item.gstRate),
  }));
}

/** Manual invoice draft form — creates (`POST /invoices`) or edits (`PUT /invoices/:id`). */
export function InvoiceForm({ invoice }: { invoice?: InvoiceDetail }) {
  const router = useRouter();
  const { can } = useAdmin();
  const canSave = can("billing:create");
  const [customerId, setCustomerId] = useState<string | null>(invoice?.customerId ?? null);
  const [linkedName, setLinkedName] = useState(invoice?.customerId ? invoice.customer.name : "");
  const [customer, setCustomer] = useState<CustomerDraft>({
    name: invoice?.customer.name ?? "",
    mobile: invoice?.customer.mobile ?? "",
    email: invoice?.customer.email ?? "",
    address: invoice?.customer.address ?? "",
    gstin: invoice?.customer.gstin ?? "",
  });
  const [items, setItems] = useState<ItemDraft[]>(() => (invoice?.items.length ? itemsFromInvoice(invoice) : [newItem()]));
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? "");
  const [notes, setNotes] = useState(invoice?.notes ?? "");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const save = useMutation((payload: InvoicePayload) => (invoice ? adminApi.put<InvoiceDetail>(`/invoices/${invoice.id}`, payload) : adminApi.post<InvoiceDetail>("/invoices", payload)));
  const errors: Record<string, string> = { ...save.fieldErrors, ...clientErrors };
  const hasErrors = Object.keys(errors).length > 0;
  const formError = save.error && !Object.keys(save.fieldErrors).length ? save.error.message : hasErrors ? "Please review the highlighted fields." : null;

  const estimates = items.map(estimate);
  const counted = estimates.filter((line): line is NonNullable<typeof line> => line !== null);
  const totals = {
    subtotal: round2(counted.reduce((sum, line) => sum + line.gross, 0)),
    discount: round2(counted.reduce((sum, line) => sum + line.discount, 0)),
    taxableValue: round2(counted.reduce((sum, line) => sum + line.taxableValue, 0)),
    gst: round2(counted.reduce((sum, line) => sum + line.gstAmount, 0)),
    grandTotal: round2(counted.reduce((sum, line) => sum + line.lineTotal, 0)),
  };

  const updateCustomer = (patch: Partial<CustomerDraft>) => setCustomer((current) => ({ ...current, ...patch }));
  const updateItem = (key: string, patch: Partial<ItemDraft>) => setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  function selectCustomer(option: CustomerOption) {
    setCustomerId(option.id);
    setLinkedName(option.name);
    setCustomer((current) => ({ ...current, name: option.name || current.name, mobile: option.phone ?? "", email: option.email ?? "" }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    const found = validate(customer, items);
    setClientErrors(found);
    if (Object.keys(found).length) return;
    const saved = await save.run(toPayload(customerId, customer, items, dueDate, notes));
    if (!saved) return;
    toast({
      title: invoice ? "Draft invoice updated" : "Draft invoice created",
      description: `Grand total ${money(saved.grandTotal)}, calculated by the server.`,
      tone: "success",
    });
    router.push(`/admin/invoices/${saved.id}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <Panel title="Customer" description="Search for an existing customer, or type the billing details.">
          <div className="grid gap-4 sm:grid-cols-2">
            {can("customers:view") && (
              <div className="sm:col-span-2">
                <CustomerSearch onSelect={selectCustomer} error={errors.customerId} />
              </div>
            )}
            {customerId && (
              <div className="flex flex-wrap items-center justify-between gap-2 border border-line bg-cream/40 px-3 py-2 text-[0.8125rem] sm:col-span-2">
                <span>
                  Linked to customer <span className="font-medium text-ink">{linkedName || "record"}</span>
                </span>
                <AdminButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCustomerId(null);
                    setLinkedName("");
                  }}
                >
                  Unlink
                </AdminButton>
              </div>
            )}
            <TextInput label="Name" required maxLength={160} value={customer.name} onChange={(event) => updateCustomer({ name: event.target.value })} error={errors["customer.name"] ?? errors.customer} containerClassName="sm:col-span-2" />
            <TextInput label="Mobile" type="tel" inputMode="tel" value={customer.mobile} onChange={(event) => updateCustomer({ mobile: event.target.value })} error={errors["customer.mobile"]} />
            <TextInput label="Email" type="email" value={customer.email} onChange={(event) => updateCustomer({ email: event.target.value })} error={errors["customer.email"]} />
            <TextInput label="GSTIN" maxLength={15} value={customer.gstin} onChange={(event) => updateCustomer({ gstin: event.target.value.toUpperCase() })} error={errors["customer.gstin"]} hint="Optional, for business customers." />
            <TextArea label="Billing address" rows={2} maxLength={500} value={customer.address} onChange={(event) => updateCustomer({ address: event.target.value })} error={errors["customer.address"]} containerClassName="sm:col-span-2" />
          </div>
        </Panel>

        <Panel
          title="Items"
          description="Enter pre-tax unit prices and discounts. GST is added per line."
          actions={
            <AdminButton size="sm" onClick={() => setItems((current) => [...current, newItem()])}>
              <PlusIcon size={14} />
              Add item
            </AdminButton>
          }
        >
          {errors.items && (
            <p role="alert" className="mb-3 text-[0.75rem] text-danger">
              {errors.items}
            </p>
          )}
          <ol className="space-y-4">
            {items.map((item, index) => {
              const line = estimates[index];
              const err = (field: string) => errors[`items.${index}.${field}`];
              return (
                <li key={item.key} className="border border-line p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted">Item {index + 1}</p>
                    <AdminButton size="sm" variant="ghost" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((entry) => entry.key !== item.key))} aria-label={`Remove item ${index + 1}`}>
                      <TrashIcon size={15} />
                    </AdminButton>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <TextInput label="Description" required maxLength={200} value={item.description} onChange={(event) => updateItem(item.key, { description: event.target.value })} error={err("description")} containerClassName="sm:col-span-2 lg:col-span-4" />
                    <TextInput label="SKU" maxLength={40} value={item.sku} onChange={(event) => updateItem(item.key, { sku: event.target.value })} error={err("sku")} />
                    <TextInput label="Size" maxLength={10} value={item.size} onChange={(event) => updateItem(item.key, { size: event.target.value })} error={err("size")} />
                    <SelectInput
                      label="Metal"
                      placeholder="—"
                      options={metalOptions}
                      value={item.metal}
                      onChange={(event) => {
                        const metal = event.target.value;
                        const allowed = puritiesByMetal[metal];
                        updateItem(item.key, { metal, purity: allowed && !allowed.includes(item.purity) ? "" : item.purity });
                      }}
                      error={err("metal")}
                    />
                    <SelectInput label="Purity" placeholder="—" options={purityOptions(item.metal)} value={item.purity} onChange={(event) => updateItem(item.key, { purity: event.target.value })} error={err("purity")} />
                    <NumberInput label="Qty" required min={1} max={10000} step={1} inputMode="numeric" value={item.quantity} onChange={(event) => updateItem(item.key, { quantity: event.target.value })} error={err("quantity")} />
                    <NumberInput label="Gross wt (g)" min={0} value={item.grossWeight} onChange={(event) => updateItem(item.key, { grossWeight: event.target.value })} error={err("grossWeight")} />
                    <NumberInput label="Net wt (g)" min={0} value={item.netWeight} onChange={(event) => updateItem(item.key, { netWeight: event.target.value })} error={err("netWeight")} />
                    <NumberInput label="GST %" required min={0} max={28} value={item.gstRate} onChange={(event) => updateItem(item.key, { gstRate: event.target.value })} error={err("gstRate")} />
                    <NumberInput label="Unit price (₹, pre-tax)" required min={0} value={item.unitPrice} onChange={(event) => updateItem(item.key, { unitPrice: event.target.value })} error={err("unitPrice")} containerClassName="lg:col-span-3" />
                    <NumberInput label="Line discount (₹, pre-tax)" min={0} placeholder="0" value={item.discount} onChange={(event) => updateItem(item.key, { discount: event.target.value })} error={err("discount")} containerClassName="lg:col-span-3" />
                  </div>
                  <p className="mt-3 border-t border-line pt-3 text-[0.75rem] text-muted">
                    {line ? (
                      <>
                        Estimate: taxable {money(line.taxableValue)} · GST {money(line.gstAmount)} · <span className="text-ink">line total {money(line.lineTotal)}</span>
                      </>
                    ) : (
                      "Enter quantity, unit price and GST rate to see an estimate."
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
          <AdminButton className="mt-4" onClick={() => setItems((current) => [...current, newItem()])}>
            <PlusIcon size={15} />
            Add another item
          </AdminButton>
        </Panel>

        <Panel title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Due date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} error={errors.dueDate} />
            <TextArea label="Notes" rows={3} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} error={errors.notes} hint="Printed on the invoice." containerClassName="sm:col-span-2" />
          </div>
        </Panel>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4">
        <Panel title="Totals" description="Estimate — final totals are calculated when saved.">
          <TotalsList
            rows={[
              { label: "Subtotal", value: money(totals.subtotal) },
              { label: "Discount", value: totals.discount ? `− ${money(totals.discount)}` : money(0) },
              { label: "Taxable value", value: money(totals.taxableValue) },
              { label: "GST", value: money(totals.gst) },
              { label: "Estimated total", value: money(totals.grandTotal), strong: true },
            ]}
          />
          {counted.length < items.length && <p className="mt-3 text-[0.75rem] text-muted">Items with missing values are left out of the estimate.</p>}
          {invoice && (
            <p className="mt-4 border-t border-line pt-3 text-[0.75rem] text-muted">
              Last saved total (server): <span className="tabular-nums text-ink">{money(invoice.grandTotal)}</span>
            </p>
          )}
          {formError && <InlineAlert className="mt-4">{formError}</InlineAlert>}
          {!canSave && (
            <InlineAlert tone="info" className="mt-4">
              Your role can&apos;t create or edit invoices.
            </InlineAlert>
          )}
          <div className="mt-5 flex flex-col gap-2">
            <AdminButton type="submit" variant="primary" loading={save.pending} disabled={!canSave}>
              <SaveIcon size={15} />
              {invoice ? "Save draft" : "Create draft"}
            </AdminButton>
            <AdminLinkButton href={invoice ? `/admin/invoices/${invoice.id}` : "/admin/billing"} variant="ghost">
              Cancel
            </AdminLinkButton>
          </div>
          <p className="mt-3 text-[0.75rem] text-muted">Drafts have no invoice number. The number is assigned when the invoice is issued.</p>
        </Panel>
      </aside>
    </form>
  );
}
