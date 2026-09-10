"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CheckboxInput, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, AdminDialog, InlineAlert, LoadingBlock } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { humanize, metalLabels } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import {
  CheckboxGroup,
  discountTypeOptions,
  istInputToIso,
  isoToIstInput,
  metalOptions,
  MutationAlert,
  pickError,
  ProductChips,
  ProductSearch,
  windowError,
  type CategoryOption,
  type DiscountType,
  type Metal,
} from "./shared";

export interface CouponScope {
  metals?: Metal[];
  categorySlugs?: string[];
  productIds?: string[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  appliesTo: CouponScope;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  state: "active" | "scheduled" | "expired" | "exhausted" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface CouponPayload {
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  minOrderValue: number | null;
  maxDiscount: number | null;
  appliesTo: CouponScope;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  active: boolean;
}

/** Full payload for PATCH — the API's partial schema resets omitted defaulted fields (`appliesTo`, `active`). */
export function couponPayload(coupon: Coupon): CouponPayload {
  return {
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value: coupon.value,
    minOrderValue: coupon.minOrderValue,
    maxDiscount: coupon.maxDiscount,
    appliesTo: coupon.appliesTo ?? {},
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
    usageLimit: coupon.usageLimit,
    active: coupon.active,
  };
}

export function couponScopeSummary(scope: CouponScope | null | undefined) {
  const parts: string[] = [];
  if (scope?.metals?.length) parts.push(scope.metals.map((metal) => metalLabels[metal] ?? humanize(metal)).join(", "));
  if (scope?.categorySlugs?.length) parts.push(`${scope.categorySlugs.length} ${scope.categorySlugs.length === 1 ? "category" : "categories"}`);
  if (scope?.productIds?.length) parts.push(`${scope.productIds.length} ${scope.productIds.length === 1 ? "product" : "products"}`);
  return parts.length ? parts.join(" · ") : "All products";
}

const text = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));

function SectionTitle({ children, first }: { children: ReactNode; first?: boolean }) {
  return <h3 className={`text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted sm:col-span-2 ${first ? "" : "mt-2 border-t border-line pt-5"}`}>{children}</h3>;
}

export function CouponDialog({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const formId = useId();
  const [form, setForm] = useState({
    code: coupon?.code ?? "",
    description: coupon?.description ?? "",
    type: coupon?.type ?? ("percentage" as DiscountType),
    value: text(coupon?.value),
    minOrderValue: text(coupon?.minOrderValue),
    maxDiscount: text(coupon?.maxDiscount),
    metals: coupon?.appliesTo?.metals ?? [],
    categorySlugs: coupon?.appliesTo?.categorySlugs ?? [],
    productIds: coupon?.appliesTo?.productIds ?? [],
    startsAt: isoToIstInput(coupon?.startsAt),
    endsAt: isoToIstInput(coupon?.endsAt),
    usageLimit: text(coupon?.usageLimit),
    active: coupon?.active ?? true,
  });
  const [knownProducts, setKnownProducts] = useState<Record<string, string>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const categories = useAdminResource<CategoryOption[]>("/categories");
  const mutation = useMutation((payload: CouponPayload) => (coupon ? adminApi.patch<Coupon>(`/coupons/${coupon.id}`, payload) : adminApi.post<Coupon>("/coupons", payload)));
  const errors: Record<string, string | undefined> = { ...mutation.fieldErrors, ...localErrors };
  const codeLocked = Boolean(coupon && coupon.usedCount > 0);

  const categoryOptions = [
    ...(categories.data ?? []).map((category) => ({ value: category.slug, label: category.name, description: `${humanize(category.group)}${category.active ? "" : " · hidden"}` })),
    ...form.categorySlugs.filter((slug) => categories.data && !categories.data.some((category) => category.slug === slug)).map((slug) => ({ value: slug, label: slug, description: "No longer exists" })),
  ];

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,30}$/.test(code)) nextErrors.code = "Use 3–30 letters and numbers, without spaces.";
    const description = form.description.trim();
    if (!description) nextErrors.description = "Describe what the coupon gives.";
    else if (description.length > 200) nextErrors.description = "Use 200 characters or fewer.";
    const value = toNumberOrNull(form.value);
    if (value === null || value <= 0) nextErrors.value = "Enter a value above 0.";
    else if (form.type === "percentage" && value > 90) nextErrors.value = "Percentage coupons are limited to 90%.";
    else if (value > 10_000_000) nextErrors.value = "Enter a smaller amount.";
    const minOrderValue = toNumberOrNull(form.minOrderValue);
    if (form.minOrderValue.trim() && (minOrderValue === null || minOrderValue < 0)) nextErrors.minOrderValue = "Enter 0 or more.";
    const maxDiscount = toNumberOrNull(form.maxDiscount);
    if (form.maxDiscount.trim() && (maxDiscount === null || maxDiscount < 0)) nextErrors.maxDiscount = "Enter 0 or more.";
    const usageLimit = toNumberOrNull(form.usageLimit);
    if (form.usageLimit.trim() && (usageLimit === null || !Number.isInteger(usageLimit) || usageLimit < 1)) nextErrors.usageLimit = "Enter a whole number of 1 or more.";
    const windowMessage = windowError(form.startsAt, form.endsAt);
    if (windowMessage) nextErrors.endsAt = windowMessage;
    setLocalErrors(nextErrors);
    if (Object.keys(nextErrors).length || value === null) return;

    const appliesTo: CouponScope = {
      ...(form.metals.length ? { metals: form.metals } : {}),
      ...(form.categorySlugs.length ? { categorySlugs: form.categorySlugs } : {}),
      ...(form.productIds.length ? { productIds: form.productIds } : {}),
    };
    const result = await mutation.run({
      code,
      description,
      type: form.type,
      value,
      minOrderValue: form.minOrderValue.trim() ? minOrderValue : null,
      maxDiscount: form.maxDiscount.trim() ? maxDiscount : null,
      appliesTo,
      startsAt: istInputToIso(form.startsAt),
      endsAt: istInputToIso(form.endsAt),
      usageLimit: form.usageLimit.trim() ? usageLimit : null,
      active: form.active,
    });
    if (!result) return;
    toast({ tone: "success", title: coupon ? `Coupon ${result.code} updated` : `Coupon ${result.code} created` });
    onSaved();
  }

  return (
    <AdminDialog
      open
      size="lg"
      onClose={() => {
        if (!mutation.pending) onClose();
      }}
      title={coupon ? `Edit coupon ${coupon.code}` : "New coupon"}
      description={coupon ? `Used ${coupon.usedCount} time${coupon.usedCount === 1 ? "" : "s"}.` : "Customers enter the code at checkout."}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" form={formId} loading={mutation.pending}>
            {coupon ? "Save changes" : "Create coupon"}
          </AdminButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <SectionTitle first>Coupon</SectionTitle>
        <TextInput
          label="Code"
          required
          maxLength={30}
          value={form.code}
          disabled={codeLocked}
          onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
          error={errors.code}
          hint={codeLocked ? "This coupon has been used, so its code can’t change." : "Letters and numbers only, e.g. DIWALI10."}
          className="font-medium uppercase tracking-[0.08em]"
          autoComplete="off"
        />
        <div className="flex items-end pb-2">
          <CheckboxInput label="Active" description="Inactive coupons can’t be used at checkout." checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
        </div>
        <TextArea label="Description" required rows={2} maxLength={200} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} error={errors.description} containerClassName="sm:col-span-2" />

        <SectionTitle>Discount</SectionTitle>
        <SelectInput label="Discount type" required options={discountTypeOptions} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as DiscountType })} error={errors.type} />
        <NumberInput
          label={form.type === "percentage" ? "Discount (%)" : "Discount (₹)"}
          required
          min={0}
          max={form.type === "percentage" ? 90 : undefined}
          step="0.01"
          value={form.value}
          onChange={(event) => setForm({ ...form, value: event.target.value })}
          error={errors.value}
          hint={form.type === "percentage" ? "Up to 90%." : undefined}
        />
        <NumberInput label="Minimum order value (₹)" min={0} step="0.01" value={form.minOrderValue} onChange={(event) => setForm({ ...form, minOrderValue: event.target.value })} error={errors.minOrderValue} hint="Optional." />
        <NumberInput label="Maximum discount (₹)" min={0} step="0.01" value={form.maxDiscount} onChange={(event) => setForm({ ...form, maxDiscount: event.target.value })} error={errors.maxDiscount} hint="Optional cap, useful for percentage coupons." />

        <SectionTitle>Applies to</SectionTitle>
        <p className="-mt-2 text-[0.75rem] text-muted sm:col-span-2">Leave everything empty to allow the coupon on any product.</p>
        <CheckboxGroup label="Metals" options={metalOptions} value={form.metals} onChange={(metals) => setForm({ ...form, metals: metals as Metal[] })} error={pickError(errors, "appliesTo.metals")} className="sm:col-span-2" />
        <div className="sm:col-span-2">
          {categories.error ? (
            <InlineAlert tone="warning">Categories couldn’t be loaded: {categories.error.message}</InlineAlert>
          ) : !categories.data ? (
            <LoadingBlock rows={2} />
          ) : (
            <CheckboxGroup label="Categories" options={categoryOptions} value={form.categorySlugs} onChange={(categorySlugs) => setForm({ ...form, categorySlugs })} error={pickError(errors, "appliesTo.categorySlugs")} />
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <ProductSearch
            label="Products"
            excludeIds={form.productIds}
            error={pickError(errors, "appliesTo.productIds")}
            onPick={(product) => {
              setKnownProducts((current) => ({ ...current, [product.id]: `${product.name} (${product.sku})` }));
              setForm((current) => ({ ...current, productIds: [...current.productIds, product.id] }));
            }}
          />
          <ProductChips ids={form.productIds} known={knownProducts} onRemove={(id) => setForm((current) => ({ ...current, productIds: current.productIds.filter((item) => item !== id) }))} />
        </div>

        <SectionTitle>Schedule &amp; limits</SectionTitle>
        <TextInput label="Starts (IST)" type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} error={errors.startsAt} hint="Leave empty to start now." />
        <TextInput label="Ends (IST)" type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} error={errors.endsAt} hint="Leave empty for no end date." />
        <NumberInput
          label="Usage limit"
          min={1}
          step="1"
          inputMode="numeric"
          value={form.usageLimit}
          onChange={(event) => setForm({ ...form, usageLimit: event.target.value })}
          error={errors.usageLimit}
          hint={coupon ? `Total uses allowed. Already used ${coupon.usedCount} time${coupon.usedCount === 1 ? "" : "s"}.` : "Total uses allowed. Leave empty for unlimited."}
        />

        <MutationAlert error={mutation.error && !Object.keys(mutation.fieldErrors).some((key) => key !== "_form") ? mutation.error : null} className="sm:col-span-2" />
        {Object.keys(mutation.fieldErrors).some((key) => key !== "_form") && <InlineAlert className="sm:col-span-2">Please review the highlighted fields.</InlineAlert>}
      </form>
    </AdminDialog>
  );
}
