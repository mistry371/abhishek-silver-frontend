"use client";

import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminSession";
import { purchaseStatusOptions } from "@/components/admin/inventory/options";
import type { PurchaseListItem, VendorListItem } from "@/components/admin/inventory/types";
import { AdminButton, AdminLinkButton, DataTable, DateInput, FilterBar, FilterSelect, InlineAlert, PageHeader, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { formatDate, money, number, weight } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["q", "status", "vendorId", "from", "to", "sort", "page"] as const;

const columns: Column<PurchaseListItem>[] = [
  {
    key: "number",
    header: "Number",
    cell: (row) => (
      <Link href={`/admin/purchases/${row.id}`} className="whitespace-nowrap font-medium text-ink hover:underline">
        {row.purchaseNumber}
      </Link>
    ),
  },
  { key: "date", header: "Date", sortKey: "purchaseDate", cell: (row) => <span className="whitespace-nowrap">{formatDate(row.purchaseDate)}</span> },
  { key: "vendor", header: "Vendor", cell: (row) => <span className="block min-w-[8rem]">{row.vendorName}</span> },
  { key: "invoice", header: "Invoice ref", priority: "low", cell: (row) => row.vendorInvoiceRef ?? <span className="text-muted">—</span> },
  { key: "quantity", header: "Qty", align: "right", cell: (row) => number(row.totalQuantity) },
  { key: "netWeight", header: "Net weight", align: "right", priority: "low", cell: (row) => <span className="whitespace-nowrap">{weight(row.totalNetWeight)}</span> },
  { key: "total", header: "Total", sortKey: "total", align: "right", cell: (row) => <span className="whitespace-nowrap font-medium">{money(row.total)}</span> },
  { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  { key: "location", header: "Location", priority: "low", cell: (row) => row.locationName },
];

export default function PurchasesPage() {
  const { can } = useAdmin();
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const invalidRange = Boolean(values.from && values.to && values.from > values.to);
  const list = useAdminResource<Paginated<PurchaseListItem>>(invalidRange ? null : "/purchases", { ...query, pageSize: 25 });
  const vendors = useAdminResource<Paginated<VendorListItem>>(can("vendors:view") ? "/vendors" : null, { pageSize: 100, sort: "name:asc" });
  const filtersActive = Boolean(values.q || values.status || values.vendorId || values.from || values.to);

  return (
    <>
      <PageHeader
        title="Purchases"
        description="Vendor purchases. Stock is added to inventory only when a purchase is approved."
        actions={
          <>
            {can("vendors:view") && <AdminLinkButton href="/admin/vendors">Vendors</AdminLinkButton>}
            {can("purchases:create") && (
              <AdminLinkButton href="/admin/purchases/new" variant="primary">
                <PlusIcon size={15} />
                New purchase
              </AdminLinkButton>
            )}
          </>
        }
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Number, invoice ref or vendor" />
        <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={purchaseStatusOptions} />
        {vendors.latest && vendors.latest.items.length > 0 && (
          <FilterSelect label="Vendor" value={values.vendorId} onChange={(vendorId) => setFilters({ vendorId })} options={vendors.latest.items.map((vendor) => ({ value: vendor.id, label: vendor.name }))} allLabel="All vendors" />
        )}
        <DateInput label="From" value={values.from} onChange={(from) => setFilters({ from })} />
        <DateInput label="To" value={values.to} onChange={(to) => setFilters({ to })} />
        {filtersActive && (
          <AdminButton variant="ghost" onClick={() => setFilters({ q: "", status: "", vendorId: "", from: "", to: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>

      {invalidRange ? (
        <InlineAlert tone="warning">The “From” date is after the “To” date. Adjust the range to see purchases.</InlineAlert>
      ) : (
        <DataTable
          columns={columns}
          rows={list.latest?.items}
          getRowKey={(row) => row.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          sort={values.sort}
          onSortChange={(sort) => setFilters({ sort })}
          rowHref={(row) => `/admin/purchases/${row.id}`}
          empty={{
            title: filtersActive ? "No purchases match these filters" : "No purchases yet",
            action: !filtersActive && can("purchases:create") ? <AdminLinkButton href="/admin/purchases/new" variant="primary">Record a purchase</AdminLinkButton> : undefined,
          }}
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
