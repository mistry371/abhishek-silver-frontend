"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { Thumb } from "@/components/admin/catalogue/shared";
import type { Category, Collection, FlagKey, ProductListItem } from "@/components/admin/catalogue/types";
import { FLAG_KEYS, flagLabels, METAL_OPTIONS, PRODUCT_STATUS_OPTIONS, purityOptions, STOCK_FILTER_OPTIONS } from "@/components/admin/catalogue/utils";
import { SelectInput } from "@/components/admin/fields";
import { AdminButton, AdminLinkButton, ConfirmDialog, DataTable, FilterBar, FilterSelect, PageHeader, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, AdminApiError, errorMessage, type Paginated } from "@/lib/admin/client";
import { formatDate, metalLabels, money, number, purityLabels, puritiesByMetal, weight } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["q", "categoryId", "collectionId", "metal", "purity", "status", "stock", "flag", "sort", "page"] as const;
const CLEARED = { q: "", categoryId: "", collectionId: "", metal: "", purity: "", status: "", stock: "", flag: "" };
const PAGE_SIZE = 25;
const NO_SELECTION = new Set<string>();

const SORT_OPTIONS = [
  { value: "updatedAt:asc", label: "Updated: oldest first" },
  { value: "name:asc", label: "Name: A–Z" },
  { value: "name:desc", label: "Name: Z–A" },
  { value: "sku:asc", label: "SKU: A–Z" },
  { value: "sku:desc", label: "SKU: Z–A" },
  { value: "stock:asc", label: "Stock: low to high" },
  { value: "stock:desc", label: "Stock: high to low" },
];

type BulkAction = "set_status" | "set_flag";

const columns: Column<ProductListItem>[] = [
  { key: "image", header: <span className="sr-only">Image</span>, cell: (row) => <Thumb image={row.image} />, className: "w-14" },
  {
    key: "name",
    header: "Product",
    sortKey: "name",
    cell: (row) => (
      <div className="min-w-[11rem]">
        <Link href={`/admin/products/${row.id}`} className="font-medium text-ink hover:underline">
          {row.name}
        </Link>
        <p className="mt-0.5 text-[0.75rem] text-muted">{row.sku}</p>
      </div>
    ),
  },
  { key: "category", header: "Category", priority: "low", cell: (row) => row.category.name },
  {
    key: "metal",
    header: "Metal",
    cell: (row) => (
      <div className="whitespace-nowrap">
        <span>{metalLabels[row.metal] ?? row.metal}</span>
        <p className="text-[0.75rem] text-muted">{purityLabels[row.purity] ?? row.purity}</p>
      </div>
    ),
  },
  { key: "netWeight", header: "Net wt", align: "right", priority: "low", cell: (row) => <span className="whitespace-nowrap">{weight(row.netWeight)}</span> },
  {
    key: "price",
    header: "Price",
    align: "right",
    cell: (row) =>
      row.finalPrice !== null ? (
        <span className="whitespace-nowrap">{money(row.finalPrice)}</span>
      ) : (
        <span className="block max-w-[10rem] text-[0.75rem] text-warning">{row.pricingError ?? "—"}</span>
      ),
  },
  {
    key: "stock",
    header: "Stock",
    sortKey: "stock",
    cell: (row) => (
      <div className="flex flex-col items-start gap-1">
        <span className="tabular-nums">{number(row.stock)}</span>
        <StatusBadge status={row.stockStatus} />
      </div>
    ),
  },
  { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  { key: "updatedAt", header: "Updated", sortKey: "updatedAt", priority: "low", cell: (row) => <span className="whitespace-nowrap text-muted">{formatDate(row.updatedAt)}</span> },
];

export default function ProductsPage() {
  const { can } = useAdmin();
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const listQuery = useMemo(() => ({ ...query, pageSize: PAGE_SIZE }), [query]);
  const list = useAdminResource<Paginated<ProductListItem>>("/products", listQuery);
  const categories = useAdminResource<Category[]>("/categories");
  const collections = useAdminResource<Collection[]>("/collections");

  const canSetStatus = can("products:edit_content");
  const canSetFlag = can("products:edit_merchandising");
  const canBulk = canSetStatus || canSetFlag;

  const listKey = JSON.stringify(listQuery);
  const [selection, setSelection] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: NO_SELECTION });
  const selected = selection.key === listKey ? selection.ids : NO_SELECTION;
  const [bulk, setBulk] = useState<BulkAction | null>(null);

  const data = list.latest;
  const typeCategories = (categories.latest ?? []).filter((category) => category.group === "type");
  const hasFilters = Boolean(values.q || values.categoryId || values.collectionId || values.metal || values.purity || values.status || values.stock || values.flag);

  return (
    <>
      <PageHeader
        title="Products"
        description={data ? `${number(data.total)} ${data.total === 1 ? "product" : "products"}${hasFilters ? " match these filters" : " in the catalogue"}.` : "Your jewellery catalogue."}
        actions={
          can("products:create") && (
            <AdminLinkButton href="/admin/products/new" variant="primary">
              <PlusIcon size={15} />
              New product
            </AdminLinkButton>
          )
        }
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Search name, SKU or barcode" />
        <FilterSelect
          label="Category"
          value={values.categoryId}
          onChange={(categoryId) => setFilters({ categoryId })}
          options={typeCategories.map((category) => ({ value: category.id, label: category.name }))}
        />
        <FilterSelect
          label="Collection"
          value={values.collectionId}
          onChange={(collectionId) => setFilters({ collectionId })}
          options={(collections.latest ?? []).map((collection) => ({ value: collection.id, label: collection.name }))}
        />
        <FilterSelect
          label="Metal"
          value={values.metal}
          onChange={(metal) => setFilters({ metal, purity: metal && values.purity && !(puritiesByMetal[metal] ?? []).includes(values.purity) ? "" : values.purity })}
          options={METAL_OPTIONS}
        />
        <FilterSelect label="Purity" value={values.purity} onChange={(purity) => setFilters({ purity })} options={purityOptions(values.metal)} />
        <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={PRODUCT_STATUS_OPTIONS} />
        <FilterSelect label="Stock" value={values.stock} onChange={(stock) => setFilters({ stock })} options={STOCK_FILTER_OPTIONS} />
        <FilterSelect label="Flag" value={values.flag} onChange={(flag) => setFilters({ flag })} options={FLAG_KEYS.map((key) => ({ value: key, label: flagLabels[key] }))} allLabel="Any" />
        <FilterSelect label="Sort" value={values.sort} onChange={(sort) => setFilters({ sort })} options={SORT_OPTIONS} allLabel="Updated: newest first" />
        {hasFilters && (
          <AdminButton variant="ghost" onClick={() => setFilters(CLEARED)}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>

      {canBulk && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 border border-champagne-soft bg-champagne-mist/40 px-4 py-2.5 text-[0.8125rem]">
          <span className="mr-2 font-medium text-ink">{selected.size} selected</span>
          {canSetStatus && (
            <AdminButton size="sm" onClick={() => setBulk("set_status")}>
              Change status
            </AdminButton>
          )}
          {canSetFlag && (
            <AdminButton size="sm" onClick={() => setBulk("set_flag")}>
              Change flag
            </AdminButton>
          )}
          <AdminButton size="sm" variant="ghost" onClick={() => setSelection({ key: listKey, ids: NO_SELECTION })}>
            Clear selection
          </AdminButton>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={data?.items}
        getRowKey={(row) => row.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={values.sort}
        onSortChange={(sort) => setFilters({ sort })}
        rowHref={(row) => `/admin/products/${row.id}`}
        selectable={canBulk}
        selected={selected}
        onSelectedChange={(ids) => setSelection({ key: listKey, ids })}
        empty={
          hasFilters
            ? { title: "No products match these filters", action: <AdminButton onClick={() => setFilters(CLEARED)}>Clear filters</AdminButton> }
            : {
                title: "No products yet",
                description: "Add your first piece to start selling.",
                action: can("products:create") ? (
                  <AdminLinkButton href="/admin/products/new" variant="primary">
                    New product
                  </AdminLinkButton>
                ) : undefined,
              }
        }
        footer={
          data && data.total > 0 ? (
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={(page) => setFilters({ page: page <= 1 ? "" : String(page) }, { resetPage: false })} />
          ) : undefined
        }
      />

      {bulk && (
        <BulkDialog
          action={bulk}
          ids={[...selected]}
          onClose={() => setBulk(null)}
          onDone={() => {
            setBulk(null);
            setSelection({ key: listKey, ids: NO_SELECTION });
            list.reload();
          }}
          onStale={list.reload}
        />
      )}
    </>
  );
}

function BulkDialog({ action, ids, onClose, onDone, onStale }: { action: BulkAction; ids: string[]; onClose: () => void; onDone: () => void; onStale: () => void }) {
  const [status, setStatus] = useState("active");
  const [flag, setFlag] = useState<FlagKey>("featured");
  const [flagValue, setFlagValue] = useState("true");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const count = `${ids.length} selected product${ids.length === 1 ? "" : "s"}`;

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const body = action === "set_status" ? { action, ids, status } : { action, ids, flag, value: flagValue === "true" };
      const result = await adminApi.post<{ updated: number }>("/products/bulk", body);
      toast({ title: `Updated ${result.updated} product${result.updated === 1 ? "" : "s"}`, tone: "success" });
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof AdminApiError && (caught.status === 404 || caught.status === 409)) onStale();
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      onConfirm={confirm}
      title={action === "set_status" ? "Change status" : "Change merchandising flag"}
      description={`This applies to ${count}. Either every product is updated or none are.`}
      confirmLabel="Apply"
      pending={pending}
      error={error}
    >
      {action === "set_status" ? (
        <div className="grid gap-2">
          <SelectInput label="New status" options={PRODUCT_STATUS_OPTIONS} value={status} onChange={(event) => setStatus(event.target.value)} />
          <p className="text-[0.75rem] text-muted">
            {status === "active" ? "Each product needs at least one image and a metal rate for its purity to be activated." : "Draft and disabled products are hidden from the website."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput label="Flag" options={FLAG_KEYS.map((key) => ({ value: key, label: flagLabels[key] }))} value={flag} onChange={(event) => setFlag(event.target.value as FlagKey)} />
          <SelectInput
            label="Set to"
            options={[
              { value: "true", label: "On" },
              { value: "false", label: "Off" },
            ]}
            value={flagValue}
            onChange={(event) => setFlagValue(event.target.value)}
          />
        </div>
      )}
    </ConfirmDialog>
  );
}
