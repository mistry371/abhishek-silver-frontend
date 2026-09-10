"use client";

import Link from "next/link";
import { movementColumns } from "@/components/admin/inventory/movements";
import { movementTypeOptions, referenceTypeOptions } from "@/components/admin/inventory/options";
import type { StockLocation, StockMovement } from "@/components/admin/inventory/types";
import { AdminButton, DataTable, DateInput, FilterBar, FilterSelect, InlineAlert, PageHeader, Pagination, SearchBox } from "@/components/admin/ui";
import type { Paginated } from "@/lib/admin/client";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["q", "type", "locationId", "referenceType", "from", "to", "productId", "page"] as const;

export default function StockMovementsPage() {
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const invalidRange = Boolean(values.from && values.to && values.from > values.to);
  const list = useAdminResource<Paginated<StockMovement>>(invalidRange ? null : "/inventory/movements", { ...query, pageSize: 50 });
  const locations = useAdminResource<StockLocation[]>("/locations");

  const locationList = locations.latest ?? [];
  const locationName = (id: string) => locationList.find((location) => location.id === id)?.name ?? id;
  const rows = list.latest?.items;
  const filtersActive = FILTER_KEYS.some((key) => key !== "page" && values[key]);
  const productName = values.productId ? rows?.find((row) => row.productId === values.productId)?.productName : undefined;

  return (
    <>
      <PageHeader title="Stock movements" description="The immutable ledger of every stock change: purchases, sales, returns, manual adjustments and transfers." back={{ href: "/admin/inventory", label: "Inventory" }} />

      {values.productId && (
        <InlineAlert tone="info" className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            Showing movements for{" "}
            <Link href={`/admin/inventory/${values.productId}`} className="font-medium text-ink underline-offset-4 hover:underline">
              {productName ?? "one product"}
            </Link>
            .
          </span>
          <button type="button" className="underline" onClick={() => setFilters({ productId: "" })}>
            Show all products
          </button>
        </InlineAlert>
      )}

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Product, SKU, staff or reference" />
        <FilterSelect label="Type" value={values.type} onChange={(type) => setFilters({ type })} options={movementTypeOptions} />
        {locationList.length > 0 && <FilterSelect label="Location" value={values.locationId} onChange={(locationId) => setFilters({ locationId })} options={locationList.map((location) => ({ value: location.id, label: location.name }))} allLabel="All locations" />}
        <FilterSelect label="Reference" value={values.referenceType} onChange={(referenceType) => setFilters({ referenceType })} options={referenceTypeOptions} />
        <DateInput label="From" value={values.from} onChange={(from) => setFilters({ from })} />
        <DateInput label="To" value={values.to} onChange={(to) => setFilters({ to })} />
        {filtersActive && (
          <AdminButton variant="ghost" onClick={() => setFilters({ q: "", type: "", locationId: "", referenceType: "", from: "", to: "", productId: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>

      {invalidRange ? (
        <InlineAlert tone="warning">The “From” date is after the “To” date. Adjust the range to see movements.</InlineAlert>
      ) : (
        <DataTable
          columns={movementColumns({ locationName, showProduct: true })}
          rows={rows}
          getRowKey={(movement) => movement.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          empty={{ title: filtersActive ? "No movements match these filters" : "No stock movements yet" }}
          footer={
            list.latest && list.latest.total > 0 ? (
              <Pagination page={list.latest.page} totalPages={list.latest.totalPages} total={list.latest.total} pageSize={list.latest.pageSize} onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })} />
            ) : undefined
          }
        />
      )}
    </>
  );
}
