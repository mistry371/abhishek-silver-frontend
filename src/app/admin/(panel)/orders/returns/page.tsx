"use client";

import Link from "next/link";
import { useState } from "react";
import { OrdersSubNav } from "@/components/admin/orders/OrdersSubNav";
import { ReturnActions, ReturnStatusDialog, type ReturnActionTarget } from "@/components/admin/orders/ReturnStatusDialog";
import { RETURN_STATUSES, type ReturnListRow } from "@/components/admin/orders/types";
import { AdminButton, DataTable, FilterBar, FilterSelect, PageHeader, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/lib/admin/client";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["status", "q", "page"] as const;

function itemsSummary(row: ReturnListRow) {
  return row.items.map((line) => `${line.name} × ${line.quantity}`).join(", ");
}

export default function AdminReturnsPage() {
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const { latest, loading, error, reload } = useAdminResource<Paginated<ReturnListRow>>("/returns", query);
  const [target, setTarget] = useState<ReturnActionTarget | null>(null);
  const hasFilters = Boolean(values.status || values.q);

  const columns: Column<ReturnListRow>[] = [
    { key: "returnNumber", header: "Return", cell: (row) => <span className="whitespace-nowrap font-medium">{row.returnNumber}</span> },
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
    {
      key: "items",
      header: "Items",
      cell: (row) => (
        <span className="line-clamp-2 block min-w-[12rem] max-w-[22rem] text-ink-soft" title={itemsSummary(row)}>
          {itemsSummary(row)}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "restocked", header: "Restocked", priority: "low", cell: (row) => (row.restocked ? <StatusBadge status="restocked" label="Restocked" tone="success" /> : <span className="text-muted">No</span>) },
    { key: "createdAt", header: "Created", priority: "low", cell: (row) => <span className="whitespace-nowrap text-ink-soft">{formatDateTime(row.createdAt)}</span> },
    { key: "actions", header: <span className="sr-only">Actions</span>, cell: (row) => <ReturnActions ret={row} onAction={setTarget} /> },
  ];

  return (
    <>
      <PageHeader title="Returns" description="Items customers are sending back, from request to restock." />
      <OrdersSubNav />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Return no., order no. or customer" />
        <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={RETURN_STATUSES.map((status) => ({ value: status, label: humanize(status) }))} />
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
            ? { title: "No matching returns", description: "Try a different status or search." }
            : { title: "No returns yet", description: "Returns are recorded from a shipped, delivered or completed order." }
        }
        footer={
          latest && latest.total > 0 ? (
            <Pagination page={latest.page} totalPages={latest.totalPages} total={latest.total} pageSize={latest.pageSize} onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })} />
          ) : undefined
        }
      />

      {target && (
        <ReturnStatusDialog
          key={`${target.returnId}:${target.status}`}
          target={target}
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
