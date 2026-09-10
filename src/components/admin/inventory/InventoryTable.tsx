"use client";

import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminSession";
import { AdminButton, DataTable, FilterBar, FilterSelect, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/lib/admin/client";
import { money, number, weight } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";
import { metalOptions, metalPurity, productStatusOptions, purityOptions, stockStatusOptions } from "./options";
import type { CategoryOption, InventoryRow, StockLocation } from "./types";

const FILTER_KEYS = ["q", "categoryId", "metal", "purity", "status", "productStatus", "locationId", "sort", "page"] as const;
const PAGE_SIZE = 25;

const sortOptions = [
  { value: "name:desc", label: "Name (Z–A)" },
  { value: "sku:asc", label: "SKU" },
  { value: "quantity:asc", label: "Lowest stock first" },
  { value: "quantity:desc", label: "Highest stock first" },
  { value: "updatedAt:desc", label: "Recently updated" },
];

/**
 * Inventory master table with URL-backed filters. `fixedStatus` pins the
 * stock status (low-stock / out-of-stock views) and hides that filter.
 */
export function InventoryTable({ fixedStatus, empty }: { fixedStatus?: "low_stock" | "out_of_stock"; empty?: { title: string; description?: string } }) {
  const { can } = useAdmin();
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const list = useAdminResource<Paginated<InventoryRow>>("/inventory", { ...query, ...(fixedStatus ? { status: fixedStatus } : {}), pageSize: PAGE_SIZE });
  const locations = useAdminResource<StockLocation[]>("/locations");
  const categories = useAdminResource<CategoryOption[]>(can("products:view") || can("catalog:manage_taxonomy") ? "/categories" : null);

  const locationList = locations.latest ?? [];
  const locationName = (id: string) => locationList.find((location) => location.id === id)?.name ?? id;
  const typeCategories = (categories.latest ?? []).filter((category) => category.group === "type");
  const rows = list.latest?.items;
  const showValuation = Boolean(rows?.some((row) => "valuation" in row));
  const filtersActive = FILTER_KEYS.some((key) => key !== "page" && key !== "sort" && (key !== "status" || !fixedStatus) && values[key]);

  const columns: Column<InventoryRow>[] = [
    {
      key: "product",
      header: "Product",
      sortKey: "name",
      cell: (row) => (
        <div className="flex min-w-[14rem] items-start gap-3">
          {row.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.image.url} alt={row.image.alt} className="h-11 w-11 shrink-0 bg-cream object-cover" />
          ) : (
            <span className="h-11 w-11 shrink-0 bg-cream" aria-hidden="true" />
          )}
          <span className="min-w-0">
            <Link href={`/admin/inventory/${row.productId}`} className="block font-medium text-ink hover:underline">
              {row.name}
            </Link>
            <span className="block text-[0.75rem] text-muted">
              {row.sku}
              {row.barcode && <> · {row.barcode}</>}
            </span>
            {row.productStatus !== "active" && <StatusBadge status={row.productStatus} className="mt-1" />}
          </span>
        </div>
      ),
    },
    { key: "category", header: "Category", priority: "low", cell: (row) => row.category.name },
    { key: "metal", header: "Metal / purity", cell: (row) => <span className="whitespace-nowrap">{metalPurity(row.metal, row.purity)}</span> },
    {
      key: "weight",
      header: "Net / gross",
      align: "right",
      priority: "low",
      cell: (row) => (
        <span className="whitespace-nowrap">
          {weight(row.netWeight)}
          <span className="block text-[0.75rem] text-muted">{row.grossWeight !== null ? weight(row.grossWeight) : "—"}</span>
        </span>
      ),
    },
    {
      key: "levels",
      header: "By location",
      cell: (row) => {
        const entries = Object.entries(row.levels).filter(([, quantity]) => quantity !== 0);
        if (!entries.length) return <span className="text-muted">—</span>;
        return (
          <ul className="space-y-0.5 whitespace-nowrap text-[0.75rem]">
            {entries.map(([locationId, quantity]) => (
              <li key={locationId}>
                <span className="text-muted">{locationName(locationId)}:</span> <span className="tabular-nums">{number(quantity)}</span>
              </li>
            ))}
          </ul>
        );
      },
    },
    { key: "total", header: "Total", sortKey: "quantity", align: "right", cell: (row) => <span className="font-medium">{number(row.total)}</span> },
    {
      key: "status",
      header: "Stock",
      cell: (row) => (
        <span className="whitespace-nowrap">
          <StatusBadge status={row.stockStatus} />
          <span className="mt-0.5 block text-[0.6875rem] text-muted">Alert at {row.lowStockThreshold}</span>
        </span>
      ),
    },
    ...(showValuation
      ? [{ key: "valuation", header: "Valuation", align: "right" as const, priority: "low" as const, cell: (row: InventoryRow) => (row.valuation === null || row.valuation === undefined ? <span className="text-muted" title="No purchase price recorded">—</span> : money(row.valuation)) }]
      : []),
  ];

  return (
    <>
      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Search name, SKU or barcode" />
        {typeCategories.length > 0 && (
          <FilterSelect label="Category" value={values.categoryId} onChange={(categoryId) => setFilters({ categoryId })} options={typeCategories.map((category) => ({ value: category.id, label: category.name }))} />
        )}
        <FilterSelect
          label="Metal"
          value={values.metal}
          onChange={(metal) => setFilters({ metal, ...(values.purity && metal && !purityOptions(metal).some((option) => option.value === values.purity) ? { purity: "" } : {}) })}
          options={metalOptions}
        />
        <FilterSelect label="Purity" value={values.purity} onChange={(purity) => setFilters({ purity })} options={purityOptions(values.metal || undefined)} />
        {!fixedStatus && <FilterSelect label="Stock" value={values.status} onChange={(status) => setFilters({ status })} options={stockStatusOptions} />}
        <FilterSelect label="Product status" value={values.productStatus} onChange={(productStatus) => setFilters({ productStatus })} options={productStatusOptions} />
        {locationList.length > 0 && (
          <FilterSelect label="Location" value={values.locationId} onChange={(locationId) => setFilters({ locationId })} options={locationList.map((location) => ({ value: location.id, label: location.name }))} allLabel="All locations" />
        )}
        <FilterSelect label="Sort" value={values.sort} onChange={(sort) => setFilters({ sort })} options={sortOptions} allLabel="Name (A–Z)" />
        {filtersActive && (
          <AdminButton variant="ghost" onClick={() => setFilters({ q: "", categoryId: "", metal: "", purity: "", status: "", productStatus: "", locationId: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>
      {values.locationId && <p className="mb-3 text-[0.75rem] text-muted">Showing products with stock at {locationName(values.locationId)}.</p>}
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.productId}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={values.sort}
        onSortChange={(sort) => setFilters({ sort })}
        rowHref={(row) => `/admin/inventory/${row.productId}`}
        empty={empty ?? { title: filtersActive ? "No products match these filters" : "No products in inventory yet" }}
        footer={
          list.latest && list.latest.total > 0 ? (
            <Pagination page={list.latest.page} totalPages={list.latest.totalPages} total={list.latest.total} pageSize={list.latest.pageSize} onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })} />
          ) : undefined
        }
      />
    </>
  );
}
