"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { OrdersSubNav } from "@/components/admin/orders/OrdersSubNav";
import { ProcessRefundDialog, type ProcessRefundTarget } from "@/components/admin/orders/ProcessRefundDialog";
import { REFUND_STATUSES, refundMethodLabels, type RefundListRow } from "@/components/admin/orders/types";
import { AdminButton, DataTable, FilterBar, FilterSelect, PageHeader, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/lib/admin/client";
import { formatDateTime, humanize, money } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["status", "q", "page"] as const;

export default function AdminRefundsPage() {
  const { can } = useAdmin();
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const { latest, loading, error, reload } = useAdminResource<Paginated<RefundListRow>>("/refunds", query);
  const [target, setTarget] = useState<ProcessRefundTarget | null>(null);
  const hasFilters = Boolean(values.status || values.q);
  const canProcess = can("orders:refunds");

  const columns: Column<RefundListRow>[] = [
    { key: "refundNumber", header: "Refund", cell: (row) => <span className="whitespace-nowrap font-medium">{row.refundNumber}</span> },
    {
      key: "order",
      header: "Order",
      cell: (row) => (
        <Link href={`/admin/orders/${row.orderId}`} className="whitespace-nowrap text-champagne-deep hover:underline">
          {row.orderNumber}
        </Link>
      ),
    },
    { key: "customer", header: "Customer", cell: (row) => row.customerName },
    { key: "amount", header: "Amount", align: "right", cell: (row) => <span className="whitespace-nowrap">{money(row.amount)}</span> },
    { key: "method", header: "Method", priority: "low", cell: (row) => refundMethodLabels[row.method] ?? humanize(row.method) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "reference", header: "Reference", priority: "low", cell: (row) => <span className="break-all text-ink-soft">{row.reference ?? "—"}</span> },
    { key: "createdAt", header: "Created", priority: "low", cell: (row) => <span className="whitespace-nowrap text-ink-soft">{formatDateTime(row.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      cell: (row) =>
        row.status === "pending" && canProcess ? (
          <AdminButton size="sm" onClick={() => setTarget(row)}>
            Process
          </AdminButton>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title="Refunds" description="Money returned to customers, by gateway, bank transfer, UPI or cash." />
      <OrdersSubNav />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Refund no., order no. or customer" />
        <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={REFUND_STATUSES.map((status) => ({ value: status, label: humanize(status) }))} />
        {hasFilters && (
          <AdminButton variant="ghost" onClick={() => setFilters({ status: "", q: "" })}>
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
        empty={
          hasFilters
            ? { title: "No matching refunds", description: "Try a different status or search." }
            : { title: "No refunds yet", description: "Refunds are created from a paid order's detail page." }
        }
        footer={
          latest && latest.total > 0 ? (
            <Pagination page={latest.page} totalPages={latest.totalPages} total={latest.total} pageSize={latest.pageSize} onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })} />
          ) : undefined
        }
      />

      {target && (
        <ProcessRefundDialog
          key={target.id}
          refund={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            reload();
          }}
        />
      )}
    </>
  );
}
