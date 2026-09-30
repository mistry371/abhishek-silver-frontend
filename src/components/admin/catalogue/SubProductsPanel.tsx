"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { ImagesInput, NumberInput, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { TrashIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, EmptyNote, InlineAlert, LoadingBlock, Panel, SearchBox, StatusBadge } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError, type ImageAsset, type Paginated } from "@/lib/admin/client";
import { metalLabels, money, number, purityLabels } from "@/lib/admin/format";
import { useAdminResource, useDebouncedValue } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";
import { Thumb } from "./shared";
import type { ProductDetail, ProductListItem, SubProduct, SubProducts } from "./types";
import { asApiError, fieldError, unmappedErrors } from "./utils";

const KNOWN_ERROR_KEYS = ["items", "move"] as const;

/** A row in the sub-products table. `movedFrom` marks one taken from another main product. */
interface Row extends SubProduct {
  /** Name of the main product it is being taken from, which loses it on save. */
  movedFrom?: string | null;
}

const toRows = (items: SubProduct[]): Row[] => items.map((item) => ({ ...item }));
const order = (rows: Row[]) => rows.map((row) => row.productId).join(",");

/**
 * Sub-products of one main product, managed on the main product's own page.
 * Saves on its own (separately from the product's fields) through
 * `/products/:id/sub-products`.
 */
export function SubProductsPanel({ product }: { product: ProductDetail }) {
  const { can } = useAdmin();
  const editable = can("products:edit_content");
  const canCreate = editable && can("products:create");

  const resource = useAdminResource<SubProducts>(`/products/${product.id}/sub-products`);
  const data = resource.data;

  const [synced, setSynced] = useState<SubProducts | undefined>(undefined);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<AdminApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);

  // A newer copy of the group (after saving or reloading) replaces the table.
  if (data && data !== synced) {
    setSynced(data);
    setRows(toRows(data.items));
    setError(null);
  }

  const saved = useMemo(() => order(toRows(data?.items ?? [])), [data]);
  const moving = rows.some((row) => Boolean(row.movedFrom));
  const dirty = order(rows) !== saved || moving;

  const errors = error?.fieldErrors;
  const rowError = (index: number, productId: string) => fieldError(errors, `items.${index}`, `items.${productId}`);
  const otherErrors = unmappedErrors(errors, KNOWN_ERROR_KEYS);

  function move(index: number, delta: number) {
    setRows((previous) => {
      const next = [...previous];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item!);
      return next;
    });
  }

  function addProducts(products: ProductListItem[]) {
    setRows((previous) => [
      ...previous,
      ...products
        .filter((candidate) => candidate.id !== product.id && !previous.some((row) => row.productId === candidate.id))
        .map((candidate) => ({
          productId: candidate.id,
          sku: candidate.sku,
          name: candidate.name,
          slug: candidate.slug,
          image: candidate.image,
          price: candidate.finalPrice,
          stock: candidate.stock,
          status: candidate.status,
          movedFrom: candidate.parent && candidate.parent.id !== product.id ? candidate.parent.name : null,
        })),
    ]);
    setPicking(false);
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const body: { items: { productId: string }[]; move?: boolean } = { items: rows.map((row) => ({ productId: row.productId })) };
      if (moving) body.move = true;
      const updated = await adminApi.put<SubProducts>(`/products/${product.id}/sub-products`, body);
      resource.setData(updated);
      toast({ title: "Sub-products saved", tone: "success" });
    } catch (caught) {
      const apiError = asApiError(caught);
      setError(apiError);
      if (apiError.status === 403) toast({ title: apiError.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  /* Loading and load failures ------------------------------------------- */

  if (!data) {
    return (
      <Panel title="Sub-products">
        {resource.error ? (
          <InlineAlert tone={resource.error.status === 404 ? "info" : "danger"}>
            {resource.error.status === 404 ? "Sub-products aren’t available from your admin service yet." : resource.error.message}{" "}
            <button type="button" className="underline" onClick={resource.reload}>
              Retry
            </button>
          </InlineAlert>
        ) : (
          <LoadingBlock rows={2} />
        )}
      </Panel>
    );
  }

  /* This product is itself a sub-product ---------------------------------- */

  if (data.belongsTo) {
    return (
      <Panel title="Sub-products">
        <p className="text-[0.875rem] text-ink-soft">
          Sub-product of{" "}
          <Link href={`/admin/products/${data.belongsTo.id}`} className="font-medium text-champagne-deep hover:underline">
            {data.belongsTo.name}
          </Link>
          <span className="text-muted"> · {data.belongsTo.sku}</span>
        </p>
      </Panel>
    );
  }

  /* The sub-products of this main product --------------------------------- */

  return (
    <>
      <Panel
        title="Sub-products"
        description="Products customers can pick from this product's page, in the order they see them. Each keeps its own SKU, stock and price."
        flush
        actions={
          editable ? (
            <>
              <AdminButton size="sm" onClick={() => setPicking(true)}>
                <PlusIcon size={14} />
                Add existing products
              </AdminButton>
              {canCreate && (
                <AdminButton size="sm" variant="primary" onClick={() => setCreating(true)}>
                  <PlusIcon size={14} />
                  New sub-product
                </AdminButton>
              )}
            </>
          ) : undefined
        }
      >
        {(error || otherErrors.length > 0) && (
          <div className="border-b border-line p-4">
            <InlineAlert>
              <p>{errors?.items ?? error?.message}</p>
              {otherErrors.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                  {otherErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              )}
            </InlineAlert>
          </div>
        )}

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyNote
              title="No sub-products yet"
              description="Sub-products are separate products — each with its own SKU, stock and price — that customers choose between on this product's page."
              action={
                editable ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    <AdminButton onClick={() => setPicking(true)}>
                      <PlusIcon size={14} />
                      Add existing products
                    </AdminButton>
                    {canCreate && (
                      <AdminButton variant="primary" onClick={() => setCreating(true)}>
                        <PlusIcon size={14} />
                        New sub-product
                      </AdminButton>
                    )}
                  </div>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-[0.8125rem]">
              <thead>
                <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                  <th scope="col" className="px-3 py-2 font-medium">
                    Order
                  </th>
                  <th scope="col" className="px-3 py-2 font-medium">
                    Product
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
                {rows.map((row, index) => {
                  const message = rowError(index, row.productId);
                  return (
                    <tr key={row.productId} className={cn("border-b border-line align-top last:border-0", message && "bg-danger/5")}>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <AdminButton size="sm" variant="ghost" disabled={!editable || index === 0} onClick={() => move(index, -1)} aria-label={`Move ${row.sku} up`}>
                            ↑
                          </AdminButton>
                          <AdminButton size="sm" variant="ghost" disabled={!editable || index === rows.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${row.sku} down`}>
                            ↓
                          </AdminButton>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-start gap-3">
                          <Thumb image={row.image} />
                          <div className="min-w-0">
                            <Link href={`/admin/products/${row.productId}`} className="font-medium text-ink hover:underline">
                              {row.name}
                            </Link>
                            <p className="mt-0.5 text-[0.75rem] text-muted">{row.sku}</p>
                            {row.movedFrom && <p className="mt-0.5 text-[0.75rem] text-champagne-deep">Moving here from “{row.movedFrom}” when you save.</p>}
                            {message && (
                              <p role="alert" className="mt-0.5 text-[0.75rem] text-danger">
                                {message}
                              </p>
                            )}
                          </div>
                        </div>
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
                            onClick={() => setRows((previous) => previous.filter((item) => item.productId !== row.productId))}
                            aria-label={`Remove ${row.sku} from this product`}
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

        {editable && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
            <p className="text-[0.75rem] text-muted">
              {dirty
                ? "Unsaved changes to the sub-products."
                : rows.length > 0
                  ? "Removing a sub-product here doesn’t delete it — it goes back to showing on its own."
                  : "Nothing to save yet."}
            </p>
            <div className="flex gap-2">
              {dirty && (
                <AdminButton size="sm" variant="ghost" disabled={saving} onClick={() => setRows(toRows(data.items))}>
                  Discard
                </AdminButton>
              )}
              <AdminButton size="sm" variant="primary" loading={saving} disabled={!dirty} onClick={save}>
                Save sub-products
              </AdminButton>
            </div>
          </div>
        )}
      </Panel>

      {picking && (
        <ProductPicker
          excluded={[product.id, ...rows.map((row) => row.productId)]}
          mainId={product.id}
          onClose={() => setPicking(false)}
          onAdd={addProducts}
        />
      )}
      {creating && (
        <NewSubProductDialog
          product={product}
          onClose={() => setCreating(false)}
          onCreated={(updated) => {
            setCreating(false);
            resource.setData(updated);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Product picker                                                      */
/* ------------------------------------------------------------------ */

const PICKER_PAGE_SIZE = 50;

/** Searches every product. Render conditionally so the selection resets each time. */
function ProductPicker({ excluded, mainId, onClose, onAdd }: { excluded: string[]; mainId: string; onClose: () => void; onAdd: (products: ProductListItem[]) => void }) {
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState<ProductListItem[]>([]);
  const q = useDebouncedValue(search.trim(), 300);
  const query = useMemo(() => ({ q, pageSize: PICKER_PAGE_SIZE }), [q]);
  const results = useAdminResource<Paginated<ProductListItem>>("/products", query);
  const items = (results.latest?.items ?? []).filter((item) => !excluded.includes(item.id));
  const isChosen = (id: string) => chosen.some((item) => item.id === id);

  return (
    <AdminDialog
      open
      onClose={onClose}
      size="lg"
      title="Add sub-products"
      description="Every product is listed. One that already belongs to another main product says so, and adding it moves it here."
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
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-[0.8125rem] text-ink-soft">
          <input
            type="checkbox"
            className="h-4 w-4 accent-ink"
            disabled={items.length === 0}
            checked={items.length > 0 && items.every((item) => isChosen(item.id))}
            onChange={(event) =>
              setChosen((previous) =>
                event.target.checked
                  ? [...previous, ...items.filter((item) => !previous.some((entry) => entry.id === item.id))]
                  : previous.filter((entry) => !items.some((item) => item.id === entry.id)),
              )
            }
          />
          Select all {items.length || ""} shown
        </label>
        {chosen.length > 0 && <span className="text-[0.75rem] text-muted">{chosen.length} selected</span>}
      </div>
      <div className="mt-3 max-h-[26rem] overflow-y-auto border border-line">
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
          <p className="px-4 py-8 text-center text-[0.8125rem] text-muted">{q ? `No products match “${q}”.` : "Every product is already a sub-product of this one."}</p>
        ) : (
          <ul className={cn("divide-y divide-line", results.loading && "opacity-60")}>
            {items.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-cream/60">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-ink"
                    checked={isChosen(item.id)}
                    onChange={() => setChosen((previous) => (previous.some((entry) => entry.id === item.id) ? previous.filter((entry) => entry.id !== item.id) : [...previous, item]))}
                  />
                  <Thumb image={item.image} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] text-ink">{item.name}</span>
                    <span className="block text-[0.75rem] text-muted">
                      {item.sku} · {metalLabels[item.metal] ?? item.metal} {purityLabels[item.purity] ?? item.purity}
                    </span>
                    {item.parent && item.parent.id !== mainId && <span className="mt-0.5 block truncate text-[0.75rem] text-champagne-deep">In “{item.parent.name}” — adding moves it here</span>}
                  </span>
                  <span className="hidden text-right sm:block">
                    <span className="block tabular-nums text-ink">{item.finalPrice === null ? "—" : money(item.finalPrice)}</span>
                    <StatusBadge status={item.status} />
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      {results.latest && results.latest.total > PICKER_PAGE_SIZE && (
        <p className="mt-2 text-[0.75rem] text-muted">
          Showing the first {PICKER_PAGE_SIZE} of {number(results.latest.total)}. Search to narrow the list.
        </p>
      )}
    </AdminDialog>
  );
}

/* ------------------------------------------------------------------ */
/* New sub-product                                                     */
/* ------------------------------------------------------------------ */

/** Creates a product that copies the main product, then attaches it last. */
function NewSubProductDialog({ product, onClose, onCreated }: { product: ProductDetail; onClose: () => void; onCreated: (result: SubProducts) => void }) {
  const [name, setName] = useState("");
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [netWeight, setNetWeight] = useState("");
  const [makingValue, setMakingValue] = useState("");
  const [error, setError] = useState<AdminApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const fe = (...keys: string[]) => fieldError(error?.fieldErrors, ...keys);
  const otherErrors = unmappedErrors(error?.fieldErrors, ["name", "images", "netWeight", "makingValue"]);

  async function create() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { name: name.trim(), images };
      if (netWeight.trim() !== "") payload.netWeight = toNumberOrNull(netWeight);
      if (makingValue.trim() !== "") payload.makingValue = toNumberOrNull(makingValue);
      const result = await adminApi.post<SubProducts>(`/products/${product.id}/sub-products`, payload);
      toast({ title: "Sub-product created", description: name.trim(), tone: "success" });
      onCreated(result);
    } catch (caught) {
      const apiError = asApiError(caught);
      setError(apiError);
      if (apiError.status === 403) toast({ title: apiError.message, tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      open
      onClose={onClose}
      size="lg"
      title="New sub-product"
      description={`Everything else — category, metal, purity, weight, making charge, description and SEO — is copied from ${product.name}, so the price matches unless you override the weight or making charge.`}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" loading={saving} disabled={name.trim() === ""} onClick={create}>
            Create sub-product
          </AdminButton>
        </>
      }
    >
      {(error?.message || otherErrors.length > 0) && (
        <InlineAlert className="mb-4">
          <p>{error?.message}</p>
          {otherErrors.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {otherErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </InlineAlert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          label="Name"
          required
          maxLength={160}
          containerClassName="sm:col-span-2"
          value={name}
          error={fe("name")}
          hint="What customers see on the option card, e.g. “Rose Gold” or “Small”."
          onChange={(event) => setName(event.target.value)}
        />
        <ImagesInput label="Photos" value={images} onChange={setImages} max={12} error={fe("images")} />
        <NumberInput
          label="Net weight (g)"
          min={0}
          value={netWeight}
          error={fe("netWeight")}
          hint={`Optional. Blank copies ${product.netWeight} g.`}
          onChange={(event) => setNetWeight(event.target.value)}
        />
        <NumberInput
          label="Making charge"
          min={0}
          value={makingValue}
          error={fe("makingValue")}
          hint={`Optional. Blank copies ${product.makingValue}.`}
          onChange={(event) => setMakingValue(event.target.value)}
        />
      </div>
    </AdminDialog>
  );
}
