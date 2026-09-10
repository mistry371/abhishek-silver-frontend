"use client";

import { useState, type FormEvent } from "react";
import { FormSection, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, ErrorState, InlineAlert, LoadingBlock } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError } from "@/lib/admin/client";
import { money, todayIst } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { useExpenseCategories, useExpenseSettings, useVendorOptions } from "./hooks";
import { categoryOptions, paymentMethodOptions, type ExpenseCategory, type ExpenseDetail, type PaymentMethod, type VendorOption } from "./types";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Select from Settings → Expenses payment sources, or free text when they aren't available. */
export function PaymentSourceField({ value, onChange, sources, error }: { value: string; onChange: (value: string) => void; sources: string[] | null; error?: string }) {
  if (sources) {
    const options = sources.map((source) => ({ value: source, label: source }));
    if (value && !sources.includes(value)) options.push({ value, label: `${value} (not in settings)` });
    return (
      <SelectInput
        label="Payment source"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        options={options}
        placeholder="Not specified"
        error={error}
        hint="Sources are managed in Settings → Expenses."
      />
    );
  }
  return <TextInput label="Payment source" value={value} onChange={(event) => onChange(event.target.value)} maxLength={60} placeholder="e.g. Cash drawer, Bank account" error={error} />;
}

/** Shows the request error plus any field errors that have no visible field. */
export function FormErrorAlert({ error, visibleFields }: { error: AdminApiError | null; visibleFields: string[] }) {
  if (!error) return null;
  const hidden = Object.entries(error.fieldErrors ?? {}).filter(([key]) => !visibleFields.includes(key));
  return (
    <InlineAlert>
      <p>{error.message}</p>
      {hidden.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {hidden.map(([key, message]) => (
            <li key={key}>{key === "_form" ? message : `${key}: ${message}`}</li>
          ))}
        </ul>
      )}
    </InlineAlert>
  );
}

/* ------------------------------------------------------------------ */
/* Expense form (create + edit)                                        */
/* ------------------------------------------------------------------ */

interface FormState {
  expenseDate: string;
  categoryId: string;
  amount: string;
  taxAmount: string;
  gstRate: string;
  paymentMethod: PaymentMethod;
  paymentSource: string;
  payee: string;
  vendorId: string;
  referenceNumber: string;
  description: string;
  notes: string;
}

const numberText = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

function initialState(expense?: ExpenseDetail): FormState {
  return {
    expenseDate: expense?.expenseDate ?? todayIst(),
    categoryId: expense?.categoryId ?? "",
    amount: numberText(expense?.amount),
    taxAmount: numberText(expense?.taxAmount),
    gstRate: numberText(expense?.gstRate),
    paymentMethod: expense?.paymentMethod ?? "cash",
    paymentSource: expense?.paymentSource ?? "",
    payee: expense?.payee ?? "",
    vendorId: expense?.vendorId ?? "",
    referenceNumber: expense?.referenceNumber ?? "",
    description: expense?.description ?? "",
    notes: expense?.notes ?? "",
  };
}

const VISIBLE_FIELDS = ["expenseDate", "categoryId", "amount", "taxAmount", "gstRate", "paymentMethod", "paymentSource", "payee", "vendorId", "referenceNumber", "description", "notes"];

export function ExpenseForm({ expense, onSaved, onCancel }: { expense?: ExpenseDetail; onSaved: (expense: ExpenseDetail) => void; onCancel: () => void }) {
  const settings = useExpenseSettings();
  const categories = useExpenseCategories();
  const vendors = useVendorOptions();

  if (categories.error && !categories.latest) return <ErrorState error={categories.error} onRetry={categories.reload} />;
  if (!categories.latest || !settings.ready || !vendors.ready) return <LoadingBlock rows={8} />;

  return (
    <ExpenseFormBody
      expense={expense}
      categories={categories.latest}
      vendors={vendors.vendors}
      settings={settings}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}

function ExpenseFormBody({
  expense,
  categories,
  vendors,
  settings,
  onSaved,
  onCancel,
}: {
  expense?: ExpenseDetail;
  categories: ExpenseCategory[];
  vendors: VendorOption[] | null;
  settings: ReturnType<typeof useExpenseSettings>;
  onSaved: (expense: ExpenseDetail) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(expense));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  const save = useMutation((body: Record<string, unknown>) =>
    expense ? adminApi.put<ExpenseDetail>(`/expenses/${expense.id}`, body) : adminApi.post<ExpenseDetail>("/expenses", body),
  );
  const errors = save.fieldErrors;
  const showTax = settings.taxFieldsEnabled;

  const categoryChoices = categoryOptions(categories, { keepId: expense?.categoryId });
  const vendorChoices = (vendors ?? []).filter((vendor) => vendor.status === "active" || vendor.id === form.vendorId).map((vendor) => ({ value: vendor.id, label: `${vendor.name} (${vendor.code})` }));
  if (form.vendorId && !vendorChoices.some((option) => option.value === form.vendorId)) {
    vendorChoices.unshift({ value: form.vendorId, label: expense?.vendorName ?? "Current vendor" });
  }

  const amount = toNumberOrNull(form.amount) ?? 0;
  const tax = showTax ? (toNumberOrNull(form.taxAmount) ?? 0) : 0;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    // Tax: follow Settings when known; when settings can't be read, keep whatever the record already had.
    const taxBody = settings.known
      ? showTax
        ? { taxAmount: toNumberOrNull(form.taxAmount), gstRate: toNumberOrNull(form.gstRate) }
        : { taxAmount: null, gstRate: null }
      : { taxAmount: expense?.taxAmount ?? null, gstRate: expense?.gstRate ?? null };
    const result = await save.run({
      expenseDate: form.expenseDate,
      categoryId: form.categoryId,
      amount: toNumberOrNull(form.amount),
      ...taxBody,
      paymentMethod: form.paymentMethod,
      paymentSource: form.paymentSource.trim() || null,
      payee: form.payee,
      vendorId: form.vendorId || null,
      referenceNumber: form.referenceNumber.trim() || null,
      description: form.description,
      notes: form.notes.trim() || null,
    });
    if (result) {
      toast({ title: expense ? "Expense updated" : `Draft ${result.expenseNumber} created`, tone: "success" });
      onSaved(result);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <FormErrorAlert error={save.error} visibleFields={VISIBLE_FIELDS} />
      {expense?.status === "rejected" && <InlineAlert tone="warning">Saving changes moves this rejected expense back to draft so it can be submitted again.</InlineAlert>}

      <FormSection title="Expense details">
        <TextInput label="Expense date" type="date" required value={form.expenseDate} onChange={(event) => set("expenseDate", event.target.value)} error={errors.expenseDate} />
        <SelectInput
          label="Category"
          required
          value={form.categoryId}
          onChange={(event) => set("categoryId", event.target.value)}
          options={categoryChoices}
          placeholder={categoryChoices.length ? "Choose a category" : "No active categories yet"}
          error={errors.categoryId}
        />
        <TextInput
          label="Description"
          required
          maxLength={500}
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="What was this expense for?"
          error={errors.description}
          containerClassName="sm:col-span-2"
        />
        <TextInput label="Reference number" maxLength={80} value={form.referenceNumber} onChange={(event) => set("referenceNumber", event.target.value)} placeholder="Bill, invoice or UTR number" error={errors.referenceNumber} />
      </FormSection>

      <FormSection title="Amount & payment" description={showTax ? "Tax fields are enabled in Settings → Expenses." : undefined}>
        <NumberInput label="Amount (₹)" required min={0} step="0.01" value={form.amount} onChange={(event) => set("amount", event.target.value)} error={errors.amount} />
        <SelectInput
          label="Payment method"
          required
          value={form.paymentMethod}
          onChange={(event) => set("paymentMethod", event.target.value as PaymentMethod)}
          options={paymentMethodOptions}
          error={errors.paymentMethod}
        />
        {showTax && (
          <>
            <NumberInput label="Tax amount (₹)" min={0} step="0.01" value={form.taxAmount} onChange={(event) => set("taxAmount", event.target.value)} error={errors.taxAmount} hint="Added to the amount to give the total." />
            <NumberInput label="GST rate (%)" min={0} max={28} step="0.01" value={form.gstRate} onChange={(event) => set("gstRate", event.target.value)} error={errors.gstRate} hint="Recorded for reference." />
          </>
        )}
        <PaymentSourceField value={form.paymentSource} onChange={(value) => set("paymentSource", value)} sources={settings.paymentSources} error={errors.paymentSource} />
        <div className="flex flex-col justify-end sm:items-end">
          <p className="text-[0.75rem] font-medium text-ink-soft">Total</p>
          <p className="font-serif text-[1.5rem] tabular-nums text-ink">{money(Math.round((amount + tax) * 100) / 100)}</p>
        </div>
        {!showTax && errors.taxAmount && <InlineAlert className="sm:col-span-2">{errors.taxAmount}</InlineAlert>}
      </FormSection>

      <FormSection title="Paid to">
        <TextInput label="Payee" required maxLength={160} value={form.payee} onChange={(event) => set("payee", event.target.value)} placeholder="Person or business paid" error={errors.payee} />
        {vendors ? (
          <SelectInput
            label="Vendor"
            value={form.vendorId}
            onChange={(event) => {
              const vendorId = event.target.value;
              const vendor = vendors.find((item) => item.id === vendorId);
              setForm((current) => ({ ...current, vendorId, payee: current.payee.trim() || !vendor ? current.payee : vendor.name }));
            }}
            options={vendorChoices}
            placeholder="Not linked to a vendor"
            error={errors.vendorId}
            hint="Optional. Links the expense to a vendor record."
          />
        ) : (
          <p className="self-end text-[0.75rem] text-muted">Vendor linking isn&apos;t available for your role — the payee name is recorded as typed.</p>
        )}
      </FormSection>

      <FormSection title="Notes">
        <TextArea label="Internal notes" maxLength={2000} rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} error={errors.notes} containerClassName="sm:col-span-2" />
      </FormSection>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <AdminButton variant="ghost" onClick={onCancel} disabled={save.pending}>
          Cancel
        </AdminButton>
        <AdminButton type="submit" variant="primary" loading={save.pending}>
          {expense ? "Save changes" : "Save as draft"}
        </AdminButton>
      </div>
    </form>
  );
}
