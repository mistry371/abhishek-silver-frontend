"use client";

import { useId, useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { controlClass, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { AdminButton, AdminDialog, InlineAlert, StatusBadge } from "@/components/admin/ui";
import { SearchIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi, type Paginated } from "@/lib/admin/client";
import { money, number } from "@/lib/admin/format";
import { useAdminResource, useDebouncedValue, useMutation } from "@/lib/admin/hooks";
import {
  budgetRangeOptions,
  enquiryTypeOptions,
  formAlert,
  jewelleryTypeOptions,
  manualEnquirySourceOptions,
  metalOptions,
  preferredContactOptions,
  purityOptionsByMetal,
} from "./shared";
import type { EnquiryDetail } from "./types";

const KNOWN_FIELDS = [
  "type",
  "source",
  "name",
  "mobile",
  "email",
  "message",
  "productId",
  "jewelleryType",
  "budgetRange",
  "preferredMetal",
  "preferredPurity",
  "preferredContact",
] as const;

interface ProductHit {
  id: string;
  name: string;
  sku: string;
  status: string;
  stock: number;
  finalPrice: number | null;
}

interface EnquiryValues {
  type: string;
  source: string;
  name: string;
  mobile: string;
  email: string;
  message: string;
  jewelleryType: string;
  budgetRange: string;
  preferredMetal: string;
  preferredPurity: string;
  preferredContact: string;
}

function ProductPicker({ value, onChange, error }: { value: ProductHit | null; onChange: (product: ProductHit | null) => void; error?: string }) {
  const inputId = useId();
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term.trim(), 300);
  const searching = !value && debounced.length >= 2;
  const search = useAdminResource<Paginated<ProductHit>>(searching ? "/products" : null, { q: debounced, pageSize: 8 });

  if (value) {
    return (
      <div className="sm:col-span-2">
        <p className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">Product</p>
        <div className="flex items-center justify-between gap-3 border border-line bg-ivory px-3 py-2">
          <span className="min-w-0 text-[0.8125rem]">
            <span className="block truncate text-ink">{value.name}</span>
            <span className="block text-muted">
              {value.sku}
              {value.finalPrice !== null && ` · ${money(value.finalPrice)}`}
            </span>
          </span>
          <AdminButton size="sm" variant="ghost" onClick={() => onChange(null)}>
            Change
          </AdminButton>
        </div>
        {error && (
          <p role="alert" className="mt-1 text-[0.75rem] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="sm:col-span-2">
      <label htmlFor={inputId} className="mb-1.5 block text-[0.75rem] font-medium text-ink-soft">
        Product <span className="font-normal text-muted">(optional)</span>
      </label>
      <div className="relative">
        <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          placeholder="Search by product name or SKU"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          aria-invalid={error ? true : undefined}
          className={controlClass(error, "h-10 pl-9")}
        />
      </div>
      {searching && (
        <div className="mt-1 max-h-56 overflow-y-auto border border-line bg-porcelain text-[0.8125rem]">
          {search.loading && <p className="px-3 py-2 text-muted">Searching…</p>}
          {search.error && <p className="px-3 py-2 text-danger">{search.error.message}</p>}
          {search.data && search.data.items.length === 0 && <p className="px-3 py-2 text-muted">No products match “{debounced}”.</p>}
          {search.data?.items.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onChange(product);
                setTerm("");
              }}
              className="flex w-full items-center justify-between gap-3 border-b border-line px-3 py-2 text-left last:border-0 hover:bg-cream"
            >
              <span className="min-w-0">
                <span className="block truncate text-ink">{product.name}</span>
                <span className="block text-muted">
                  {product.sku} · {number(product.stock)} in stock
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {product.status !== "active" && <StatusBadge status={product.status} />}
                {product.finalPrice !== null && <span className="tabular-nums">{money(product.finalPrice)}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Logs an enquiry received by WhatsApp, phone or in person. It is assigned to
 * the admin who logs it. Give it a new `key` each time it opens.
 */
export function LogEnquiryDialog({
  open,
  onClose,
  onCreated,
  customer,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (enquiry: EnquiryDetail) => void;
  /** Prefills contact details and links the enquiry to this customer. */
  customer?: { id: string; name: string; phone: string | null; email: string | null };
}) {
  const formId = useId();
  const { can } = useAdmin();
  const [values, setValues] = useState<EnquiryValues>({
    type: "product",
    source: "whatsapp",
    name: customer?.name ?? "",
    mobile: customer?.phone ?? "",
    email: customer?.email ?? "",
    message: "",
    jewelleryType: "",
    budgetRange: "",
    preferredMetal: "",
    preferredPurity: "",
    preferredContact: "",
  });
  const [product, setProduct] = useState<ProductHit | null>(null);
  const set = (key: keyof EnquiryValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value, ...(key === "preferredMetal" ? { preferredPurity: "" } : {}) }));

  const mutation = useMutation((body: Record<string, unknown>) => adminApi.post<EnquiryDetail>("/enquiries", body));
  const errors = mutation.fieldErrors;
  const alert = formAlert(mutation.error, KNOWN_FIELDS);
  const purityOptions = purityOptionsByMetal[values.preferredMetal] ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enquiry = await mutation.run({
      type: values.type,
      source: values.source,
      name: values.name.trim(),
      mobile: values.mobile.trim(),
      email: values.email.trim() || undefined,
      message: values.message.trim(),
      productId: product?.id,
      jewelleryType: values.jewelleryType || undefined,
      budgetRange: values.budgetRange || undefined,
      preferredMetal: values.preferredMetal || undefined,
      preferredPurity: values.preferredPurity || undefined,
      preferredContact: values.preferredContact || undefined,
      customerId: customer?.id,
    });
    if (!enquiry) return;
    toast({ title: `Enquiry ${enquiry.reference} logged`, tone: "success" });
    onCreated(enquiry);
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Log enquiry"
      description="For enquiries received on WhatsApp, by phone or in the store. It is assigned to you and starts as In progress."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={mutation.pending}>
            Log enquiry
          </AdminButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <SelectInput label="Enquiry type" required options={enquiryTypeOptions} value={values.type} onChange={(event) => set("type", event.target.value)} error={errors.type} />
        <SelectInput label="Received via" required options={manualEnquirySourceOptions} value={values.source} onChange={(event) => set("source", event.target.value)} error={errors.source} />
        <TextInput label="Name" required maxLength={120} autoComplete="off" value={values.name} onChange={(event) => set("name", event.target.value)} error={errors.name} />
        <TextInput
          label="Mobile"
          required
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="10-digit mobile number"
          value={values.mobile}
          onChange={(event) => set("mobile", event.target.value)}
          error={errors.mobile}
        />
        <TextInput label="Email" type="email" autoComplete="off" value={values.email} onChange={(event) => set("email", event.target.value)} error={errors.email} />
        <SelectInput
          label="Preferred contact"
          placeholder="Not specified"
          options={preferredContactOptions}
          value={values.preferredContact}
          onChange={(event) => set("preferredContact", event.target.value)}
          error={errors.preferredContact}
        />
        <TextArea
          label="Message"
          required
          rows={4}
          maxLength={3000}
          containerClassName="sm:col-span-2"
          placeholder="What is the customer looking for?"
          value={values.message}
          onChange={(event) => set("message", event.target.value)}
          error={errors.message}
        />
        {can("products:view") && <ProductPicker value={product} onChange={setProduct} error={errors.productId} />}
        <SelectInput
          label="Jewellery type"
          placeholder="Not specified"
          options={jewelleryTypeOptions}
          value={values.jewelleryType}
          onChange={(event) => set("jewelleryType", event.target.value)}
          error={errors.jewelleryType}
        />
        <SelectInput label="Budget" placeholder="Not specified" options={budgetRangeOptions} value={values.budgetRange} onChange={(event) => set("budgetRange", event.target.value)} error={errors.budgetRange} />
        <SelectInput
          label="Preferred metal"
          placeholder="Not specified"
          options={metalOptions}
          value={values.preferredMetal}
          onChange={(event) => set("preferredMetal", event.target.value)}
          error={errors.preferredMetal}
        />
        <SelectInput
          label="Preferred purity"
          placeholder={values.preferredMetal ? "Not specified" : "Choose a metal first"}
          options={purityOptions}
          disabled={!purityOptions.length}
          value={values.preferredPurity}
          onChange={(event) => set("preferredPurity", event.target.value)}
          error={errors.preferredPurity}
        />
        {alert && <InlineAlert className="sm:col-span-2">{alert}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}
