"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import type { BillingSummary } from "@/components/admin/billing/types";
import { AdminButton, AdminLinkButton, DateInput, ErrorState, FilterBar, InlineAlert, LoadingBlock, PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { formatDate, formatDateTime, money, number, todayIst } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const rowClass = "flex items-center justify-between gap-3 px-5 py-2.5 text-[0.8125rem] hover:bg-cream/50";

export default function BillingDashboardPage() {
  const { can } = useAdmin();
  const [defaults] = useState(() => {
    const today = todayIst();
    return { from: `${today.slice(0, 8)}01`, to: today };
  });
  const { values, setFilters } = useUrlFilters(["from", "to"] as const, defaults);
  const invalidRange = Boolean(values.from && values.to && values.from > values.to);
  const { data, latest, loading, error, reload } = useAdminResource<BillingSummary>("/billing/summary", { from: values.from, to: values.to });
  const summary = data ?? latest;
  const isDefault = values.from === defaults.from && values.to === defaults.to;

  return (
    <>
      <PageHeader
        title="Billing"
        description="Invoices issued, money collected and what is still outstanding."
        actions={
          <>
            <AdminLinkButton href="/admin/invoices">All invoices</AdminLinkButton>
            {can("billing:create") && (
              <AdminLinkButton href="/admin/billing/new" variant="primary">
                <PlusIcon size={15} />
                New invoice
              </AdminLinkButton>
            )}
          </>
        }
      />

      <FilterBar>
        <DateInput label="From" value={values.from} onChange={(from) => setFilters({ from })} />
        <DateInput label="To" value={values.to} onChange={(to) => setFilters({ to })} />
        {!isDefault && (
          <AdminButton variant="ghost" onClick={() => setFilters({ from: defaults.from, to: defaults.to })}>
            This month
          </AdminButton>
        )}
        {summary && (
          <p className="pb-2.5 text-[0.75rem] text-muted">
            Showing {formatDate(values.from || summary.period.from)} to {formatDate(values.to || summary.period.to)}
          </p>
        )}
      </FilterBar>
      {invalidRange && (
        <InlineAlert tone="warning" className="mb-4">
          The start date is after the end date, so the period figures will be empty.
        </InlineAlert>
      )}

      {error && !summary && <ErrorState error={error} onRetry={reload} />}
      {!summary && !error && <LoadingBlock rows={6} />}
      {summary && (
        <div className={loading ? "space-y-6 opacity-60 transition-opacity" : "space-y-6"}>
          {error && (
            <InlineAlert>
              {error.message}{" "}
              <button type="button" className="underline" onClick={reload}>
                Retry
              </button>
            </InlineAlert>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Billed" value={money(summary.billedTotal)} hint="Issued in this period" />
            <StatCard label="Collected" value={money(summary.collected)} hint="Payments received in this period" />
            <StatCard label="Outstanding" value={money(summary.outstanding)} hint="All open invoices" tone={summary.outstanding > 0 ? "warning" : "neutral"} />
            <StatCard label="Overdue" value={number(summary.overdueInvoices)} hint="Open invoices past their due date" tone={summary.overdueInvoices > 0 ? "danger" : "neutral"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Invoices issued" value={number(summary.counts.issued)} hint="In this period" />
            <StatCard label="Paid" value={number(summary.counts.paid)} hint="Issued in period, fully paid" />
            <StatCard label="Partially paid" value={number(summary.counts.partiallyPaid)} hint="Issued in period" tone={summary.counts.partiallyPaid > 0 ? "warning" : "neutral"} />
            <StatCard label="Unpaid" value={number(summary.counts.unpaid)} hint="Issued in period, nothing paid" tone={summary.counts.unpaid > 0 ? "warning" : "neutral"} />
            <StatCard label="Drafts" value={number(summary.counts.drafts)} hint="All drafts waiting to be issued" href="/admin/invoices?status=draft" />
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Panel title="Paid orders without an invoice" description="Paid online orders that have no invoice, for example after an interrupted finalisation." flush>
              {summary.exceptions.paidOrdersWithoutInvoice.length === 0 ? (
                <p className="px-5 py-6 text-[0.8125rem] text-muted">No exceptions. Every paid order has an invoice.</p>
              ) : (
                <>
                  <ul className="divide-y divide-line">
                    {summary.exceptions.paidOrdersWithoutInvoice.map((order) => (
                      <li key={order.id}>
                        <Link href={`/admin/orders/${order.id}`} className={rowClass}>
                          <span className="min-w-0">
                            <span className="block font-medium">{order.orderNumber}</span>
                            <span className="block text-muted">Paid {formatDateTime(order.paidAt)}</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <StatusBadge status="missing_invoice" label="No invoice" tone="danger" />
                            <span className="tabular-nums">{money(order.grandTotal)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {summary.exceptions.paidOrdersWithoutInvoice.length >= 20 && <p className="border-t border-line px-5 py-2.5 text-[0.75rem] text-muted">Showing the first 20.</p>}
                </>
              )}
            </Panel>

            <Panel
              title="Recent invoices"
              actions={
                <Link href="/admin/invoices" className="text-[0.75rem] text-champagne-deep hover:underline">
                  View all
                </Link>
              }
              flush
            >
              {summary.recent.length === 0 ? (
                <p className="px-5 py-6 text-[0.8125rem] text-muted">No invoices yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {summary.recent.map((invoice) => (
                    <li key={invoice.id}>
                      <Link href={`/admin/invoices/${invoice.id}`} className={rowClass}>
                        <span className="min-w-0">
                          <span className="block font-medium">{invoice.invoiceNumber ?? "Draft"}</span>
                          <span className="block truncate text-muted">
                            {invoice.customer.name} · {formatDate(invoice.issuedAt ?? invoice.createdAt)}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <StatusBadge status={invoice.status} />
                          <span className="tabular-nums">{money(invoice.grandTotal)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
