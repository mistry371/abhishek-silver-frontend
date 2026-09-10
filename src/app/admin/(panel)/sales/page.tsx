"use client";

import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminSession";
import { channelLabel, type SaleListItem } from "@/components/admin/billing/types";
import { AdminButton, AdminLinkButton, DataTable, DateInput, FilterBar, FilterSelect, InlineAlert, PageHeader, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { formatDateTime, humanize, money } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["q", "channel", "paymentStatus", "from", "to", "sort", "page"] as const;

const columns: Column<SaleListItem>[] = [
  {
    key: "saleNumber",
    header: "Sale no.",
    cell: (sale) => (
      <Link href={`/admin/sales/${sale.id}`} className="whitespace-nowrap font-medium hover:underline">
        {sale.saleNumber}
      </Link>
    ),
  },
  { key: "createdAt", header: "Date", sortKey: "createdAt", cell: (sale) => <span className="whitespace-nowrap">{formatDateTime(sale.createdAt)}</span> },
  { key: "channel", header: "Channel", priority: "low", cell: (sale) => <StatusBadge status={sale.channel} label={channelLabel(sale.channel)} tone={sale.channel === "online" ? "info" : "accent"} /> },
  {
    key: "customer",
    header: "Customer",
    cell: (sale) => (
      <span className="block min-w-0">
        <span className="block">{sale.customerId ? <Link href={`/admin/customers/${sale.customerId}`} className="hover:underline">{sale.customerName}</Link> : sale.customerName}</span>
        {sale.customerPhone && <span className="block text-muted">{sale.customerPhone}</span>}
      </span>
    ),
  },
  { key: "grandTotal", header: "Total", sortKey: "grandTotal", align: "right", cell: (sale) => money(sale.grandTotal) },
  { key: "paymentStatus", header: "Payment", cell: (sale) => <StatusBadge status={sale.paymentStatus} /> },
  {
    key: "invoice",
    header: "Invoice",
    priority: "low",
    cell: (sale) =>
      sale.invoice ? (
        <Link href={`/admin/invoices/${sale.invoice.id}`} className="whitespace-nowrap text-champagne-deep hover:underline">
          {sale.invoice.invoiceNumber ?? "Draft"}
        </Link>
      ) : (
        <span className="text-muted">—</span>
      ),
  },
];

export default function SalesPage() {
  const { can } = useAdmin();
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const { data, latest, loading, error, reload } = useAdminResource<Paginated<SaleListItem>>("/sales", query);
  const list = data ?? latest;
  const hasFilters = Boolean(values.q || values.channel || values.paymentStatus || values.from || values.to);

  return (
    <>
      <PageHeader
        title="Sales"
        description="Online and in-store sales. Every sale has an invoice issued by the server."
        actions={
          can("sales:create") && (
            <AdminLinkButton href="/admin/sales/new" variant="primary">
              <PlusIcon size={15} />
              New sale
            </AdminLinkButton>
          )
        }
      />
      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Sale no., customer or mobile" />
        <FilterSelect
          label="Channel"
          value={values.channel}
          onChange={(channel) => setFilters({ channel })}
          options={[
            { value: "manual", label: "In-store" },
            { value: "online", label: "Online" },
          ]}
        />
        <FilterSelect label="Payment" value={values.paymentStatus} onChange={(paymentStatus) => setFilters({ paymentStatus })} options={["pending", "partially_paid", "paid", "refunded"].map((value) => ({ value, label: humanize(value) }))} />
        <DateInput label="From" value={values.from} onChange={(from) => setFilters({ from })} />
        <DateInput label="To" value={values.to} onChange={(to) => setFilters({ to })} />
        {hasFilters && (
          <AdminButton variant="ghost" onClick={() => setFilters({ q: "", channel: "", paymentStatus: "", from: "", to: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>
      {values.from && values.to && values.from > values.to && (
        <InlineAlert tone="warning" className="mb-4">
          The start date is after the end date, so no sales will match.
        </InlineAlert>
      )}
      <DataTable
        columns={columns}
        rows={list?.items}
        getRowKey={(sale) => sale.id}
        loading={loading}
        error={error}
        onRetry={reload}
        sort={values.sort || "createdAt:desc"}
        onSortChange={(sort) => setFilters({ sort })}
        rowHref={(sale) => `/admin/sales/${sale.id}`}
        empty={
          hasFilters
            ? { title: "No sales match these filters", description: "Try a different search or date range." }
            : { title: "No sales yet", description: "In-store sales and paid online orders appear here.", action: can("sales:create") ? <AdminLinkButton href="/admin/sales/new">Record a sale</AdminLinkButton> : undefined }
        }
        footer={list && <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPageChange={(page) => setFilters({ page: page > 1 ? String(page) : "" }, { resetPage: false })} />}
      />
    </>
  );
}
