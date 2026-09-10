"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { CheckboxInput, ImagesInput, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, AdminDialog, InlineAlert, KeyValue, LoadingBlock } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError, type ImageAsset, type Paginated } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import {
  CheckboxGroup,
  discountLabel,
  discountTypeOptions,
  istInputToIso,
  isoToIstInput,
  metalOptions,
  MutationAlert,
  pickError,
  ProductChips,
  ProductSearch,
  targetSummary,
  windowError,
  type CategoryOption,
  type CollectionOption,
  type DiscountType,
  type TargetScope,
} from "./shared";

export type OfferType = "percentage" | "fixed" | "product" | "category" | "limited_time" | "festival";

export interface Offer {
  id: string;
  title: string;
  eyebrow: string | null;
  description: string;
  type: OfferType;
  discount: { type: DiscountType; value: number } | null;
  target: { scope: TargetScope; ids: string[] };
  couponCode: string | null;
  image: ImageAsset | null;
  mobileImage: ImageAsset | null;
  cta: { label: string; href: string } | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  displayOrder: number;
  state: "running" | "scheduled" | "ended" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface OfferPayload {
  title: string;
  eyebrow: string | null;
  description: string;
  type: OfferType;
  discount: { type: DiscountType; value: number } | null;
  target: { scope: TargetScope; ids: string[] };
  couponCode: string | null;
  image: ImageAsset | null;
  mobileImage: ImageAsset | null;
  cta: { label: string; href: string } | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  displayOrder: number;
}

export const offerTypeOptions: { value: OfferType; label: string }[] = [
  { value: "percentage", label: "Percentage off" },
  { value: "fixed", label: "Flat amount off" },
  { value: "product", label: "Product offer" },
  { value: "category", label: "Category offer" },
  { value: "limited_time", label: "Limited time" },
  { value: "festival", label: "Festival" },
];

const scopeOptions: { value: TargetScope; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "categories", label: "Selected jewellery types" },
  { value: "collections", label: "Selected collections" },
  { value: "products", label: "Selected products" },
  { value: "metal", label: "A metal" },
];

export function offerWindow(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return "Always on";
  return `${startsAt ? formatDateTime(startsAt) : "Now"} → ${endsAt ? formatDateTime(endsAt) : "no end"}`;
}

const impactKey = (payload: OfferPayload) =>
  JSON.stringify([
    payload.discount,
    payload.target.scope,
    [...payload.target.ids].sort(),
    payload.active,
    payload.startsAt ? Date.parse(payload.startsAt) : null,
    payload.endsAt ? Date.parse(payload.endsAt) : null,
  ]);

function originalPayload(offer: Offer): OfferPayload {
  return {
    title: offer.title,
    eyebrow: offer.eyebrow,
    description: offer.description,
    type: offer.type,
    discount: offer.discount,
    target: offer.target,
    couponCode: offer.couponCode,
    image: offer.image,
    mobileImage: offer.mobileImage,
    cta: offer.cta,
    startsAt: offer.startsAt,
    endsAt: offer.endsAt,
    active: offer.active,
    displayOrder: offer.displayOrder,
  };
}

function SectionTitle({ children, first }: { children: ReactNode; first?: boolean }) {
  return <h3 className={`text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted sm:col-span-2 ${first ? "" : "mt-2 border-t border-line pt-5"}`}>{children}</h3>;
}

interface Taxonomy<T> {
  data?: T[];
  error?: AdminApiError;
}

export function OfferDialog({
  offer,
  onClose,
  onSaved,
  categories,
  collections,
  names,
}: {
  offer: Offer | null;
  onClose: () => void;
  onSaved: () => void;
  categories: Taxonomy<CategoryOption>;
  collections: Taxonomy<CollectionOption>;
  names: Record<string, string>;
}) {
  const formId = useId();
  const listId = useId();
  const [form, setForm] = useState({
    title: offer?.title ?? "",
    eyebrow: offer?.eyebrow ?? "",
    description: offer?.description ?? "",
    type: offer?.type ?? ("percentage" as OfferType),
    hasDiscount: Boolean(offer?.discount),
    discountType: offer?.discount?.type ?? ("percentage" as DiscountType),
    discountValue: offer?.discount ? String(offer.discount.value) : "",
    scope: offer?.target.scope ?? ("all" as TargetScope),
    ids: offer?.target.ids ?? [],
    couponCode: offer?.couponCode ?? "",
    image: offer?.image ? [offer.image] : ([] as ImageAsset[]),
    mobileImage: offer?.mobileImage ? [offer.mobileImage] : ([] as ImageAsset[]),
    ctaLabel: offer?.cta?.label ?? "",
    ctaHref: offer?.cta?.href ?? "",
    startsAt: isoToIstInput(offer?.startsAt),
    endsAt: isoToIstInput(offer?.endsAt),
    active: offer?.active ?? true,
    displayOrder: String(offer?.displayOrder ?? 0),
  });
  const [knownProducts, setKnownProducts] = useState<Record<string, string>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState<OfferPayload | null>(null);
  const coupons = useAdminResource<Paginated<{ id: string; code: string; active: boolean }>>("/coupons", { pageSize: 100 });
  const mutation = useMutation((payload: OfferPayload) => (offer ? adminApi.patch<Offer>(`/offers/${offer.id}`, payload) : adminApi.post<Offer>("/offers", payload)));
  const errors: Record<string, string | undefined> = { ...mutation.fieldErrors, ...localErrors };
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  const typeCategories = (categories.data ?? []).filter((category) => category.group === "type" || form.ids.includes(category.id));
  const categoryOptions = typeCategories.map((category) => ({ value: category.id, label: category.name, description: category.active ? undefined : "Hidden" }));
  const collectionOptions = (collections.data ?? []).map((collection) => ({ value: collection.id, label: collection.name, description: collection.active ? undefined : "Hidden" }));

  async function save(payload: OfferPayload) {
    const result = await mutation.run(payload);
    if (!result) {
      setConfirming(null);
      return;
    }
    toast({
      tone: "success",
      title: offer ? `“${result.title}” updated` : `“${result.title}” created`,
      description: payload.discount && payload.active ? "Website prices reflect the offer while it’s running." : undefined,
    });
    onSaved();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title) nextErrors.title = "Enter a title.";
    else if (title.length > 120) nextErrors.title = "Use 120 characters or fewer.";
    if (form.eyebrow.trim().length > 80) nextErrors.eyebrow = "Use 80 characters or fewer.";
    if (!description) nextErrors.description = "Describe the offer.";
    else if (description.length > 500) nextErrors.description = "Use 500 characters or fewer.";

    const discountValue = toNumberOrNull(form.discountValue);
    if (form.hasDiscount) {
      if (discountValue === null || discountValue <= 0) nextErrors["discount.value"] = "Enter a discount above 0.";
      else if (form.discountType === "percentage" && discountValue > 90) nextErrors["discount.value"] = "Percentage discounts are limited to 90%.";
      else if (discountValue > 10_000_000) nextErrors["discount.value"] = "Enter a smaller amount.";
    }
    if (form.scope !== "all" && form.ids.length === 0) nextErrors["target.ids"] = "Choose at least one target.";

    const ctaLabel = form.ctaLabel.trim();
    const ctaHref = form.ctaHref.trim();
    if (ctaLabel && !ctaHref) nextErrors["cta.href"] = "Add a link for the button.";
    if (ctaHref && !ctaLabel) nextErrors["cta.label"] = "Add a button label.";
    if (ctaLabel.length > 60) nextErrors["cta.label"] = "Use 60 characters or fewer.";
    if (ctaHref.length > 300) nextErrors["cta.href"] = "Use 300 characters or fewer.";

    const windowMessage = windowError(form.startsAt, form.endsAt);
    if (windowMessage) nextErrors.endsAt = windowMessage;
    const displayOrder = toNumberOrNull(form.displayOrder);
    if (displayOrder === null || !Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 1000) nextErrors.displayOrder = "Enter a whole number from 0 to 1000.";
    setLocalErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    // Send every field on PATCH too: the API's partial schema would otherwise reset
    // omitted defaulted fields (discount, target, active, displayOrder).
    const payload: OfferPayload = {
      title,
      eyebrow: form.eyebrow.trim() || null,
      description,
      type: form.type,
      discount: form.hasDiscount && discountValue !== null ? { type: form.discountType, value: discountValue } : null,
      target: { scope: form.scope, ids: form.scope === "all" ? [] : form.ids },
      couponCode: form.couponCode.trim() ? form.couponCode.trim().toUpperCase() : null,
      image: form.image[0] ?? null,
      mobileImage: form.mobileImage[0] ?? null,
      cta: ctaLabel && ctaHref ? { label: ctaLabel, href: ctaHref } : null,
      startsAt: istInputToIso(form.startsAt),
      endsAt: istInputToIso(form.endsAt),
      active: form.active,
      displayOrder: displayOrder ?? 0,
    };

    const original = offer ? originalPayload(offer) : null;
    const touchesPrices = payload.discount !== null || Boolean(original?.discount);
    if (touchesPrices && (!original || impactKey(payload) !== impactKey(original))) {
      mutation.clearError();
      setConfirming(payload);
      return;
    }
    void save(payload);
  }

  const hasFieldErrors = Object.keys(mutation.fieldErrors).some((key) => key !== "_form");

  return (
    <AdminDialog
      open
      size="lg"
      onClose={() => {
        if (!mutation.pending) onClose();
      }}
      title={confirming ? "Confirm price change" : offer ? `Edit “${offer.title}”` : "New offer"}
      description={confirming ? undefined : "Offers appear on the website. A price discount also changes live product prices while the offer runs."}
      footer={
        confirming ? (
          <>
            <AdminButton variant="ghost" onClick={() => setConfirming(null)} disabled={mutation.pending}>
              Back to editing
            </AdminButton>
            <AdminButton variant="primary" onClick={() => save(confirming)} loading={mutation.pending}>
              Save and update prices
            </AdminButton>
          </>
        ) : (
          <>
            <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
              Cancel
            </AdminButton>
            <AdminButton variant="primary" type="submit" form={formId} loading={mutation.pending}>
              {offer ? "Save changes" : "Create offer"}
            </AdminButton>
          </>
        )
      }
    >
      {confirming ? (
        <div className="space-y-4">
          <InlineAlert tone="warning">
            {confirming.discount
              ? "Live website prices change as soon as you save, for every targeted product while the offer is running."
              : "This removes the offer’s price discount. Targeted products go back to their regular website prices immediately."}
          </InlineAlert>
          <KeyValue
            items={[
              { label: "Price discount", value: confirming.discount ? discountLabel(confirming.discount) : "None" },
              { label: "Applies to", value: targetSummary(confirming.target, names) },
              { label: "Runs", value: offerWindow(confirming.startsAt, confirming.endsAt) },
              { label: "Status", value: confirming.active ? "Active" : "Inactive" },
            ]}
          />
          {offer?.discount && confirming.discount && (
            <p className="text-[0.8125rem] text-muted">
              Previously: {discountLabel(offer.discount)} on {targetSummary(offer.target, names).toLowerCase()}.
            </p>
          )}
          <p className="text-[0.8125rem] text-muted">Customers get the single best price between a product’s own discount and any running offer — discounts aren’t combined.</p>
          <MutationAlert error={mutation.error} />
        </div>
      ) : (
        <form id={formId} onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <SectionTitle first>Content</SectionTitle>
          <TextInput label="Title" required maxLength={120} value={form.title} onChange={(event) => set("title", event.target.value)} error={errors.title} containerClassName="sm:col-span-2" />
          <TextInput label="Eyebrow" maxLength={80} value={form.eyebrow} onChange={(event) => set("eyebrow", event.target.value)} error={errors.eyebrow} placeholder="e.g. Festive edit" hint="Short line shown above the title." />
          <SelectInput label="Offer type" required options={offerTypeOptions} value={form.type} onChange={(event) => set("type", event.target.value as OfferType)} error={errors.type} />
          <TextArea label="Description" required rows={3} maxLength={500} value={form.description} onChange={(event) => set("description", event.target.value)} error={errors.description} containerClassName="sm:col-span-2" />

          <SectionTitle>Price discount</SectionTitle>
          <CheckboxInput
            className="sm:col-span-2"
            label="Apply a price discount"
            description="Leave off for a display-only banner (e.g. a coupon promotion)."
            checked={form.hasDiscount}
            onChange={(event) => set("hasDiscount", event.target.checked)}
          />
          {form.hasDiscount && (
            <>
              <InlineAlert tone="warning" className="sm:col-span-2">
                This changes live website prices for the targeted products while the offer is running.
              </InlineAlert>
              <SelectInput label="Discount type" required options={discountTypeOptions} value={form.discountType} onChange={(event) => set("discountType", event.target.value as DiscountType)} error={errors["discount.type"]} />
              <NumberInput
                label={form.discountType === "percentage" ? "Discount (%)" : "Discount per product (₹)"}
                required
                min={0}
                step="0.01"
                value={form.discountValue}
                onChange={(event) => set("discountValue", event.target.value)}
                error={pickError(errors, "discount")}
                hint={form.discountType === "percentage" ? "Up to 90%." : undefined}
              />
            </>
          )}

          <SectionTitle>Applies to</SectionTitle>
          <SelectInput
            label="Target"
            required
            options={scopeOptions}
            value={form.scope}
            onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value as TargetScope, ids: [] }))}
            error={errors["target.scope"]}
          />
          <div className="hidden sm:block" />
          {form.scope !== "all" && (
            <div className="space-y-2 sm:col-span-2">
              {form.scope === "metal" && <CheckboxGroup label="Metals" options={metalOptions} value={form.ids} onChange={(ids) => set("ids", ids)} error={pickError(errors, "target")} />}
              {form.scope === "categories" &&
                (categories.error ? (
                  <InlineAlert tone="warning">Categories couldn’t be loaded: {categories.error.message}</InlineAlert>
                ) : !categories.data ? (
                  <LoadingBlock rows={2} />
                ) : (
                  <CheckboxGroup
                    label="Jewellery types"
                    options={categoryOptions}
                    value={form.ids}
                    onChange={(ids) => set("ids", ids)}
                    error={pickError(errors, "target")}
                    hint="Price discounts match a product’s jewellery type."
                  />
                ))}
              {form.scope === "collections" &&
                (collections.error ? (
                  <InlineAlert tone="warning">Collections couldn’t be loaded: {collections.error.message}</InlineAlert>
                ) : !collections.data ? (
                  <LoadingBlock rows={2} />
                ) : (
                  <CheckboxGroup label="Collections" options={collectionOptions} value={form.ids} onChange={(ids) => set("ids", ids)} error={pickError(errors, "target")} />
                ))}
              {form.scope === "products" && (
                <>
                  <ProductSearch
                    label="Products"
                    excludeIds={form.ids}
                    error={pickError(errors, "target")}
                    onPick={(product) => {
                      setKnownProducts((current) => ({ ...current, [product.id]: `${product.name} (${product.sku})` }));
                      setForm((current) => ({ ...current, ids: [...current.ids, product.id] }));
                    }}
                  />
                  <ProductChips ids={form.ids} known={knownProducts} onRemove={(id) => setForm((current) => ({ ...current, ids: current.ids.filter((item) => item !== id) }))} />
                </>
              )}
            </div>
          )}

          <SectionTitle>Coupon &amp; call to action</SectionTitle>
          <TextInput
            label="Linked coupon code"
            maxLength={30}
            list={listId}
            autoComplete="off"
            value={form.couponCode}
            onChange={(event) => set("couponCode", event.target.value.toUpperCase().replace(/\s+/g, ""))}
            error={errors.couponCode}
            hint="Optional. Must match an existing coupon; shown on the offer."
            className="uppercase tracking-[0.06em]"
          />
          <datalist id={listId}>
            {(coupons.data?.items ?? []).map((coupon) => (
              <option key={coupon.id} value={coupon.code}>
                {coupon.active ? "Active" : "Inactive"}
              </option>
            ))}
          </datalist>
          <div className="hidden sm:block" />
          <TextInput label="Button label" maxLength={60} value={form.ctaLabel} onChange={(event) => set("ctaLabel", event.target.value)} error={errors["cta.label"] ?? (errors.cta && !errors["cta.href"] ? errors.cta : undefined)} placeholder="e.g. Shop the offer" />
          <TextInput label="Button link" maxLength={300} value={form.ctaHref} onChange={(event) => set("ctaHref", event.target.value)} error={errors["cta.href"]} placeholder="/collections/festive" hint="A site path or full URL." />

          <SectionTitle>Images</SectionTitle>
          <ImagesInput label="Desktop image" max={1} value={form.image} onChange={(images) => set("image", images)} error={pickError(errors, "image")} />
          <ImagesInput label="Mobile image (optional)" max={1} value={form.mobileImage} onChange={(images) => set("mobileImage", images)} error={pickError(errors, "mobileImage")} />

          <SectionTitle>Schedule &amp; display</SectionTitle>
          <TextInput label="Starts (IST)" type="datetime-local" value={form.startsAt} onChange={(event) => set("startsAt", event.target.value)} error={errors.startsAt} hint="Leave empty to start now." />
          <TextInput label="Ends (IST)" type="datetime-local" value={form.endsAt} onChange={(event) => set("endsAt", event.target.value)} error={errors.endsAt} hint="Leave empty for no end date." />
          <NumberInput label="Display order" min={0} max={1000} step="1" inputMode="numeric" value={form.displayOrder} onChange={(event) => set("displayOrder", event.target.value)} error={errors.displayOrder} hint="Lower numbers show first." />
          <div className="flex items-end pb-2">
            <CheckboxInput label="Active" description="Inactive offers are hidden and don’t discount prices." checked={form.active} onChange={(event) => set("active", event.target.checked)} />
          </div>

          <MutationAlert error={mutation.error && !hasFieldErrors ? mutation.error : null} className="sm:col-span-2" />
          {hasFieldErrors && <InlineAlert className="sm:col-span-2">Please review the highlighted fields.</InlineAlert>}
        </form>
      )}
    </AdminDialog>
  );
}
