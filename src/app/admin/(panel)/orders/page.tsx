"use client";

import { CheckboxInput } from "@/components/admin/fields";
import { OrdersSubNav } from "@/components/admin/orders/OrdersSubNav";
import { needsStockReview, ORDER_STATUSES, PAYMENT_STATUSES, type OrderListResponse, type OrderListRow } from "@/components/admin/orders/types";
import { AdminButton, DataTable, DateInput, FilterBar, FilterSelect, PageHeader, Pagination, SearchBox, StatusBadge, Tabs, type Column } from "@/components/admin/ui";
import { formatDateTime, humanize, money, number } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["status", "paymentStatus", "from", "to", "q", "includeUnpaid", "sort", "page"] as const;

const columns: Column<OrderListRow>[] = [
  { key: "orderNumber", header: "Order", cell: (row) => <span className="whitespace-nowrap font-medium">{row.orderNumber}</span> },
  { key: "createdAt", header: "Date", sortKey: "createdAt", cell: (row) => <span className="whitespace-nowrap text-ink-soft">{formatDateTime(row.createdAt)}</span> },
  {
    key: "customer",
    header: "Customer",
    cell: (row) => (
      <span className="block min-w-[9rem]">
        <span className="block">{row.customerName}</span>
        <span className="block text-[0.75rem] text-muted">{row.customerPhone}</span>
      </span>
    ),
  },
  { key: "items", header: "Items", align: "right", priority: "low", cell: (row) => number(row.itemCount) },
  { key: "grandTotal", header: "Total", sortKey: "grandTotal", align: "right", cell: (row) => <span className="whitespace-nowrap">{money(row.grandTotal)}</span> },
  { key: "paymentStatus", header: "Payment", cell: (row) => <StatusBadge status={row.paymentStatus} /> },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <span className="flex flex-wrap gap-1.5">
        <StatusBadge status={row.status} />
        {needsStockReview(row) && <StatusBadge status="stock_review" label="Stock review" tone="danger" />}
      </span>
    ),
  },
];

export default function AdminOrdersPage() {
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const { latest, loading, error, reload } = useAdminResource<OrderListResponse>("/orders", query);

  const counts = latest?.statusCounts;
  const allCount = counts ? Object.values(counts).reduce<number>((sum, value) => sum + (value ?? 0), 0) : undefined;
  const hasFilters = Boolean(values.status || values.paymentStatus || values.from || values.to || values.q || values.includeUnpaid);

  return (
    <>
      <PageHeader title="Orders" description="Online orders with their payment and fulfilment status." />
      <OrdersSubNav />

      <Tabs
        className="mb-4"
        value={values.status}
        onChange={(status) => setFilters({ status })}
        tabs={[
          { value: "", label: "All", count: allCount },
          ...ORDER_STATUSES.map((status) => ({ value: status, label: humanize(status), count: counts ? (counts[status] ?? 0) : undefined })),
        ]}
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Order no., name, phone or email" />
        <FilterSelect
          label="Payment"
          value={values.paymentStatus}
          onChange={(paymentStatus) => setFilters({ paymentStatus })}
          options={PAYMENT_STATUSES.map((status) => ({ value: status, label: humanize(status) }))}
        />
        <DateInput label="From" value={values.from} onChange={(from) => setFilters({ from })} />
        <DateInput label="To" value={values.to} onChange={(to) => setFilters({ to })} />
        <div className="flex h-10 items-center">
          <CheckboxInput
            label="Include unpaid checkout attempts"
            checked={values.includeUnpaid === "true"}
            onChange={(event) => setFilters({ includeUnpaid: event.target.checked ? "true" : "" })}
          />
        </div>
        {hasFilters && (
          <AdminButton variant="ghost" onClick={() => setFilters({ status: "", paymentStatus: "", from: "", to: "", q: "", includeUnpaid: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        rows={latest?.items}
        getRowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={reload}
        sort={values.sort}
        onSortChange={(sort) => setFilters({ sort })}
        rowHref={(row) => `/admin/orders/${row.id}`}
        empty={
          hasFilters
            ? { title: "No matching orders", description: "Try a different status, date range or search." }
            : { title: "No orders yet", description: "Paid online orders appear here. Tick “Include unpaid checkout attempts” to see abandoned payments." }
        }
        footer={
          latest && latest.total > 0 ? (
            <Pagination page={latest.page} totalPages={latest.totalPages} total={latest.total} pageSize={latest.pageSize} onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })} />
          ) : undefined
        }
      />
    </>
  );
}
