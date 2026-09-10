"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CustomerSearch, ProductSearch } from "@/components/admin/billing/SearchPicker";
import { TotalsList } from "@/components/admin/billing/TotalsList";
import { paymentMethodLabels, paymentMethodOptions, round2, type CustomerOption, type PaymentMethod, type ProductDetail, type ProductOption, type SaleDetail, type StockLocation } from "@/components/admin/billing/types";
import { useSaleQuote, type QuoteRequest } from "@/components/admin/billing/useSaleQuote";
import { CheckboxInput, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { TrashIcon } from "@/components/admin/icons";
import { AdminButton, ConfirmDialog, ErrorState, InlineAlert, LoadingBlock, PageHeader, Panel, PermissionDenied, Tabs } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { AdminApiError, adminApi, errorMessage } from "@/lib/admin/client";
import { money, percent, weight } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

interface LineDraft {
  key: string;
  productId: string;
  name: string;
  sku: string;
  sizeOptions: string[];
  size: string;
  quantity: string;
  discount: string;
}

type CustomerMode = "existing" | "walk_in";

let lineSeed = 0;
function nextLineKey() {
  lineSeed += 1;
  return `line-${lineSeed}`;
}

function parseQuantity(value: string) {
  const quantity = Number(value);
  return value.trim() !== "" && Number.isInteger(quantity) && quantity >= 1 && quantity <= 100 ? quantity : null;
}

function parseDiscount(value: string) {
  if (value.trim() === "") return 0;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? round2(amount) : null;
}

function Figure({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-0.5 tabular-nums text-ink">{value}</dd>
    </div>
  );
}

export default function NewSalePage() {
  const { can } = useAdmin();
  if (!can("sales:create")) {
    return (
      <>
        <PageHeader title="New in-store sale" back={{ href: "/admin/sales", label: "Sales" }} />
        <PermissionDenied message="Your role can't record in-store sales." />
      </>
    );
  }
  return <NewSaleScreen canSearchCustomers={can("customers:view")} canSearchProducts={can("products:view")} />;
}

function NewSaleScreen({ canSearchCustomers, canSearchProducts }: { canSearchCustomers: boolean; canSearchProducts: boolean }) {
  const router = useRouter();

  // Stock location
  const locations = useAdminResource<StockLocation[]>("/locations");
  const activeLocations = useMemo(() => (locations.data ?? []).filter((location) => location.active), [locations.data]);
  const [locationChoice, setLocationChoice] = useState("");
  const locationId = activeLocations.some((location) => location.id === locationChoice) ? locationChoice : (activeLocations[0]?.id ?? "");
  const locationName = activeLocations.find((location) => location.id === locationId)?.name ?? "the selected location";

  // Customer
  const [mode, setMode] = useState<CustomerMode>(canSearchCustomers ? "existing" : "walk_in");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [walkIn, setWalkIn] = useState({ name: "", phone: "", email: "" });
  const [billing, setBilling] = useState({ address: "", gstin: "" });
  const [saveCustomer, setSaveCustomer] = useState(false);

  // Lines
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Payment
  const [discountReason, setDiscountReason] = useState("");
  const [amountPaidInput, setAmountPaidInput] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Submission
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<AdminApiError | null>(null);

  const parsed = lines.map((line) => ({ quantity: parseQuantity(line.quantity), discount: parseDiscount(line.discount) }));
  const linesValid = lines.length > 0 && parsed.every((entry) => entry.quantity !== null && entry.discount !== null);
  const quoteRequest: QuoteRequest | null =
    locationId && linesValid
      ? {
          locationId,
          keys: lines.map((line) => line.key),
          items: lines.map((line, index) => ({
            productId: line.productId,
            ...(line.size ? { size: line.size } : {}),
            quantity: parsed[index]?.quantity ?? 1,
            discount: parsed[index]?.discount ?? 0,
          })),
        }
      : null;
  const { quote, lastGood, loading: quoteLoading, error: quoteError, reload: retryQuote } = useSaleQuote(quoteRequest);

  // What to render: the exact quote when fresh, otherwise the last one (dimmed).
  const shown = quote && quoteRequest ? { quote, keys: quoteRequest.keys } : lastGood ? { quote: lastGood.quote, keys: lastGood.request.keys } : null;
  const stale = !quote;
  const totals = shown?.quote.totals;
  const shortfalls = shown?.quote.stockShortfalls ?? [];

  const submitFieldErrors = submitError?.fieldErrors ?? {};
  const quoteFieldErrors = quoteError?.fieldErrors ?? {};
  const errors: Record<string, string> = { ...quoteFieldErrors, ...submitFieldErrors, ...clientErrors };
  const lineError = (index: number, field: string) => errors[`items.${index}.${field}`];

  const anyDiscount = parsed.some((entry) => (entry.discount ?? 0) > 0);
  const amountPaidText = amountPaidInput ?? (totals ? String(totals.grandTotal) : "");
  const amountPaid = toNumberOrNull(amountPaidText);
  const balance = totals ? round2(Math.max(totals.grandTotal - (amountPaid ?? 0), 0)) : 0;
  const unitCount = parsed.reduce((sum, entry) => sum + (entry.quantity ?? 0), 0);

  const customerLabel = mode === "existing" ? (selectedCustomer?.name ?? "—") : walkIn.name.trim() || "—";

  async function addProduct(option: ProductOption) {
    setAddError(null);
    setAdding(true);
    try {
      const detail = await adminApi.get<ProductDetail>(`/products/${option.id}`);
      const sizes = detail.sizeOptions ?? [];
      const size = sizes.length ? (detail.defaultSize && sizes.includes(detail.defaultSize) ? detail.defaultSize : (sizes[0] ?? "")) : "";
      setLines((current) => [...current, { key: nextLineKey(), productId: detail.id, name: detail.name, sku: detail.sku, sizeOptions: sizes, size, quantity: "1", discount: "" }]);
    } catch (caught) {
      setAddError(errorMessage(caught));
    } finally {
      setAdding(false);
    }
  }

  const updateLine = (key: string, patch: Partial<LineDraft>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  function review(event: FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    if (!locationId) found.locationId = "Choose the stock location for this sale.";
    if (mode === "existing" && !selectedCustomer) found.customerId = "Choose a customer, or switch to walk-in.";
    if (mode === "walk_in" && !walkIn.name.trim()) found["customer.name"] = "Enter the customer's name.";
    if (!lines.length) found.items = "Add at least one product.";
    parsed.forEach((entry, index) => {
      if (entry.quantity === null) found[`items.${index}.quantity`] = "Enter a whole number from 1 to 100.";
      if (entry.discount === null) found[`items.${index}.discount`] = "Enter a valid amount.";
    });
    if (anyDiscount && !discountReason.trim()) found.discountReason = "Add a reason for the discount.";
    if (amountPaid === null || amountPaid < 0) found["payment.amountPaid"] = "Enter the amount received (0 if nothing was paid).";
    else if (quote && amountPaid > quote.totals.grandTotal) found["payment.amountPaid"] = "The amount paid can't exceed the grand total.";

    setClientErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length) {
      setFormError("Please review the highlighted fields.");
      return;
    }
    if (!quote) {
      setFormError(quoteError ? "Prices couldn't be calculated. Fix the issues shown on the items and try again." : "Prices are still updating. Try again in a moment.");
      return;
    }
    if (quote.stockShortfalls.length) {
      setFormError(`There isn't enough stock at ${locationName} for every item.`);
      return;
    }
    setFormError(null);
    setConfirmOpen(true);
  }

  async function completeSale() {
    if (!quote || !quoteRequest) return;
    const address = billing.address.trim() || null;
    const gstin = billing.gstin.trim() ? billing.gstin.trim().toUpperCase() : null;
    const customerPart =
      mode === "existing" && selectedCustomer
        ? {
            customerId: selectedCustomer.id,
            // Phone and email fall back to the customer record on the server.
            ...(selectedCustomer.name.trim() ? { customer: { name: selectedCustomer.name.trim(), phone: null, email: null, address, gstin } } : {}),
            saveCustomer: false,
          }
        : {
            customerId: null,
            customer: { name: walkIn.name.trim(), phone: walkIn.phone.trim() || null, email: walkIn.email.trim() || null, address, gstin },
            saveCustomer,
          };

    setSubmitting(true);
    setSubmitError(null);
    try {
      const sale = await adminApi.post<SaleDetail>("/sales", {
        locationId: quoteRequest.locationId,
        items: quoteRequest.items,
        ...customerPart,
        ...(anyDiscount ? { discountReason: discountReason.trim() } : {}),
        payment: { amountPaid: round2(amountPaid ?? 0), method, ...(reference.trim() ? { reference: reference.trim() } : {}) },
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      toast({
        title: `Sale ${sale.saleNumber} recorded`,
        description: sale.invoice?.invoiceNumber ? `Invoice ${sale.invoice.invoiceNumber} issued.` : undefined,
        tone: "success",
      });
      router.push(`/admin/sales/${sale.id}`);
    } catch (caught) {
      const error = caught instanceof AdminApiError ? caught : new AdminApiError(500, {});
      setSubmitError(error);
      if (error.fieldErrors && Object.keys(error.fieldErrors).length) {
        setConfirmOpen(false);
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const hasSubmitFieldErrors = Object.keys(submitFieldErrors).length > 0;
  const hasQuoteFieldErrors = Object.keys(quoteFieldErrors).length > 0;

  return (
    <>
      <PageHeader title="New in-store sale" description="Prices, GST and stock come from the server using today's rates. The invoice is issued when the sale is completed." back={{ href: "/admin/sales", label: "Sales" }} />

      <form onSubmit={review} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Stock location" description="Stock for this sale is deducted from here.">
            {locations.error ? (
              <ErrorState error={locations.error} onRetry={locations.reload} />
            ) : !locations.data ? (
              <LoadingBlock rows={1} />
            ) : activeLocations.length === 0 ? (
              <InlineAlert tone="warning">There are no active stock locations. Add one in Settings before recording a sale.</InlineAlert>
            ) : (
              <SelectInput
                label="Location"
                required
                value={locationId}
                onChange={(event) => setLocationChoice(event.target.value)}
                options={activeLocations.map((location) => ({ value: location.id, label: `${location.name} (${location.units} units)` }))}
                error={errors.locationId}
                containerClassName="sm:max-w-sm"
              />
            )}
          </Panel>

          <Panel title="Customer">
            <Tabs<CustomerMode>
              className="mb-5"
              value={mode}
              onChange={setMode}
              tabs={[
                { value: "existing", label: "Existing customer" },
                { value: "walk_in", label: "Walk-in" },
              ]}
            />
            {mode === "existing" ? (
              selectedCustomer ? (
                <div className="flex flex-wrap items-start justify-between gap-3 border border-line bg-cream/40 px-4 py-3">
                  <div className="min-w-0 text-[0.8125rem]">
                    <p className="font-medium text-ink">{selectedCustomer.name || "Unnamed customer"}</p>
                    <p className="text-muted">{[selectedCustomer.phone, selectedCustomer.email, selectedCustomer.customerCode].filter(Boolean).join(" · ") || "No contact details"}</p>
                  </div>
                  <AdminButton size="sm" variant="ghost" onClick={() => setSelectedCustomer(null)}>
                    Change
                  </AdminButton>
                </div>
              ) : canSearchCustomers ? (
                <CustomerSearch onSelect={setSelectedCustomer} error={errors.customerId} />
              ) : (
                <InlineAlert tone="info">Your role can&apos;t search customers. Switch to walk-in and enter the customer&apos;s details.</InlineAlert>
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <TextInput label="Name" required maxLength={160} value={walkIn.name} onChange={(event) => setWalkIn((current) => ({ ...current, name: event.target.value }))} error={errors["customer.name"] ?? errors.customer} containerClassName="sm:col-span-2" />
                <TextInput label="Mobile" type="tel" inputMode="tel" value={walkIn.phone} onChange={(event) => setWalkIn((current) => ({ ...current, phone: event.target.value }))} error={errors["customer.phone"]} />
                <TextInput label="Email" type="email" value={walkIn.email} onChange={(event) => setWalkIn((current) => ({ ...current, email: event.target.value }))} error={errors["customer.email"]} />
                <CheckboxInput
                  className="sm:col-span-2"
                  label="Save as customer"
                  description="Needs a mobile number or email. If a customer with this mobile number already exists, the sale is linked to them."
                  checked={saveCustomer}
                  onChange={(event) => setSaveCustomer(event.target.checked)}
                />
              </div>
            )}
            {errors.customerId && mode === "existing" && selectedCustomer && (
              <p role="alert" className="mt-2 text-[0.75rem] text-danger">
                {errors.customerId}
              </p>
            )}
            <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <TextInput label="GSTIN" maxLength={15} value={billing.gstin} onChange={(event) => setBilling((current) => ({ ...current, gstin: event.target.value.toUpperCase() }))} error={errors["customer.gstin"]} hint="Optional, printed on the invoice." />
              <TextArea label="Billing address" rows={2} maxLength={500} value={billing.address} onChange={(event) => setBilling((current) => ({ ...current, address: event.target.value }))} error={errors["customer.address"]} containerClassName="sm:col-span-2" />
            </div>
          </Panel>

          <Panel title="Items" description="Selling prices are never typed: they come from the pricing engine, the same as the website.">
            {canSearchProducts ? <ProductSearch onSelect={addProduct} disabled={adding} error={errors.items} /> : <InlineAlert tone="info">Your role can&apos;t search products, so items can&apos;t be added.</InlineAlert>}
            {adding && <p className="mt-2 text-[0.8125rem] text-muted">Adding product…</p>}
            {addError && <InlineAlert className="mt-3">{addError}</InlineAlert>}

            {lines.length === 0 ? (
              <p className="mt-4 border border-dashed border-line px-4 py-8 text-center text-[0.8125rem] text-muted">No items yet. Search for a product to add it.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {lines.map((line, index) => {
                  const position = shown ? shown.keys.indexOf(line.key) : -1;
                  const server = shown && position >= 0 ? shown.quote.lines[position] : undefined;
                  const shortfall = shortfalls.find((entry) => entry.productId === line.productId);
                  const productError = lineError(index, "productId");
                  return (
                    <li key={line.key} className="border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{line.name}</p>
                          <p className="text-[0.75rem] text-muted">
                            {line.sku}
                            {server ? ` · Net ${weight(server.netWeight)} · Gross ${weight(server.grossWeight)}` : ""}
                          </p>
                        </div>
                        <AdminButton size="sm" variant="ghost" onClick={() => setLines((current) => current.filter((entry) => entry.key !== line.key))} aria-label={`Remove ${line.name}`}>
                          <TrashIcon size={15} />
                        </AdminButton>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {line.sizeOptions.length > 0 ? (
                          <SelectInput label="Size" value={line.size} onChange={(event) => updateLine(line.key, { size: event.target.value })} options={line.sizeOptions.map((size) => ({ value: size, label: size }))} error={lineError(index, "size")} />
                        ) : (
                          <div className="flex flex-col">
                            <span className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">Size</span>
                            <span className="flex h-10 items-center text-[0.875rem] text-muted">One size</span>
                          </div>
                        )}
                        <NumberInput label="Quantity" required min={1} max={100} step={1} inputMode="numeric" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: event.target.value })} error={lineError(index, "quantity")} />
                        <NumberInput label="Extra discount (₹, pre-tax)" min={0} placeholder="0" value={line.discount} onChange={(event) => updateLine(line.key, { discount: event.target.value })} error={lineError(index, "discount")} />
                      </div>
                      {productError && <InlineAlert className="mt-3">{productError}</InlineAlert>}
                      <dl className={cn("mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-[0.8125rem] sm:grid-cols-3 xl:grid-cols-6", (!server || stale) && "opacity-55")}>
                        <Figure label="Unit price" value={server ? money(server.unitPrice) : "—"} />
                        <Figure label="Discount" value={server ? money(server.discount) : "—"} />
                        <Figure label="Taxable" value={server ? money(server.taxableValue) : "—"} />
                        <Figure label={server ? `GST ${percent(server.gstRate)}` : "GST"} value={server ? money(server.gstAmount) : "—"} />
                        <Figure label="Line total" value={server ? <span className="font-medium">{money(server.lineTotal)}</span> : "—"} />
                        <Figure label="Available" value={server ? <span className={cn(shortfall && "text-danger")}>{server.available}</span> : "—"} />
                      </dl>
                    </li>
                  );
                })}
              </ul>
            )}
            {quoteError && !hasQuoteFieldErrors && (
              <InlineAlert className="mt-3">
                {quoteError.message}{" "}
                <button type="button" className="underline" onClick={retryQuote}>
                  Retry
                </button>
              </InlineAlert>
            )}
          </Panel>

          <Panel title="Payment & notes">
            <div className="grid gap-4 sm:grid-cols-2">
              {(anyDiscount || errors.discountReason) && (
                <TextInput label="Discount reason" required maxLength={300} value={discountReason} onChange={(event) => setDiscountReason(event.target.value)} error={errors.discountReason} hint="Required for extra discounts. Recorded in the audit log." containerClassName="sm:col-span-2" />
              )}
              <NumberInput
                label="Amount paid (₹)"
                required
                min={0}
                value={amountPaidText}
                onChange={(event) => setAmountPaidInput(event.target.value)}
                error={errors["payment.amountPaid"]}
                hint={
                  amountPaidInput !== null && totals ? (
                    <button type="button" className="underline" onClick={() => setAmountPaidInput(null)}>
                      Use the grand total ({money(totals.grandTotal)})
                    </button>
                  ) : (
                    "Defaults to the grand total."
                  )
                }
              />
              <SelectInput label="Payment method" required value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} options={paymentMethodOptions} error={errors["payment.method"]} />
              <TextInput label="Payment reference" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} error={errors["payment.reference"]} hint="UPI transaction ID, card slip or cheque number." containerClassName="sm:col-span-2" />
              <TextArea label="Notes" rows={3} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} error={errors.notes} containerClassName="sm:col-span-2" />
            </div>
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <Panel title="Summary" description={quoteLoading ? "Updating prices…" : "Calculated by the server."}>
            {!totals ? (
              <p className="text-[0.8125rem] text-muted">
                {!lines.length ? "Add products to see the totals." : !linesValid ? "Fix the highlighted item fields to see prices." : quoteError ? "Prices couldn't be calculated." : "Calculating…"}
              </p>
            ) : (
              <div className={cn("transition-opacity", stale && "opacity-55")}>
                <TotalsList
                  rows={[
                    { label: "Subtotal", value: money(totals.subtotal) },
                    { label: "Extra discount", value: totals.discount ? `− ${money(totals.discount)}` : money(0) },
                    { label: "Taxable value", value: money(totals.taxableValue) },
                    { label: "GST", value: money(totals.gst) },
                    { label: "Grand total", value: money(totals.grandTotal), strong: true },
                    { label: "Amount paid", value: money(amountPaid ?? 0) },
                    { label: "Balance due", value: money(balance), tone: balance > 0 ? "danger" : undefined },
                  ]}
                />
              </div>
            )}
            {shortfalls.length > 0 && (
              <InlineAlert className="mt-4">
                <p className="font-medium">Not enough stock at {locationName}</p>
                <ul className="mt-1 list-disc pl-4">
                  {shortfalls.map((entry) => (
                    <li key={entry.productId}>
                      {entry.sku}: {entry.requested} requested, {entry.available} available
                    </li>
                  ))}
                </ul>
              </InlineAlert>
            )}
            {formError && <InlineAlert className="mt-4">{formError}</InlineAlert>}
            <AdminButton type="submit" variant="primary" className="mt-5 w-full" disabled={submitting || !lines.length}>
              Review &amp; complete sale
            </AdminButton>
            <p className="mt-2 text-[0.75rem] text-muted">Completing the sale deducts stock and issues the invoice immediately.</p>
          </Panel>
        </aside>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (!submitting) setConfirmOpen(false);
        }}
        onConfirm={completeSale}
        title="Complete this sale?"
        confirmLabel="Complete sale"
        pending={submitting}
        error={submitError && !hasSubmitFieldErrors ? submitError.message : null}
        description={`Stock will be deducted from ${locationName} and an invoice issued with the next invoice number. The sale can't be edited afterwards.`}
      >
        {quote && (
          <TotalsList
            rows={[
              { label: "Customer", value: customerLabel },
              { label: "Items", value: `${lines.length} line${lines.length === 1 ? "" : "s"}, ${unitCount} unit${unitCount === 1 ? "" : "s"}` },
              { label: "Grand total", value: money(quote.totals.grandTotal), strong: true },
              { label: `Paid by ${paymentMethodLabels[method]}`, value: money(amountPaid ?? 0) },
              { label: "Balance due", value: money(balance), tone: balance > 0 ? "danger" : undefined },
            ]}
          />
        )}
      </ConfirmDialog>
    </>
  );
}
