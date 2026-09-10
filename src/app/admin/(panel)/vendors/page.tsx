"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { vendorStatusOptions } from "@/components/admin/inventory/options";
import type { Vendor, VendorListItem } from "@/components/admin/inventory/types";
import { VendorDetailDialog, VendorFormDialog } from "@/components/admin/inventory/VendorDialogs";
import { EditIcon } from "@/components/admin/icons";
import { AdminButton, DataTable, FilterBar, FilterSelect, PageHeader, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { money, number } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["q", "status", "sort", "page"] as const;

export default function VendorsPage() {
  const { can } = useAdmin();
  const canManage = can("vendors:manage");
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const list = useAdminResource<Paginated<VendorListItem>>("/vendors", { ...query, pageSize: 25 });
  const [viewing, setViewing] = useState<string | null>(null);
  // `null` = closed, "new" = create, otherwise the vendor being edited.
  const [editing, setEditing] = useState<Vendor | "new" | null>(null);

  const rows = list.latest?.items;
  const showStats = Boolean(rows?.some((row) => row.purchases !== undefined));
  const filtersActive = Boolean(values.q || values.status);

  const columns: Column<VendorListItem>[] = [
    { key: "code", header: "Code", sortKey: "code", cell: (row) => <span className="whitespace-nowrap text-muted">{row.code}</span> },
    {
      key: "name",
      header: "Vendor",
      sortKey: "name",
      cell: (row) => (
        <button type="button" onClick={() => setViewing(row.id)} className="min-w-[10rem] text-left font-medium text-ink hover:underline">
          {row.name}
          {row.contactPerson && <span className="block text-[0.75rem] font-normal text-muted">{row.contactPerson}</span>}
        </button>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (row) =>
        row.mobile || row.email ? (
          <span className="block whitespace-nowrap text-[0.8125rem]">
            {row.mobile && <span className="block">{row.mobile}</span>}
            {row.email && <span className="block text-muted">{row.email}</span>}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: "gstin", header: "GSTIN", priority: "low", cell: (row) => row.gstin ?? <span className="text-muted">—</span> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    ...(showStats
      ? [
          { key: "purchases", header: "Purchases", align: "right" as const, cell: (row: VendorListItem) => number(row.purchases ?? 0) },
          { key: "approvedValue", header: "Approved value", align: "right" as const, priority: "low" as const, cell: (row: VendorListItem) => money(row.approvedValue ?? 0) },
        ]
      : []),
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (
        <span className="flex justify-end gap-1">
          <AdminButton size="sm" variant="ghost" onClick={() => setViewing(row.id)}>
            View
          </AdminButton>
          {canManage && (
            <AdminButton size="sm" variant="ghost" onClick={() => setEditing(row)} aria-label={`Edit ${row.name}`}>
              <EditIcon size={14} />
            </AdminButton>
          )}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Suppliers you purchase gold and silver stock from. Vendor details are confidential."
        actions={
          canManage && (
            <AdminButton variant="primary" onClick={() => setEditing("new")}>
              <PlusIcon size={15} />
              New vendor
            </AdminButton>
          )
        }
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Name, code, mobile, GSTIN or contact" />
        <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={vendorStatusOptions} />
        {filtersActive && (
          <AdminButton variant="ghost" onClick={() => setFilters({ q: "", status: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        sort={values.sort}
        onSortChange={(sort) => setFilters({ sort })}
        empty={{
          title: filtersActive ? "No vendors match these filters" : "No vendors yet",
          action:
            !filtersActive && canManage ? (
              <AdminButton variant="primary" onClick={() => setEditing("new")}>
                Add your first vendor
              </AdminButton>
            ) : undefined,
        }}
        footer={
          list.latest && list.latest.total > 0 ? (
            <Pagination page={list.latest.page} totalPages={list.latest.totalPages} total={list.latest.total} pageSize={list.latest.pageSize} onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })} />
          ) : undefined
        }
      />

      <VendorDetailDialog
        vendorId={viewing}
        onClose={() => setViewing(null)}
        onEdit={(vendor) => {
          setViewing(null);
          setEditing(vendor);
        }}
      />

      {editing && (
        <VendorFormDialog
          key={editing === "new" ? "new" : editing.id}
          open
          vendor={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </>
  );
}
