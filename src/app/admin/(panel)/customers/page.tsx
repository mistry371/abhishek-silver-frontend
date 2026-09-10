"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CustomerFormDialog } from "@/components/admin/customers/CustomerFormDialog";
import { customerSourceOptions, customerStatusOptions } from "@/components/admin/customers/shared";
import type { CustomerRow } from "@/components/admin/customers/types";
import { AdminButton, DataTable, DateInput, FilterBar, FilterSelect, PageHeader, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { formatDate, money, number } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["q", "status", "source", "registeredFrom", "registeredTo", "minSpent", "sort", "page"] as const;
const FILTER_DEFAULTS = { page: "1" };
const PAGE_SIZE = 25;

/** Amount filter that applies on Enter or blur, like SearchBox. */
function MinSpentFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  const commit = () => {
    const next = draft.trim();
    if (next === value) return;
    if (next && (!Number.isFinite(Number(next)) || Number(next) < 0)) {
      setDraft(value);
      return;
    }
    onChange(next);
  };
  return (
    <form
      className="flex flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <label htmlFor={id} className="mb-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
        Min. spent (₹)
      </label>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        placeholder="Any"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        className="h-10 w-32 border border-line bg-porcelain px-2.5 text-[0.8125rem] text-ink outline-none focus:border-ink"
      />
    </form>
  );
}

export default function CustomersPage() {
  const router = useRouter();
  const { can } = useAdmin();
  const canManage = can("customers:manage");
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS, FILTER_DEFAULTS);
  const { latest, loading, error, reload } = useAdminResource<Paginated<CustomerRow>>("/customers", { ...query, pageSize: PAGE_SIZE });
  const [dialog, setDialog] = useState({ open: false, key: 0 });

  const filtered = Boolean(values.q || values.status || values.source || values.registeredFrom || values.registeredTo || values.minSpent);
  const openDialog = () => setDialog((current) => ({ open: true, key: current.key + 1 }));
  const clearFilters = () => setFilters({ q: "", status: "", source: "", registeredFrom: "", registeredTo: "", minSpent: "" });

  const columns: Column<CustomerRow>[] = [
    { key: "code", header: "Customer ID", cell: (row) => <span className="whitespace-nowrap text-ink-soft">{row.customerCode}</span> },
    {
      key: "name",
      header: "Name",
      sortKey: "name",
      cell: (row) => (
        <Link href={`/admin/customers/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "mobile", header: "Mobile", cell: (row) => <span className="whitespace-nowrap">{row.phone ?? "—"}</span> },
    { key: "email", header: "Email", priority: "low", cell: (row) => <span className="break-all">{row.email ?? "—"}</span> },
    {
      key: "account",
      header: "Account",
      priority: "low",
      cell: (row) => (row.hasAccount ? <StatusBadge status="account" label="Online" tone="info" /> : <StatusBadge status="account" label="None" tone="neutral" />),
    },
    { key: "purchases", header: "Purchases", align: "right", cell: (row) => number(row.purchaseCount) },
    { key: "spent", header: "Total spent", align: "right", sortKey: "totalSpent", cell: (row) => money(row.totalSpent) },
    { key: "last", header: "Last purchase", sortKey: "lastPurchaseAt", priority: "low", cell: (row) => <span className="whitespace-nowrap">{formatDate(row.lastPurchaseAt)}</span> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "registered", header: "Registered", sortKey: "createdAt", priority: "low", cell: (row) => <span className="whitespace-nowrap">{formatDate(row.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description={latest ? `${number(latest.total)} ${latest.total === 1 ? "customer" : "customers"} · online accounts and walk-in customers in one directory.` : "Online accounts and walk-in customers in one directory."}
        actions={
          canManage && (
            <AdminButton variant="primary" onClick={openDialog}>
              <PlusIcon size={16} />
              Add customer
            </AdminButton>
          )
        }
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Name, mobile, email, customer ID or order no." />
        <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={customerStatusOptions} />
        <FilterSelect label="Source" value={values.source} onChange={(source) => setFilters({ source })} options={customerSourceOptions} />
        <DateInput label="Registered from" value={values.registeredFrom} onChange={(registeredFrom) => setFilters({ registeredFrom })} />
        <DateInput label="Registered to" value={values.registeredTo} onChange={(registeredTo) => setFilters({ registeredTo })} />
        <MinSpentFilter value={values.minSpent} onChange={(minSpent) => setFilters({ minSpent })} />
        {filtered && (
          <AdminButton variant="ghost" onClick={clearFilters}>
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
        rowHref={(row) => `/admin/customers/${row.id}`}
        empty={
          filtered
            ? {
                title: "No customers match these filters",
                description: "Try a different search or clear the filters.",
                action: <AdminButton onClick={clearFilters}>Clear filters</AdminButton>,
              }
            : {
                title: "No customers yet",
                description: "Customers appear here when they create an online account or when staff add them.",
                action: canManage ? (
                  <AdminButton variant="primary" onClick={openDialog}>
                    <PlusIcon size={16} />
                    Add customer
                  </AdminButton>
                ) : undefined,
              }
        }
        footer={
          latest && latest.total > 0 ? (
            <Pagination
              page={latest.page}
              totalPages={latest.totalPages}
              total={latest.total}
              pageSize={latest.pageSize}
              onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })}
            />
          ) : undefined
        }
      />

      {canManage && (
        <CustomerFormDialog
          key={dialog.key}
          open={dialog.open}
          onClose={() => setDialog((current) => ({ ...current, open: false }))}
          onSaved={(record) => {
            setDialog((current) => ({ ...current, open: false }));
            router.push(`/admin/customers/${record.id}`);
          }}
        />
      )}
    </>
  );
}
