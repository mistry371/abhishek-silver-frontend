"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CheckboxInput, controlClass, FormSection, ImagesInput, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, AdminLinkButton } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError, type ImageAsset, type Paginated } from "@/lib/admin/client";
import { puritiesByMetal, weight } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";
import { ImageStrip, MutationAlert, OptionGroup, PriceBreakdownView } from "./shared";
import type { Category, Collection, MerchandisingFlags, ProductDetail, StockLocation, VendorOption } from "./types";
import {
  asApiError,
  CUSTOMIZATION_OPTIONS,
  endOfIstDay,
  fieldError,
  FLAG_KEYS,
  flagLabels,
  GENDER_OPTIONS,
  istDateOf,
  MAKING_TYPE_OPTIONS,
  METAL_OPTIONS,
  parseSizes,
  PRODUCT_STATUS_OPTIONS,
  purityOptions,
  SIZING_OPTIONS,
  slugify,
  text,
  toggle,
} from "./utils";

type ProductField =
  | "name"
  | "slug"
  | "shortDescription"
  | "description"
  | "categoryId"
  | "subcategoryId"
  | "collectionIds"
  | "gender"
  | "customization"
  | "images"
  | "video"
  | "seo"
  | "status"
  | "flags"
  | "discount"
  | "sku"
  | "barcode"
  | "metal"
  | "purity"
  | "netWeight"
  | "grossWeight"
  | "stoneWeight"
  | "stoneDetails"
  | "sizing"
  | "sizeOptions"
  | "defaultSize"
  | "sizeWeights"
  | "unavailableSizes"
  | "lowStockThreshold"
  | "makingType"
  | "makingValue"
  | "stoneCharges"
  | "otherCharges"
  | "purchasePrice"
  | "vendorId";

/** Mirrors `fieldPermission` in the API's catalogue module. */
const FIELD_PERMISSION: Record<ProductField, string> = {
  name: "products:edit_content",
  slug: "products:edit_content",
  shortDescription: "products:edit_content",
  description: "products:edit_content",
  categoryId: "products:edit_content",
  subcategoryId: "products:edit_content",
  collectionIds: "products:edit_content",
  gender: "products:edit_content",
  customization: "products:edit_content",
  images: "products:edit_content",
  video: "products:edit_content",
  seo: "products:edit_content",
  status: "products:edit_content",
  flags: "products:edit_merchandising",
  discount: "products:edit_merchandising",
  sku: "products:edit_inventory",
  barcode: "products:edit_inventory",
  metal: "products:edit_inventory",
  purity: "products:edit_inventory",
  netWeight: "products:edit_inventory",
  grossWeight: "products:edit_inventory",
  stoneWeight: "products:edit_inventory",
  stoneDetails: "products:edit_inventory",
  sizing: "products:edit_inventory",
  sizeOptions: "products:edit_inventory",
  defaultSize: "products:edit_inventory",
  sizeWeights: "products:edit_inventory",
  unavailableSizes: "products:edit_inventory",
  lowStockThreshold: "products:edit_inventory",
  makingType: "products:edit_pricing",
  makingValue: "products:edit_pricing",
  stoneCharges: "products:edit_pricing",
  otherCharges: "products:edit_pricing",
  purchasePrice: "products:view_confidential",
  vendorId: "products:view_confidential",
};

const PRODUCT_FIELDS = Object.keys(FIELD_PERMISSION) as ProductField[];
const CONFIDENTIAL_FIELDS: readonly ProductField[] = ["purchasePrice", "vendorId"];
const PRICE_FIELDS: readonly ProductField[] = ["metal", "purity", "netWeight", "sizeWeights", "makingType", "makingValue", "stoneCharges", "otherCharges", "discount"];
const KNOWN_ERROR_KEYS: readonly string[] = [...PRODUCT_FIELDS, "initialStock"];
const VENDOR_QUERY = { pageSize: 100 };
const NO_FLAGS: MerchandisingFlags = { featured: false, bestSeller: false, trending: false, newArrival: false, limited: false };

interface ProductFormState {
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  collectionIds: string[];
  gender: string;
  status: string;
  metal: string;
  purity: string;
  netWeight: string;
  grossWeight: string;
  stoneWeight: string;
  stoneDetails: string;
  makingType: string;
  makingValue: string;
  stoneCharges: string;
  otherCharges: string;
  discountType: string;
  discountValue: string;
  discountLabel: string;
  discountEndsAt: string;
  sizing: string;
  sizeOptions: string;
  defaultSize: string;
  sizeWeights: Record<string, string>;
  unavailableSizes: string[];
  customization: string[];
  images: ImageAsset[];
  videoUrl: string;
  flags: MerchandisingFlags;
  seoTitle: string;
  seoDescription: string;
  lowStockThreshold: string;
  purchasePrice: string;
  vendorId: string;
  initialQuantity: string;
  initialLocationId: string;
}

function toForm(product?: ProductDetail): ProductFormState {
  if (!product) {
    return {
      name: "",
      slug: "",
      sku: "",
      barcode: "",
      shortDescription: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
      collectionIds: [],
      gender: "unisex",
      status: "draft",
      metal: "silver",
      purity: "925",
      netWeight: "",
      grossWeight: "",
      stoneWeight: "",
      stoneDetails: "",
      makingType: "per_gram",
      makingValue: "",
      stoneCharges: "",
      otherCharges: "",
      discountType: "",
      discountValue: "",
      discountLabel: "",
      discountEndsAt: "",
      sizing: "",
      sizeOptions: "",
      defaultSize: "",
      sizeWeights: {},
      unavailableSizes: [],
      customization: [],
      images: [],
      videoUrl: "",
      flags: { ...NO_FLAGS },
      seoTitle: "",
      seoDescription: "",
      lowStockThreshold: "",
      purchasePrice: "",
      vendorId: "",
      initialQuantity: "",
      initialLocationId: "",
    };
  }
  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    barcode: product.barcode ?? "",
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? "",
    collectionIds: [...product.collectionIds],
    gender: product.gender,
    status: product.status,
    metal: product.metal,
    purity: product.purity,
    netWeight: text(product.netWeight),
    grossWeight: text(product.grossWeight),
    stoneWeight: text(product.stoneWeight),
    stoneDetails: product.stoneDetails ?? "",
    makingType: product.makingType,
    makingValue: text(product.makingValue),
    stoneCharges: text(product.stoneCharges),
    otherCharges: text(product.otherCharges),
    discountType: product.discount?.type ?? "",
    discountValue: text(product.discount?.value),
    discountLabel: product.discount?.label ?? "",
    discountEndsAt: product.discount?.endsAt ? istDateOf(product.discount.endsAt) : "",
    sizing: product.sizing ?? "",
    sizeOptions: product.sizeOptions.join(", "),
    defaultSize: product.defaultSize ?? "",
    sizeWeights: Object.fromEntries(Object.entries(product.sizeWeights ?? {}).map(([size, grams]) => [size, String(grams)])),
    unavailableSizes: [...product.unavailableSizes],
    customization: [...product.customization],
    images: product.images,
    videoUrl: product.video?.url ?? "",
    flags: { ...NO_FLAGS, ...product.flags },
    seoTitle: product.seo?.title ?? "",
    seoDescription: product.seo?.description ?? "",
    lowStockThreshold: text(product.lowStockThreshold),
    purchasePrice: text(product.purchasePrice),
    vendorId: product.vendorId ?? "",
    initialQuantity: "",
    initialLocationId: "",
  };
}

/** API-shaped values. Used both for the payload and (applied to the saved product) as the diff baseline. */
function buildValues(form: ProductFormState, base?: ProductDetail): Record<ProductField, unknown> {
  const sizes = parseSizes(form.sizeOptions);
  const uniqueSizes = [...new Set(sizes)];
  const videoUrl = form.videoUrl.trim();
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    sku: form.sku.trim().toUpperCase(),
    barcode: form.barcode.trim() || null,
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId || null,
    subcategoryId: form.subcategoryId || null,
    collectionIds: [...form.collectionIds].sort(),
    gender: form.gender || null,
    customization: CUSTOMIZATION_OPTIONS.map((option) => option.value).filter((key) => form.customization.includes(key)),
    images: form.images,
    video: !videoUrl ? null : base?.video && base.video.url === videoUrl ? base.video : { url: videoUrl },
    seo: { ...(base?.seo ?? {}), title: form.seoTitle.trim() || undefined, description: form.seoDescription.trim() || undefined },
    status: form.status,
    flags: {
      featured: form.flags.featured,
      bestSeller: form.flags.bestSeller,
      trending: form.flags.trending,
      newArrival: form.flags.newArrival,
      limited: form.flags.limited,
    },
    discount: form.discountType
      ? {
          type: form.discountType,
          value: toNumberOrNull(form.discountValue),
          label: form.discountLabel.trim() || undefined,
          endsAt: form.discountEndsAt ? endOfIstDay(form.discountEndsAt) : undefined,
        }
      : null,
    metal: form.metal || null,
    purity: form.purity || null,
    netWeight: toNumberOrNull(form.netWeight),
    grossWeight: toNumberOrNull(form.grossWeight),
    stoneWeight: toNumberOrNull(form.stoneWeight),
    stoneDetails: form.stoneDetails.trim() || null,
    sizing: form.sizing || null,
    sizeOptions: sizes,
    defaultSize: form.defaultSize && sizes.includes(form.defaultSize) ? form.defaultSize : null,
    sizeWeights: Object.fromEntries(uniqueSizes.filter((size) => (form.sizeWeights[size] ?? "").trim() !== "").map((size) => [size, toNumberOrNull(form.sizeWeights[size] ?? "")])),
    unavailableSizes: uniqueSizes.filter((size) => form.unavailableSizes.includes(size)),
    lowStockThreshold: toNumberOrNull(form.lowStockThreshold),
    makingType: form.makingType || null,
    makingValue: toNumberOrNull(form.makingValue),
    stoneCharges: toNumberOrNull(form.stoneCharges) ?? 0,
    otherCharges: toNumberOrNull(form.otherCharges) ?? 0,
    purchasePrice: toNumberOrNull(form.purchasePrice),
    vendorId: form.vendorId || null,
  } as Record<ProductField, unknown>;
}

function pickFields(values: Record<ProductField, unknown>, fields: readonly ProductField[]) {
  return Object.fromEntries(fields.map((field) => [field, values[field]]));
}

export function ProductForm({ product, onSaved, onReload, aside }: { product?: ProductDetail; onSaved?: (product: ProductDetail) => void; onReload?: () => void; aside?: ReactNode }) {
  const mode = product ? "edit" : "create";
  const router = useRouter();
  const { can } = useAdmin();
  const canConfidential = can("products:view_confidential");
  const canAddStock = mode === "create" && can("inventory:adjust");
  const editable = (field: ProductField) => (mode === "create" ? !CONFIDENTIAL_FIELDS.includes(field) || canConfidential : can(FIELD_PERMISSION[field]));
  const showConfidential = canConfidential && (mode === "create" || (product !== undefined && "purchasePrice" in product));

  const [synced, setSynced] = useState(product);
  const [form, setForm] = useState(() => toForm(product));
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [error, setError] = useState<AdminApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // A newer copy of the product (after saving or reloading) replaces the form.
  if (product !== synced) {
    setSynced(product);
    setForm(toForm(product));
    setError(null);
  }

  const categoriesRes = useAdminResource<Category[]>("/categories");
  const collectionsRes = useAdminResource<Collection[]>("/collections");
  const locationsRes = useAdminResource<StockLocation[]>(canAddStock ? "/locations" : null);
  const vendorsRes = useAdminResource<Paginated<VendorOption>>(showConfidential ? "/vendors" : null, VENDOR_QUERY);

  const typeCategories = useMemo(() => (categoriesRes.data ?? []).filter((category) => category.group === "type"), [categoriesRes.data]);
  const baseline = useMemo(() => (product ? buildValues(toForm(product), product) : null), [product]);

  const values = buildValues(form, product);
  const changed = baseline ? PRODUCT_FIELDS.filter((field) => JSON.stringify(values[field]) !== JSON.stringify(baseline[field])) : [];
  const patchFields = changed.filter((field) => can(FIELD_PERMISSION[field]));
  const canEditAnything = mode === "create" || PRODUCT_FIELDS.some((field) => can(FIELD_PERMISSION[field]));
  const pricingChanged = changed.some((field) => PRICE_FIELDS.includes(field));

  const sizes = [...new Set(parseSizes(form.sizeOptions))];
  const selectedCategory = typeCategories.find((category) => category.id === form.categoryId);
  const fe = (...keys: string[]) => fieldError(error?.fieldErrors, ...keys);
  const set = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const lockedNote = (...permissions: string[]) => (mode === "edit" && !permissions.some((permission) => can(permission)) ? "View only — your role can't change these fields." : undefined);

  const categoryOptions = typeCategories.map((category) => ({ value: category.id, label: category.active ? category.name : `${category.name} (inactive)` }));
  if (product?.category && !categoryOptions.some((option) => option.value === product.categoryId)) {
    categoryOptions.unshift({ value: product.categoryId, label: product.category.name });
  }
  const vendorOptions = (vendorsRes.data?.items ?? []).map((vendor) => ({ value: vendor.id, label: vendor.status === "inactive" ? `${vendor.name} (inactive)` : vendor.name }));
  if (product?.vendor && !vendorOptions.some((option) => option.value === product.vendor?.id)) {
    vendorOptions.unshift({ value: product.vendor.id, label: product.vendor.name });
  }
  const locationOptions = (locationsRes.data ?? []).filter((location) => location.active).map((location) => ({ value: location.id, label: location.name }));

  const makingLabel = form.makingType === "percentage" ? "Making charge (% of metal value)" : form.makingType === "fixed" ? "Making charge (₹, fixed)" : "Making charge (₹ per gram)";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (!product) {
        const { purchasePrice, vendorId, lowStockThreshold, ...rest } = values;
        const payload: Record<string, unknown> = { ...rest };
        if (canConfidential) Object.assign(payload, { purchasePrice, vendorId });
        if (form.lowStockThreshold.trim() !== "") payload.lowStockThreshold = lowStockThreshold;
        if (canAddStock && form.initialQuantity.trim() !== "") {
          payload.initialStock = { locationId: form.initialLocationId || null, quantity: toNumberOrNull(form.initialQuantity) };
        }
        const created = await adminApi.post<ProductDetail>("/products", payload);
        toast({ title: "Product created", description: `${created.sku} · ${created.name}`, tone: "success" });
        router.push(`/admin/products/${created.id}`);
        return;
      }
      if (!patchFields.length) return;
      const updated = await adminApi.patch<ProductDetail>(`/products/${product.id}`, pickFields(values, patchFields));
      toast({ title: "Changes saved", tone: "success" });
      onSaved?.(updated);
    } catch (caught) {
      const apiError = asApiError(caught);
      setError(apiError);
      if (apiError.status === 403) toast({ title: apiError.message, tone: "error" });
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      setSaving(false);
    }
  }

  const sections = (
    <div className="min-w-0 space-y-6">
      <FormSection title="Basics" description={lockedNote("products:edit_content", "products:edit_inventory")}>
        <TextInput
          label="Name"
          required
          maxLength={160}
          value={form.name}
          disabled={!editable("name")}
          error={fe("name")}
          onChange={(event) => {
            const name = event.target.value;
            setForm((previous) => ({ ...previous, name, slug: slugTouched ? previous.slug : slugify(name) }));
          }}
        />
        <TextInput
          label="URL slug"
          required
          maxLength={160}
          value={form.slug}
          disabled={!editable("slug")}
          error={fe("slug")}
          hint={form.slug ? `/product/${form.slug}` : "Generated from the name."}
          onChange={(event) => {
            const slug = event.target.value.toLowerCase();
            setSlugTouched(slug !== "");
            setForm((previous) => ({ ...previous, slug: slug === "" ? slugify(previous.name) : slug }));
          }}
        />
        <TextInput
          label="SKU"
          required
          maxLength={40}
          value={form.sku}
          disabled={!editable("sku")}
          error={fe("sku")}
          hint="2–40 letters, numbers or hyphens."
          onChange={(event) => set("sku", event.target.value.toUpperCase())}
        />
        <TextInput label="Barcode" maxLength={64} value={form.barcode} disabled={!editable("barcode")} error={fe("barcode")} onChange={(event) => set("barcode", event.target.value)} />
        <SelectInput
          label="Category"
          required
          placeholder={categoriesRes.loading ? "Loading…" : "Choose a jewellery type"}
          options={categoryOptions}
          value={form.categoryId}
          disabled={!editable("categoryId")}
          error={fe("categoryId")}
          hint={categoriesRes.error ? `Couldn't load categories: ${categoriesRes.error.message}` : undefined}
          onChange={(event) => {
            const categoryId = event.target.value;
            setForm((previous) => ({
              ...previous,
              categoryId,
              subcategoryId: typeCategories.find((category) => category.id === categoryId)?.subcategories.some((sub) => sub.id === previous.subcategoryId) ? previous.subcategoryId : "",
            }));
          }}
        />
        <SelectInput
          label="Subcategory"
          placeholder={form.categoryId && selectedCategory && selectedCategory.subcategories.length === 0 ? "No subcategories for this type" : "None"}
          options={(selectedCategory?.subcategories ?? []).map((sub) => ({ value: sub.id, label: sub.active ? sub.name : `${sub.name} (inactive)` }))}
          value={form.subcategoryId}
          disabled={!editable("subcategoryId") || !selectedCategory?.subcategories.length}
          error={fe("subcategoryId")}
          onChange={(event) => set("subcategoryId", event.target.value)}
        />
        <SelectInput label="Gender" options={GENDER_OPTIONS} value={form.gender} disabled={!editable("gender")} error={fe("gender")} onChange={(event) => set("gender", event.target.value)} />
        <SelectInput
          label="Status"
          options={PRODUCT_STATUS_OPTIONS}
          value={form.status}
          disabled={!editable("status")}
          error={fe("status")}
          hint={form.status === "active" ? "Active products need at least one image and a metal rate." : "Draft and disabled products are hidden from the website."}
          onChange={(event) => set("status", event.target.value)}
        />
        <TextInput
          label="Short description"
          maxLength={300}
          containerClassName="sm:col-span-2"
          value={form.shortDescription}
          disabled={!editable("shortDescription")}
          error={fe("shortDescription")}
          onChange={(event) => set("shortDescription", event.target.value)}
        />
        <TextArea
          label="Description"
          maxLength={5000}
          rows={5}
          containerClassName="sm:col-span-2"
          value={form.description}
          disabled={!editable("description")}
          error={fe("description")}
          onChange={(event) => set("description", event.target.value)}
        />
        <OptionGroup legend="Collections" error={fe("collectionIds")} disabled={!editable("collectionIds")}>
          {collectionsRes.error ? (
            <p className="text-[0.8125rem] text-danger">Couldn&apos;t load collections: {collectionsRes.error.message}</p>
          ) : !collectionsRes.data ? (
            <p className="text-[0.8125rem] text-muted">Loading collections…</p>
          ) : collectionsRes.data.length === 0 ? (
            <p className="text-[0.8125rem] text-muted">No collections yet.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {collectionsRes.data.map((collection) => (
                <CheckboxInput
                  key={collection.id}
                  label={collection.name}
                  description={collection.active ? undefined : "Inactive"}
                  checked={form.collectionIds.includes(collection.id)}
                  onChange={() => setForm((previous) => ({ ...previous, collectionIds: toggle(previous.collectionIds, collection.id) }))}
                />
              ))}
            </div>
          )}
        </OptionGroup>
      </FormSection>

      <FormSection title="Jewellery attributes" description={lockedNote("products:edit_inventory")}>
        <SelectInput
          label="Metal"
          required
          options={METAL_OPTIONS}
          value={form.metal}
          disabled={!editable("metal")}
          error={fe("metal")}
          onChange={(event) => {
            const metal = event.target.value;
            setForm((previous) => ({ ...previous, metal, purity: (puritiesByMetal[metal] ?? []).includes(previous.purity) ? previous.purity : "" }));
          }}
        />
        <SelectInput
          label="Purity"
          required
          placeholder="Choose purity"
          options={purityOptions(form.metal)}
          value={form.purity}
          disabled={!editable("purity")}
          error={fe("purity")}
          onChange={(event) => set("purity", event.target.value)}
        />
        <NumberInput label="Net weight (g)" required min={0} value={form.netWeight} disabled={!editable("netWeight")} error={fe("netWeight")} hint="Metal weight used for pricing." onChange={(event) => set("netWeight", event.target.value)} />
        <NumberInput
          label="Gross weight (g)"
          min={0}
          value={form.grossWeight}
          disabled={!editable("grossWeight")}
          error={fe("grossWeight")}
          hint="Optional. Can't be less than net weight."
          onChange={(event) => set("grossWeight", event.target.value)}
        />
        <NumberInput label="Stone weight" min={0} value={form.stoneWeight} disabled={!editable("stoneWeight")} error={fe("stoneWeight")} onChange={(event) => set("stoneWeight", event.target.value)} />
        <TextInput
          label="Stone details"
          maxLength={300}
          value={form.stoneDetails}
          disabled={!editable("stoneDetails")}
          error={fe("stoneDetails")}
          placeholder="e.g. 12 cubic zirconia, 0.4 ct"
          onChange={(event) => set("stoneDetails", event.target.value)}
        />
      </FormSection>

      <FormSection title="Pricing" description={lockedNote("products:edit_pricing", "products:edit_merchandising") ?? "The website price is calculated by the server from the live metal rate."}>
        <SelectInput label="Making charge type" required options={MAKING_TYPE_OPTIONS} value={form.makingType} disabled={!editable("makingType")} error={fe("makingType")} onChange={(event) => set("makingType", event.target.value)} />
        <NumberInput label={makingLabel} required min={0} value={form.makingValue} disabled={!editable("makingValue")} error={fe("makingValue")} onChange={(event) => set("makingValue", event.target.value)} />
        <NumberInput label="Stone charges (₹)" min={0} value={form.stoneCharges} disabled={!editable("stoneCharges")} error={fe("stoneCharges")} placeholder="0" onChange={(event) => set("stoneCharges", event.target.value)} />
        <NumberInput label="Other charges (₹)" min={0} value={form.otherCharges} disabled={!editable("otherCharges")} error={fe("otherCharges")} placeholder="0" onChange={(event) => set("otherCharges", event.target.value)} />

        <div className="border-t border-line pt-4 sm:col-span-2">
          <p className="text-[0.8125rem] font-medium text-ink">Product discount</p>
          {!editable("discount") && mode === "edit" && <p className="mt-0.5 text-[0.75rem] text-muted">Requires merchandising permission.</p>}
        </div>
        <SelectInput
          label="Discount type"
          placeholder="No discount"
          options={[
            { value: "percentage", label: "Percentage" },
            { value: "fixed", label: "Fixed amount (₹)" },
          ]}
          value={form.discountType}
          disabled={!editable("discount")}
          error={fe("discount.type")}
          onChange={(event) => set("discountType", event.target.value)}
        />
        {form.discountType && (
          <>
            <NumberInput
              label={form.discountType === "percentage" ? "Discount (%)" : "Discount (₹)"}
              required
              min={0}
              value={form.discountValue}
              disabled={!editable("discount")}
              error={fe("discount.value")}
              hint={form.discountType === "percentage" ? "Up to 90%." : undefined}
              onChange={(event) => set("discountValue", event.target.value)}
            />
            <TextInput
              label="Discount label"
              maxLength={60}
              placeholder="e.g. Festive offer"
              value={form.discountLabel}
              disabled={!editable("discount")}
              error={fe("discount.label")}
              onChange={(event) => set("discountLabel", event.target.value)}
            />
            <TextInput
              label="Ends on"
              type="date"
              value={form.discountEndsAt}
              disabled={!editable("discount")}
              error={fe("discount.endsAt")}
              hint="Optional. Ends at 11:59 pm IST."
              onChange={(event) => set("discountEndsAt", event.target.value)}
            />
          </>
        )}
        {!form.discountType && fe("discount") && <p className="text-[0.75rem] text-danger sm:col-span-2">{fe("discount")}</p>}

        {product && (
          <div className="border-t border-line pt-4 sm:col-span-2">
            <p className="mb-2 text-[0.8125rem] font-medium text-ink">Current price</p>
            <PriceBreakdownView pricing={product.pricing} pricingError={product.pricingError} />
            <p className={cn("mt-2 text-[0.75rem]", pricingChanged ? "text-warning" : "text-muted")}>
              {pricingChanged ? "You have unsaved pricing changes — the price is recalculated after you save." : "Based on the saved product and today's metal rate."}
            </p>
          </div>
        )}
      </FormSection>

      <FormSection title="Sizes" description={lockedNote("products:edit_inventory")}>
        <SelectInput label="Sizing type" placeholder="No sizes" options={SIZING_OPTIONS} value={form.sizing} disabled={!editable("sizing")} error={fe("sizing")} onChange={(event) => set("sizing", event.target.value)} />
        <TextInput
          label="Sizes offered"
          value={form.sizeOptions}
          disabled={!editable("sizeOptions")}
          error={fe("sizeOptions")}
          placeholder="e.g. 10, 12, 14"
          hint="Comma separated, in display order."
          onChange={(event) => set("sizeOptions", event.target.value)}
        />
        <SelectInput
          label="Default size"
          placeholder="None"
          options={sizes.map((size) => ({ value: size, label: size }))}
          value={sizes.includes(form.defaultSize) ? form.defaultSize : ""}
          disabled={!editable("defaultSize") || sizes.length === 0}
          error={fe("defaultSize")}
          hint="The size the listed price and net weight refer to."
          onChange={(event) => set("defaultSize", event.target.value)}
        />
        {sizes.length > 0 && (
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">Per-size weight &amp; availability</p>
            <div className="overflow-x-auto border border-line">
              <table className="w-full min-w-[22rem] text-left text-[0.8125rem]">
                <thead>
                  <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                    <th scope="col" className="px-3 py-2 font-medium">
                      Size
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Net weight (g)
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Unavailable
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((size) => (
                    <tr key={size} className="border-b border-line last:border-0">
                      <td className="px-3 py-2 text-ink">
                        {size}
                        {form.defaultSize === size && <span className="ml-2 text-[0.6875rem] uppercase tracking-[0.1em] text-muted">Default</span>}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min={0}
                          aria-label={`Net weight for size ${size}`}
                          placeholder={form.netWeight || "Net weight"}
                          value={form.sizeWeights[size] ?? ""}
                          disabled={!editable("sizeWeights")}
                          onChange={(event) => {
                            const grams = event.target.value;
                            setForm((previous) => ({ ...previous, sizeWeights: { ...previous.sizeWeights, [size]: grams } }));
                          }}
                          className={controlClass(fe(`sizeWeights.${size}`), "h-9 max-w-[9rem]")}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          aria-label={`Size ${size} unavailable`}
                          checked={form.unavailableSizes.includes(size)}
                          disabled={!editable("unavailableSizes")}
                          onChange={() => setForm((previous) => ({ ...previous, unavailableSizes: toggle(previous.unavailableSizes, size) }))}
                          className="h-4 w-4 accent-ink"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fe("sizeWeights") || fe("unavailableSizes") ? (
              <p role="alert" className="mt-1 text-[0.75rem] text-danger">
                {fe("sizeWeights") ?? fe("unavailableSizes")}
              </p>
            ) : (
              <p className="mt-1 text-[0.75rem] text-muted">Leave a weight blank to use the product net weight{form.netWeight ? ` (${weight(toNumberOrNull(form.netWeight))})` : ""}.</p>
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="Personalisation" description={lockedNote("products:edit_content") ?? "Options customers can add when ordering."}>
        <OptionGroup legend="Offer" error={fe("customization")} disabled={!editable("customization")}>
          <div className="grid gap-3 sm:grid-cols-3">
            {CUSTOMIZATION_OPTIONS.map((option) => (
              <CheckboxInput
                key={option.value}
                label={option.label}
                description={option.description}
                checked={form.customization.includes(option.value)}
                onChange={() => setForm((previous) => ({ ...previous, customization: toggle(previous.customization, option.value) }))}
              />
            ))}
          </div>
        </OptionGroup>
      </FormSection>

      <FormSection title="Media" description={lockedNote("products:edit_content") ?? "Up to 12 images. The first image is the main photo."}>
        {editable("images") ? (
          <ImagesInput value={form.images} onChange={(images) => set("images", images)} max={12} error={fe("images")} />
        ) : (
          <ImageStrip images={form.images} />
        )}
        <TextInput
          label="Video URL"
          type="url"
          maxLength={2000}
          containerClassName="sm:col-span-2"
          placeholder="https://…"
          value={form.videoUrl}
          disabled={!editable("video")}
          error={fe("video")}
          hint="Optional. A direct link to an MP4 or WebM file."
          onChange={(event) => set("videoUrl", event.target.value)}
        />
      </FormSection>

      <FormSection title="Merchandising" description={lockedNote("products:edit_merchandising") ?? "Controls badges and where the product appears on the website."}>
        <OptionGroup legend="Flags" error={fe("flags")} disabled={!editable("flags")}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FLAG_KEYS.map((key) => (
              <CheckboxInput
                key={key}
                label={flagLabels[key]}
                checked={form.flags[key]}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setForm((previous) => ({ ...previous, flags: { ...previous.flags, [key]: checked } }));
                }}
              />
            ))}
          </div>
        </OptionGroup>
      </FormSection>

      <FormSection title="SEO" description={lockedNote("products:edit_content") ?? "Leave blank to use the product name and short description."}>
        <TextInput
          label="SEO title"
          maxLength={160}
          containerClassName="sm:col-span-2"
          value={form.seoTitle}
          disabled={!editable("seo")}
          error={fe("seo.title", "seo")}
          hint={`${form.seoTitle.length}/160`}
          onChange={(event) => set("seoTitle", event.target.value)}
        />
        <TextArea
          label="SEO description"
          maxLength={320}
          rows={3}
          containerClassName="sm:col-span-2"
          value={form.seoDescription}
          disabled={!editable("seo")}
          error={fe("seo.description")}
          hint={`${form.seoDescription.length}/320`}
          onChange={(event) => set("seoDescription", event.target.value)}
        />
      </FormSection>

      <FormSection title="Inventory" description={lockedNote("products:edit_inventory")}>
        <NumberInput
          label="Low stock threshold"
          min={0}
          step={1}
          inputMode="numeric"
          value={form.lowStockThreshold}
          disabled={!editable("lowStockThreshold")}
          error={fe("lowStockThreshold")}
          hint={mode === "create" ? "Leave blank to use the store default." : "Stock at or below this is flagged as low."}
          onChange={(event) => set("lowStockThreshold", event.target.value)}
        />
        {canAddStock && (
          <>
            <NumberInput
              label="Opening stock (units)"
              min={1}
              step={1}
              inputMode="numeric"
              value={form.initialQuantity}
              error={fe("initialStock.quantity", "initialStock")}
              hint="Optional. Recorded as opening stock."
              onChange={(event) => set("initialQuantity", event.target.value)}
            />
            {form.initialQuantity.trim() !== "" && (
              <SelectInput
                label="Stock location"
                required
                placeholder={locationsRes.loading ? "Loading…" : "Choose a location"}
                options={locationOptions}
                value={form.initialLocationId}
                error={fe("initialStock.locationId")}
                hint={locationsRes.error ? `Couldn't load locations: ${locationsRes.error.message}` : undefined}
                onChange={(event) => set("initialLocationId", event.target.value)}
              />
            )}
          </>
        )}
      </FormSection>

      {showConfidential && (
        <FormSection title="Confidential" description="Visible only to roles with confidential access. Never shown on the website.">
          <NumberInput label="Purchase price (₹)" min={0} value={form.purchasePrice} error={fe("purchasePrice")} onChange={(event) => set("purchasePrice", event.target.value)} />
          <SelectInput
            label="Vendor"
            placeholder={vendorsRes.loading ? "Loading…" : "No vendor"}
            options={vendorOptions}
            value={form.vendorId}
            error={fe("vendorId")}
            hint={vendorsRes.error ? `Couldn't load vendors: ${vendorsRes.error.message}` : undefined}
            onChange={(event) => set("vendorId", event.target.value)}
          />
        </FormSection>
      )}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <div ref={topRef} className="scroll-mt-24" />
      <MutationAlert error={error} known={KNOWN_ERROR_KEYS} onReload={onReload} className="mb-6" />
      {aside ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          {sections}
          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">{aside}</aside>
        </div>
      ) : (
        <div className="max-w-5xl">{sections}</div>
      )}

      {canEditAnything && (
        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border border-line bg-porcelain/95 px-5 py-3 backdrop-blur">
          <p className="text-[0.8125rem] text-muted">
            {mode === "create" ? "New products are saved as drafts unless you choose Active." : patchFields.length ? `${patchFields.length} unsaved change${patchFields.length === 1 ? "" : "s"}` : "No unsaved changes"}
          </p>
          <div className="flex gap-2">
            {mode === "create" ? (
              <AdminLinkButton href="/admin/products" variant="ghost">
                Cancel
              </AdminLinkButton>
            ) : (
              patchFields.length > 0 && (
                <AdminButton
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setForm(toForm(product));
                    setError(null);
                  }}
                >
                  Discard
                </AdminButton>
              )
            )}
            <AdminButton type="submit" variant="primary" loading={saving} disabled={mode === "edit" && patchFields.length === 0}>
              {mode === "create" ? "Create product" : "Save changes"}
            </AdminButton>
          </div>
        </div>
      )}
    </form>
  );
}
