"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { LogEnquiryDialog } from "@/components/admin/customers/LogEnquiryDialog";
import { enquirySourceOptions, enquiryStatusOptions, enquiryTypeOptions, labelOf } from "@/components/admin/customers/shared";
import type { Assignee, EnquiryList, EnquiryRow } from "@/components/admin/customers/types";
import { AdminButton, DataTable, DateInput, FilterBar, FilterSelect, PageHeader, Pagination, SearchBox, StatusBadge, Tabs, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { formatDateTime, number } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["status", "type", "source", "assignedTo", "from", "to", "q", "sort", "page"] as const;
const FILTER_DEFAULTS = { page: "1" };
const PAGE_SIZE = 25;

export default function EnquiriesPage() {
  const router = useRouter();
  const { admin, can } = useAdmin();
  const canManage = can("enquiries:manage");
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS, FILTER_DEFAULTS);
  const { latest, loading, error, reload } = useAdminResource<EnquiryList>("/enquiries", { ...query, pageSize: PAGE_SIZE });
  const assignees = useAdminResource<Assignee[]>(canManage ? "/enquiries/assignees" : null);
  const [dialog, setDialog] = useState({ open: false, key: 0 });

  const statusCounts = latest?.statusCounts ?? {};
  const allCount = Object.values(statusCounts).reduce((sum, value) => sum + Number(value || 0), 0);
  const filtered = Boolean(values.type || values.source || values.assignedTo || values.from || values.to || values.q);
  const clearFilters = () => setFilters({ type: "", source: "", assignedTo: "", from: "", to: "", q: "" });
  const openDialog = () => setDialog((current) => ({ open: true, key: current.key + 1 }));

  const assigneeOptions = [
    { value: "me", label: "Assigned to me" },
    { value: "unassigned", label: "Unassigned" },
    ...(assignees.latest ?? []).filter((member) => member.id !== admin.id).map((member) => ({ value: member.id, label: member.name })),
  ];

  const columns: Column<EnquiryRow>[] = [
    {
      key: "reference",
      header: "Reference",
      cell: (row) => (
        <Link href={`/admin/enquiries/${row.id}`} className="whitespace-nowrap font-medium hover:underline">
          {row.reference}
        </Link>
      ),
    },
    { key: "received", header: "Received", sortKey: "createdAt", cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span> },
    {
      key: "contact",
      header: "Name",
      cell: (row) => (
        <span className="block min-w-[9rem]">
          <span className="block text-ink">{row.name}</span>
          <span className="block text-muted">{row.mobile}</span>
        </span>
      ),
    },
    { key: "type", header: "Type", cell: (row) => <span className="whitespace-nowrap">{labelOf(enquiryTypeOptions, row.type)}</span> },
    {
      key: "product",
      header: "Product",
      priority: "low",
      cell: (row) =>
        row.product ? (
          <span className="block min-w-[8rem]">
            <span className="block text-ink">{row.product.name}</span>
            <span className="block text-muted">{row.product.sku}</span>
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    { key: "source", header: "Source", priority: "low", cell: (row) => <span className="whitespace-nowrap">{labelOf(enquirySourceOptions, row.source)}</span> },
    {
      key: "assigned",
      header: "Assigned to",
      cell: (row) =>
        row.assignedToAdminId ? (
          <span className="whitespace-nowrap">{row.assignedToAdminId === admin.id ? "You" : (row.assignedTo ?? "—")}</span>
        ) : (
          <span className="text-muted">Unassigned</span>
        ),
    },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Product, custom jewellery and contact enquiries from the website, WhatsApp, phone and the store."
        actions={
          canManage && (
            <AdminButton variant="primary" onClick={openDialog}>
              <PlusIcon size={16} />
              Log enquiry
            </AdminButton>
          )
        }
      />

      <Tabs
        className="mb-4"
        value={values.status}
        onChange={(status) => setFilters({ status })}
        tabs={[
          { value: "", label: "All", count: latest ? allCount : undefined },
          ...enquiryStatusOptions.map((option) => ({ value: option.value, label: option.label, count: latest ? Number(statusCounts[option.value] ?? 0) : undefined })),
        ]}
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Reference, name, mobile, email or product" />
        <FilterSelect label="Type" value={values.type} onChange={(type) => setFilters({ type })} options={enquiryTypeOptions} />
        <FilterSelect label="Source" value={values.source} onChange={(source) => setFilters({ source })} options={enquirySourceOptions} />
        <FilterSelect label="Assigned to" value={values.assignedTo} onChange={(assignedTo) => setFilters({ assignedTo })} options={assigneeOptions} allLabel="Anyone" />
        <DateInput label="From" value={values.from} onChange={(from) => setFilters({ from })} />
        <DateInput label="To" value={values.to} onChange={(to) => setFilters({ to })} />
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
        rowHref={(row) => `/admin/enquiries/${row.id}`}
        empty={
          filtered || values.status
            ? {
                title: "No enquiries match this view",
                description: "Try another status tab, search or filter.",
                action: filtered ? <AdminButton onClick={clearFilters}>Clear filters</AdminButton> : undefined,
              }
            : { title: "No enquiries yet", description: "Enquiries from the website and those logged by staff appear here." }
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
      {latest && <p className="mt-3 text-[0.75rem] text-muted">Tab counts cover all enquiries ({number(allCount)} total), before filters.</p>}

      {canManage && (
        <LogEnquiryDialog
          key={dialog.key}
          open={dialog.open}
          onClose={() => setDialog((current) => ({ ...current, open: false }))}
          onCreated={(enquiry) => {
            setDialog((current) => ({ ...current, open: false }));
            router.push(`/admin/enquiries/${enquiry.id}`);
          }}
        />
      )}
    </>
  );
}
