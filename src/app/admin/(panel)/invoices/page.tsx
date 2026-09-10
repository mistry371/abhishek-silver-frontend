"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { sourceLabel, type InvoiceListItem } from "@/components/admin/billing/types";
import { AdminButton, AdminLinkButton, DataTable, DateInput, FilterBar, FilterSelect, InlineAlert, PageHeader, Pagination, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { formatDate, humanize, money, todayIst } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

const FILTER_KEYS = ["q", "status", "source", "from", "to", "sort", "page"] as const;

export default function InvoicesPage() {
  const { can } = useAdmin();
  const [today] = useState(todayIst);
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const { data, latest, loading, error, reload } = useAdminResource<Paginated<InvoiceListItem>>("/invoices", query);
  const list = data ?? latest;
  const hasFilters = Boolean(values.q || values.status || values.source || values.from || values.to);

  const columns: Column<InvoiceListItem>[] = [
    {
      key: "number",
      header: "Number",
      cell: (invoice) => (
        <Link href={`/admin/invoices/${invoice.id}`} className={cn("whitespace-nowrap hover:underline", invoice.invoiceNumber ? "font-medium" : "italic text-muted")}>
          {invoice.invoiceNumber ?? "Draft"}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      cell: (invoice) => (
        <span className="block min-w-0">
          <span className="block">{invoice.customer.name}</span>
          {invoice.customer.mobile && <span className="block text-muted">{invoice.customer.mobile}</span>}
        </span>
      ),
    },
    { key: "source", header: "Source", priority: "low", cell: (invoice) => sourceLabel(invoice.source) },
    { key: "issuedAt", header: "Issued", sortKey: "issuedAt", cell: (invoice) => <span className="whitespace-nowrap">{formatDate(invoice.issuedAt)}</span> },
    {
      key: "dueDate",
      header: "Due",
      priority: "low",
      cell: (invoice) => {
        const overdue = Boolean(invoice.dueDate && invoice.dueDate < today && invoice.balanceDue > 0 && invoice.status !== "cancelled" && invoice.status !== "draft");
        return <span className={cn("whitespace-nowrap", overdue && "text-danger")}>{formatDate(invoice.dueDate)}{overdue ? " · overdue" : ""}</span>;
      },
    },
    { key: "grandTotal", header: "Total", sortKey: "grandTotal", align: "right", cell: (invoice) => money(invoice.grandTotal) },
    { key: "amountPaid", header: "Paid", align: "right", priority: "low", cell: (invoice) => money(invoice.amountPaid) },
    { key: "balanceDue", header: "Balance", sortKey: "balanceDue", align: "right", cell: (invoice) => <span className={cn(invoice.balanceDue > 0 && invoice.status !== "draft" && "text-danger")}>{money(invoice.balanceDue)}</span> },
    { key: "status", header: "Status", cell: (invoice) => <StatusBadge status={invoice.status} /> },
    { key: "createdAt", header: "Created", sortKey: "createdAt", priority: "low", cell: (invoice) => <span className="whitespace-nowrap text-muted">{formatDate(invoice.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Every invoice: online orders, in-store sales and manual invoices."
        back={{ href: "/admin/billing", label: "Billing" }}
        actions={
          can("billing:create") && (
            <AdminLinkButton href="/admin/billing/new" variant="primary">
              <PlusIcon size={15} />
              New invoice
            </AdminLinkButton>
          )
        }
      />
      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Invoice no., customer or mobile" />
        <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={["draft", "issued", "partially_paid", "paid", "cancelled"].map((value) => ({ value, label: humanize(value) }))} />
        <FilterSelect
          label="Source"
          value={values.source}
          onChange={(source) => setFilters({ source })}
          options={(["online_order", "manual_sale", "manual"] as const).map((value) => ({ value, label: sourceLabel(value) }))}
        />
        <DateInput label="Created from" value={values.from} onChange={(from) => setFilters({ from })} />
        <DateInput label="Created to" value={values.to} onChange={(to) => setFilters({ to })} />
        {hasFilters && (
          <AdminButton variant="ghost" onClick={() => setFilters({ q: "", status: "", source: "", from: "", to: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>
      {values.from && values.to && values.from > values.to && (
        <InlineAlert tone="warning" className="mb-4">
          The start date is after the end date, so no invoices will match.
        </InlineAlert>
      )}
      <DataTable
        columns={columns}
        rows={list?.items}
        getRowKey={(invoice) => invoice.id}
        loading={loading}
        error={error}
        onRetry={reload}
        sort={values.sort || "createdAt:desc"}
        onSortChange={(sort) => setFilters({ sort })}
        rowHref={(invoice) => `/admin/invoices/${invoice.id}`}
        empty={
          hasFilters
            ? { title: "No invoices match these filters", description: "Try a different search, status or date range." }
            : { title: "No invoices yet", description: "Invoices are created for paid orders, in-store sales and manual billing." }
        }
        footer={list && <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPageChange={(page) => setFilters({ page: page > 1 ? String(page) : "" }, { resetPage: false })} />}
      />
    </>
  );
}
