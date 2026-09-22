"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { PlusIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { CheckboxInput, controlClass, FormSection, ImagesInput, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { TrashIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, AdminLinkButton, EmptyNote, InlineAlert, LoadingBlock, Panel, SearchBox, StatusBadge } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError, type Paginated } from "@/lib/admin/client";
import { metalLabels, money, number, purityLabels } from "@/lib/admin/format";
import { useAdminResource, useDebouncedValue } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";
import { CategoryDialog } from "./CategoryDialog";
import { ImageStrip, MutationAlert, OptionGroup, Thumb } from "./shared";
import type { Category, Collection, ParentProductDetail, ParentProductVariant, ProductListItem } from "./types";
import { asApiError, fieldError, PARENT_STATUS_OPTIONS, slugify, toggle, unmappedErrors } from "./utils";

type SharedField = "name" | "slug" | "shortDescription" | "description" | "categoryId" | "subcategoryId" | "collectionIds" | "images" | "seo" | "status";
const SHARED_FIELDS: SharedField[] = ["name", "slug", "shortDescription", "description", "categoryId", "subcategoryId", "collectionIds", "images", "seo", "status"];

interface SharedForm {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  collectionIds: string[];
  images: ParentProductDetail["images"];
  seoTitle: string;
  seoDescription: string;
  status: string;
}

/** A row in the options table. `customLabel` is the editable text; `label` is what the website shows today. */
interface VariantRow {
  productId: string;
  sku: string;
  name: string;
  slug: string;
  metal: string;
  purity: string;
  label: string;
  customLabel: string;
  status: string;
  stock: number;
  price: number | null;
}

interface VariantsState {
  rows: VariantRow[];
  defaultVariantId: string;
}

function toForm(parent?: ParentProductDetail): SharedForm {
  return {
    name: parent?.name ?? "",
    slug: parent?.slug ?? "",
    shortDescription: parent?.shortDescription ?? "",
    description: parent?.description ?? "",
    categoryId: parent?.categoryId ?? "",
    subcategoryId: parent?.subcategoryId ?? "",
    collectionIds: [...(parent?.collectionIds ?? [])],
    images: parent?.images ?? [],
    seoTitle: parent?.seo?.title ?? "",
    seoDescription: parent?.seo?.description ?? "",
    status: parent?.status ?? "draft",
  };
}

function toRow(variant: ParentProductVariant): VariantRow {
  return {
    productId: variant.productId,
    sku: variant.sku,
    name: variant.name,
    slug: variant.slug,
    metal: variant.metal,
    purity: variant.purity,
    label: variant.label,
    customLabel: variant.customLabel ?? "",
    status: variant.status,
    stock: variant.stock,
    price: variant.price,
  };
}

function toVariants(parent?: ParentProductDetail): VariantsState {
  const rows = (parent?.variants ?? []).map(toRow);
  return { rows, defaultVariantId: parent?.defaultVariantId ?? rows[0]?.productId ?? "" };
}

function buildValues(form: SharedForm): Record<SharedField, unknown> {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId || null,
    subcategoryId: form.subcategoryId || null,
    collectionIds: [...form.collectionIds].sort(),
    images: form.images,
    seo: { title: form.seoTitle.trim() || undefined, description: form.seoDescription.trim() || undefined },
    status: form.status,
  };
}

function variantsPayload(state: VariantsState) {
  return {
    variants: state.rows.map((row) => ({ productId: row.productId, label: row.customLabel.trim() || null })),
    defaultVariantId: state.rows.some((row) => row.productId === state.defaultVariantId) ? state.defaultVariantId : (state.rows[0]?.productId ?? null),
  };
}

const autoLabel = (row: Pick<VariantRow, "metal" | "purity">) => [purityLabels[row.purity] ?? row.purity, metalLabels[row.metal] ?? row.metal].filter(Boolean).join(" ");

export function ParentProductForm({ parent, onSaved, onReload, aside }: { parent?: ParentProductDetail; onSaved?: (parent: ParentProductDetail) => void; onReload?: () => void; aside?: ReactNode }) {
  const router = useRouter();
  const { can } = useAdmin();
  const [creatingCategory, setCreatingCategory] = useState(false);

  // On "new", the design is created first and its options saved second. If the
  // second step fails, the created record is kept here so saving again only
  // retries the options.
  const [created, setCreated] = useState<ParentProductDetail | null>(null);
  const record = parent ?? created ?? undefined;
  const mode = record ? "edit" : "create";
  const editable = parent ? can("products:edit_content") : can("products:create");

  const [synced, setSynced] = useState(parent);
  const [form, setForm] = useState(() => toForm(parent));
  const [variants, setVariants] = useState(() => toVariants(parent));
  const [slugTouched, setSlugTouched] = useState(Boolean(parent));
  const [error, setError] = useState<AdminApiError | null>(null);
  const [variantsError, setVariantsError] = useState<AdminApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const variantsRef = useRef<HTMLDivElement>(null);

  // A newer copy of the design (after saving or reloading) replaces the form.
  if (parent !== synced) {
    setSynced(parent);
    setForm(toForm(parent));
    setVariants(toVariants(parent));
    setError(null);
    setVariantsError(null);
  }

  const categoriesRes = useAdminResource<Category[]>("/categories");
  const collectionsRes = useAdminResource<Collection[]>("/collections");
  const typeCategories = useMemo(() => (categoriesRes.data ?? []).filter((category) => category.group === "type"), [categoriesRes.data]);

  const baseline = useMemo(() => (record ? buildValues(toForm(record)) : null), [record]);
  const variantsBaseline = useMemo(() => JSON.stringify(variantsPayload(toVariants(record))), [record]);
  const values = buildValues(form);
  const changed = baseline ? SHARED_FIELDS.filter((field) => JSON.stringify(values[field]) !== JSON.stringify(baseline[field])) : [];
  const variantsChanged = JSON.stringify(variantsPayload(variants)) !== variantsBaseline;
  const changeCount = changed.length + (variantsChanged ? 1 : 0);
  const dirty = mode === "create" ? JSON.stringify(values) !== JSON.stringify(buildValues(toForm())) || variants.rows.length > 0 : changeCount > 0;

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const selectedCategory = typeCategories.find((category) => category.id === form.categoryId);
  const fe = (...keys: string[]) => fieldError(error?.fieldErrors, ...keys);
  const ve = variantsError?.fieldErrors;
  const set = <K extends keyof SharedForm>(key: K, value: SharedForm[K]) => setForm((previous) => ({ ...previous, [key]: value }));

  const categoryOptions = typeCategories.map((category) => ({ value: category.id, label: category.active ? category.name : `${category.name} (inactive)` }));
  if (record?.categoryId && record.category && !categoryOptions.some((option) => option.value === record.categoryId)) {
    categoryOptions.unshift({ value: record.categoryId, label: record.category.name });
  }

  function rowError(index: number, productId: string) {
    return fieldError(ve, `variants.${index}`, `variants.${productId}`);
  }
  const variantsGeneral = ve ? [ve.variants, ve.defaultVariantId].filter((message): message is string => Boolean(message)) : [];
  const variantsOther = unmappedErrors(ve, ["variants", "defaultVariantId"]);

  function updateRows(update: (rows: VariantRow[]) => VariantRow[]) {
    setVariants((previous) => {
      const rows = update(previous.rows);
      const defaultVariantId = rows.some((row) => row.productId === previous.defaultVariantId) ? previous.defaultVariantId : (rows[0]?.productId ?? "");
      return { rows, defaultVariantId };
    });
  }

  function move(index: number, delta: number) {
    updateRows((rows) => {
      const next = [...rows];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });
  }

  function addProducts(products: ProductListItem[]) {
    updateRows((rows) => [
      ...rows,
      ...products
        .filter((product) => !rows.some((row) => row.productId === product.id))
        .map((product) => ({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          metal: product.metal,
          purity: product.purity,
          label: "",
          customLabel: "",
          status: product.status,
          stock: product.stock,
          price: product.finalPrice,
        })),
    ]);
    setPicking(false);
  }

  function fail(caught: unknown, target: "shared" | "variants") {
    const apiError = asApiError(caught);
    if (target === "shared") setError(apiError);
    else setVariantsError(apiError);
    if (apiError.status === 403) toast({ title: apiError.message, tone: "error" });
    (target === "shared" ? topRef : variantsRef).current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setVariantsError(null);
    try {
      let current = record;

      if (!current) {
        const payload: Record<string, unknown> = { ...values };
        if (!form.slug.trim()) delete payload.slug;
        try {
          current = await adminApi.post<ParentProductDetail>("/parent-products", payload);
        } catch (caught) {
          fail(caught, "shared");
          return;
        }
        setCreated(current);
      } else if (changed.length) {
        try {
          current = await adminApi.patch<ParentProductDetail>(`/parent-products/${current.id}`, Object.fromEntries(changed.map((field) => [field, values[field]])));
        } catch (caught) {
          fail(caught, "shared");
          return;
        }
      }

      const needsVariants = mode === "create" ? variants.rows.length > 0 : variantsChanged;
      if (needsVariants) {
        try {
          current = await adminApi.put<ParentProductDetail>(`/parent-products/${current.id}/variants`, variantsPayload(variants));
        } catch (caught) {
          // Keep the unsaved options on screen (don't reload the form); saving again retries.
          if (mode === "create") toast({ title: "Design created, but its options weren't saved", description: "Check the options below and save again.", tone: "error" });
          else if (changed.length) toast({ title: "Details saved, but the options weren't", description: "Check the options below and save again.", tone: "error" });
          fail(caught, "variants");
          return;
        }
      }

      if (!parent) {
        toast({ title: "Parent product created", description: current.name, tone: "success" });
        router.push(`/admin/parent-products/${current.id}`);
        return;
      }
      toast({ title: "Changes saved", tone: "success" });
      if (created) setCreated(current);
      onSaved?.(current);
    } finally {
      setSaving(false);
    }
  }

  const sections = (
    <div className="min-w-0 space-y-6">
      <FormSection title="Design details" description={editable ? "Shared by every option. On the website these replace each product's own name, description, category and SEO." : "View only — your role can't change these fields."}>
        <TextInput
          label="Name"
          required
          maxLength={160}
          value={form.name}
          disabled={!editable}
          error={fe("name")}
          onChange={(event) => {
            const name = event.target.value;
            setForm((previous) => ({ ...previous, name, slug: slugTouched ? previous.slug : slugify(name) }));
          }}
        />
        <TextInput
          label="URL slug"
          maxLength={160}
          value={form.slug}
          disabled={!editable}
          error={fe("slug")}
          hint={form.slug ? `/product/${form.slug}` : "Generated from the name."}
          onChange={(event) => {
            const slug = event.target.value.toLowerCase();
            setSlugTouched(slug !== "");
            setForm((previous) => ({ ...previous, slug: slug === "" ? slugify(previous.name) : slug }));
          }}
        />
        <div>
          <SelectInput
            label="Category"
            required
            placeholder={categoriesRes.loading ? "Loading…" : "Choose a jewellery type"}
            options={categoryOptions}
            value={form.categoryId}
            disabled={!editable}
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
          {editable && can("catalog:manage_taxonomy") && (
            <button
              type="button"
              onClick={() => setCreatingCategory(true)}
              className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] text-champagne-deep hover:underline"
            >
              <PlusIcon size={13} />
              Not listed? Create a new category
            </button>
          )}
        </div>
        <SelectInput
          label="Subcategory"
          placeholder={form.categoryId && selectedCategory && selectedCategory.subcategories.length === 0 ? "No subcategories for this type" : "None"}
          options={(selectedCategory?.subcategories ?? []).map((sub) => ({ value: sub.id, label: sub.active ? sub.name : `${sub.name} (inactive)` }))}
          value={form.subcategoryId}
          disabled={!editable || !selectedCategory?.subcategories.length}
          error={fe("subcategoryId")}
          onChange={(event) => set("subcategoryId", event.target.value)}
        />
        <SelectInput
          label="Status"
          options={PARENT_STATUS_OPTIONS}
          value={form.status}
          disabled={!editable}
          error={fe("status")}
          hint={
            form.status === "active"
              ? "The website shows these products as one piece with a choice of options."
              : "Drafts change nothing on the website — each product keeps showing on its own."
          }
          onChange={(event) => set("status", event.target.value)}
        />
        <TextInput
          label="Short description"
          maxLength={300}
          containerClassName="sm:col-span-2"
          value={form.shortDescription}
          disabled={!editable}
          error={fe("shortDescription")}
          onChange={(event) => set("shortDescription", event.target.value)}
        />
        <TextArea
          label="Description"
          maxLength={5000}
          rows={5}
          containerClassName="sm:col-span-2"
          value={form.description}
          disabled={!editable}
          error={fe("description")}
          onChange={(event) => set("description", event.target.value)}
        />
        <OptionGroup legend="Collections" error={fe("collectionIds")} disabled={!editable}>
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

      <div ref={variantsRef} className="scroll-mt-24">
        <Panel
          title="Options"
          description="The products that make up this design, in the order customers see them. Each keeps its own SKU, weight, stock and price."
          flush
          actions={
            editable ? (
              <AdminButton size="sm" onClick={() => setPicking(true)}>
                <PlusIcon size={14} />
                Add products
              </AdminButton>
            ) : undefined
          }
        >
          {(variantsError || variantsOther.length > 0) && (
            <div className="border-b border-line p-4">
              <InlineAlert>
                {variantsGeneral.length ? variantsGeneral.map((message) => <p key={message}>{message}</p>) : <p>{variantsError?.message}</p>}
                {variantsOther.length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                    {variantsOther.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                )}
              </InlineAlert>
            </div>
          )}
          {variants.rows.length === 0 ? (
            <div className="p-5">
              <EmptyNote
                title="No options yet"
                description="Add the products that are this design in different metals or purities. A design needs at least two options before the website shows a choice."
                action={
                  editable ? (
                    <AdminButton onClick={() => setPicking(true)}>
                      <PlusIcon size={14} />
                      Add products
                    </AdminButton>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-left text-[0.8125rem]">
                <thead>
                  <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                    <th scope="col" className="px-3 py-2 font-medium">
                      Order
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Default
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Product
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Metal
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Label on website
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Stock
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">
                      Price
                    </th>
                    <th scope="col" className="px-3 py-2 font-medium">
                      <span className="sr-only">Remove</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.rows.map((row, index) => {
                    const message = rowError(index, row.productId);
                    const shownAs = row.customLabel.trim() || row.label || autoLabel(row);
                    return (
                      <tr key={row.productId} className={cn("border-b border-line align-top last:border-0", message && "bg-danger/5")}>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <AdminButton size="sm" variant="ghost" disabled={!editable || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${row.sku} up`}>
                              ↑
                            </AdminButton>
                            <AdminButton size="sm" variant="ghost" disabled={!editable || index === variants.rows.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${row.sku} down`}>
                              ↓
                            </AdminButton>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="radio"
                            name="defaultVariant"
                            aria-label={`Make ${row.sku} the default option`}
                            checked={variants.defaultVariantId === row.productId}
                            disabled={!editable}
                            onChange={() => setVariants((previous) => ({ ...previous, defaultVariantId: row.productId }))}
                            className="mt-2 h-4 w-4 accent-ink"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/admin/products/${row.productId}`} className="font-medium text-ink hover:underline">
                            {row.name}
                          </Link>
                          <p className="mt-0.5 text-[0.75rem] text-muted">{row.sku}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span>{metalLabels[row.metal] ?? row.metal}</span>
                          <p className="text-[0.75rem] text-muted">{purityLabels[row.purity] ?? row.purity}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            aria-label={`Label for ${row.sku}`}
                            maxLength={60}
                            value={row.customLabel}
                            placeholder={row.label || autoLabel(row)}
                            disabled={!editable}
                            aria-invalid={message ? true : undefined}
                            onChange={(event) => {
                              const customLabel = event.target.value;
                              updateRows((rows) => rows.map((item) => (item.productId === row.productId ? { ...item, customLabel } : item)));
                            }}
                            className={controlClass(message, "h-9 min-w-[10rem]")}
                          />
                          {message ? (
                            <p role="alert" className="mt-1 text-[0.75rem] text-danger">
                              {message}
                            </p>
                          ) : (
                            <p className="mt-1 text-[0.75rem] text-muted">Shown as “{shownAs}”</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={row.status} />
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{number(row.stock)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{row.price === null ? <span className="text-muted">—</span> : money(row.price)}</td>
                        <td className="px-3 py-2.5 text-right">
                          {editable && (
                            <AdminButton
                              size="sm"
                              variant="ghost"
                              onClick={() => updateRows((rows) => rows.filter((item) => item.productId !== row.productId))}
                              aria-label={`Remove ${row.sku} from this design`}
                            >
                              <TrashIcon size={14} />
                            </AdminButton>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {variants.rows.length > 0 && (
            <p className="border-t border-line px-5 py-3 text-[0.75rem] text-muted">
              Leave a label blank to use the metal and purity. The default option is the one shown on listing cards and when someone opens the design&apos;s own link. Removing a product here doesn&apos;t delete it — it goes back to showing on its own.
            </p>
          )}
        </Panel>
      </div>

      <FormSection title="Photos" description={editable ? "Up to 12 images shared by the design. The first image is the main photo." : "View only — your role can't change these fields."}>
        {editable ? <ImagesInput value={form.images} onChange={(images) => set("images", images)} max={12} error={fe("images")} /> : <ImageStrip images={form.images} />}
      </FormSection>

      <FormSection title="SEO" description={editable ? "Leave blank to use the design name and short description." : "View only — your role can't change these fields."}>
        <TextInput
          label="SEO title"
          maxLength={160}
          containerClassName="sm:col-span-2"
          value={form.seoTitle}
          disabled={!editable}
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
          disabled={!editable}
          error={fe("seo.description")}
          hint={`${form.seoDescription.length}/320`}
          onChange={(event) => set("seoDescription", event.target.value)}
        />
      </FormSection>
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <div ref={topRef} className="scroll-mt-24" />
      <MutationAlert error={error} known={SHARED_FIELDS} onReload={onReload} className="mb-6" />
      {aside ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          {sections}
          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">{aside}</aside>
        </div>
      ) : (
        <div className="max-w-5xl">{sections}</div>
      )}

      {editable && (
        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border border-line bg-porcelain/95 px-5 py-3 backdrop-blur">
          <p className="text-[0.8125rem] text-muted">
            {mode === "create"
              ? "New designs are saved as drafts unless you choose Active."
              : changeCount
                ? `${changeCount} unsaved change${changeCount === 1 ? "" : "s"}${variantsChanged ? " (including options)" : ""}`
                : "No unsaved changes"}
          </p>
          <div className="flex gap-2">
            {mode === "create" ? (
              <AdminLinkButton href="/admin/parent-products" variant="ghost">
                Cancel
              </AdminLinkButton>
            ) : (
              changeCount > 0 && (
                <AdminButton
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setForm(toForm(record));
                    setVariants(toVariants(record));
                    setError(null);
                    setVariantsError(null);
                  }}
                >
                  Discard
                </AdminButton>
              )
            )}
            <AdminButton type="submit" variant="primary" loading={saving} disabled={mode === "edit" && changeCount === 0}>
              {mode === "create" ? "Create parent product" : "Save changes"}
            </AdminButton>
          </div>
        </div>
      )}

      {picking && <ProductPicker excluded={variants.rows.map((row) => row.productId)} onClose={() => setPicking(false)} onAdd={addProducts} />}
      {creatingCategory && (
        <CategoryDialog
          lockGroup
          onClose={() => setCreatingCategory(false)}
          onSaved={(createdCategory) => {
            setCreatingCategory(false);
            categoriesRes.reload();
            // Select the new category straight away; it has no subcategories yet.
            if (createdCategory?.id) setForm((previous) => ({ ...previous, categoryId: createdCategory.id, subcategoryId: "" }));
          }}
        />
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Product picker                                                      */
/* ------------------------------------------------------------------ */

const PICKER_PAGE_SIZE = 20;

/** Searches products that aren't in any design yet. Render conditionally so the selection resets each time. */
function ProductPicker({ excluded, onClose, onAdd }: { excluded: string[]; onClose: () => void; onAdd: (products: ProductListItem[]) => void }) {
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<ProductListItem[]>([]);
  const q = useDebouncedValue(search.trim(), 300);
  const query = useMemo(() => ({ standalone: true, q, pageSize: PICKER_PAGE_SIZE }), [q]);
  const results = useAdminResource<Paginated<ProductListItem>>("/products", query);
  const items = (results.latest?.items ?? []).filter((product) => !excluded.includes(product.id));
  const isChosen = (id: string) => chosen.some((product) => product.id === id);

  return (
    <AdminDialog
      open
      onClose={onClose}
      size="lg"
      title="Add products to this design"
      description="Only products that aren't already part of a design are listed."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" disabled={chosen.length === 0} onClick={() => onAdd(chosen)}>
            {chosen.length ? `Add ${chosen.length} product${chosen.length === 1 ? "" : "s"}` : "Add products"}
          </AdminButton>
        </>
      }
    >
      <SearchBox value={search} onChange={setSearch} placeholder="Search by name or SKU" className="w-full" />
      <div className="mt-4 max-h-[26rem] overflow-y-auto border border-line">
        {results.error && !results.latest ? (
          <div className="p-4">
            <InlineAlert>
              {results.error.message}{" "}
              <button type="button" className="underline" onClick={results.reload}>
                Retry
              </button>
            </InlineAlert>
          </div>
        ) : !results.latest ? (
          <LoadingBlock rows={4} className="p-4" />
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[0.8125rem] text-muted">{q ? `No products match “${q}”.` : "Every product is already part of a design."}</p>
        ) : (
          <ul className={cn("divide-y divide-line", results.loading && "opacity-60")}>
            {items.map((product) => (
              <li key={product.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-cream/60">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-ink"
                    checked={isChosen(product.id)}
                    onChange={() => setChosen((previous) => (previous.some((item) => item.id === product.id) ? previous.filter((item) => item.id !== product.id) : [...previous, product]))}
                  />
                  <Thumb image={product.image} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] text-ink">{product.name}</span>
                    <span className="block text-[0.75rem] text-muted">
                      {product.sku} · {metalLabels[product.metal] ?? product.metal} {purityLabels[product.purity] ?? product.purity}
                    </span>
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block tabular-nums text-ink">{product.finalPrice === null ? "—" : money(product.finalPrice)}</span>
                    <StatusBadge status={product.status} />
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {results.latest && results.latest.total > PICKER_PAGE_SIZE && (
        <p className="mt-2 text-[0.75rem] text-muted">Showing the first {PICKER_PAGE_SIZE} of {number(results.latest.total)}. Search to narrow the list.</p>
      )}
    </AdminDialog>
  );
}
