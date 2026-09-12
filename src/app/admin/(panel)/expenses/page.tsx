"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { useExpenseCategories } from "@/components/admin/expenses/hooks";
import {
  categoryLabel,
  categoryOptions,
  methodLabel,
  monthStartOf,
  paymentMethodOptions,
  statusOptions,
  type ExpenseCategory,
  type ExpenseListItem,
  type ExpenseSummary,
} from "@/components/admin/expenses/types";
import { HistoryIcon, LayersIcon } from "@/components/admin/icons";
import { ImportAction } from "@/components/admin/ImportDialog";
import {
  AdminButton,
  AdminLinkButton,
  DataTable,
  DateInput,
  ErrorState,
  FilterBar,
  FilterSelect,
  InlineAlert,
  LoadingBlock,
  PageHeader,
  Pagination,
  Panel,
  SearchBox,
  StatCard,
  StatusBadge,
  type Column,
} from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { formatDate, money, number, todayIst } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

const FILTER_KEYS = ["periodFrom", "periodTo", "status", "categoryId", "paymentMethod", "from", "to", "hasAttachment", "recurring", "q", "sort", "page"] as const;
const CLEARED_TABLE_FILTERS = { status: "", categoryId: "", paymentMethod: "", from: "", to: "", hasAttachment: "", recurring: "", q: "" };
const PAGE_SIZE = 25;
const DEFAULT_SORT = "expenseDate:desc";

const sortOptions = [
  { value: "expenseDate:asc", label: "Expense date (oldest)" },
  { value: "totalAmount:desc", label: "Total (highest)" },
  { value: "totalAmount:asc", label: "Total (lowest)" },
  { value: "createdAt:desc", label: "Recently created" },
  { value: "createdAt:asc", label: "Created (oldest)" },
];

const rowClass = "flex items-center justify-between gap-3 px-5 py-2.5 text-[0.8125rem] hover:bg-cream/50";
const plural = (count: number, word: string) => `${number(count)} ${word}${count === 1 ? "" : "s"}`;

export default function ExpensesPage() {
  const { can } = useAdmin();
  const [today] = useState(() => todayIst());
  const defaults = useMemo(() => ({ periodFrom: monthStartOf(today), periodTo: today, page: "1" }), [today]);
  const { values, setFilters } = useUrlFilters(FILTER_KEYS, defaults);

  const summary = useAdminResource<ExpenseSummary>("/expenses/summary", { from: values.periodFrom, to: values.periodTo });
  const pendingTotal = useAdminResource<Paginated<ExpenseListItem>>("/expenses", { status: "submitted", pageSize: 1 });
  const categories = useExpenseCategories();
  const list = useAdminResource<Paginated<ExpenseListItem>>("/expenses", {
    status: values.status,
    categoryId: values.categoryId,
    paymentMethod: values.paymentMethod,
    from: values.from,
    to: values.to,
    hasAttachment: values.hasAttachment,
    recurring: values.recurring,
    q: values.q,
    sort: values.sort,
    page: values.page,
    pageSize: PAGE_SIZE,
  });

  const categoryById = new Map((categories.latest ?? []).map((category) => [category.id, category]));
  const hasTableFilters = (Object.keys(CLEARED_TABLE_FILTERS) as (keyof typeof CLEARED_TABLE_FILTERS)[]).some((key) => values[key]);
  const isDefaultPeriod = values.periodFrom === defaults.periodFrom && values.periodTo === defaults.periodTo;

  const header = (
    <PageHeader
      title="Expenses"
      description="Business expenses from draft to approval and payment."
      actions={
        <>
          <AdminLinkButton href="/admin/expenses/categories">
            <LayersIcon size={15} />
            Categories
          </AdminLinkButton>
          <AdminLinkButton href="/admin/expenses/recurring">
            <HistoryIcon size={15} />
            Recurring
          </AdminLinkButton>
          <ImportAction
            entity="expenses"
            onImported={() => {
              list.reload();
              summary.reload();
              pendingTotal.reload();
            }}
          />
          {can("expenses:create") && (
            <AdminLinkButton href="/admin/expenses/new" variant="primary">
              <PlusIcon size={15} />
              New expense
            </AdminLinkButton>
          )}
        </>
      }
    />
  );

  if (summary.error?.status === 403 || list.error?.status === 403) {
    return (
      <>
        {header}
        <ErrorState error={summary.error ?? list.error} />
      </>
    );
  }

  const columns: Column<ExpenseListItem>[] = [
    {
      key: "number",
      header: "Number",
      cell: (row) => (
        <div>
          <Link href={`/admin/expenses/${row.id}`} className="whitespace-nowrap font-medium hover:underline">
            {row.expenseNumber}
          </Link>
          {row.recurring && <span className="mt-0.5 block text-[0.6875rem] text-muted">Recurring</span>}
        </div>
      ),
    },
    { key: "date", header: "Date", sortKey: "expenseDate", cell: (row) => <span className="whitespace-nowrap">{formatDate(row.expenseDate)}</span> },
    {
      key: "category",
      header: "Category",
      priority: "low",
      cell: (row) => {
        const category = categoryById.get(row.categoryId);
        return category ? categoryLabel(category) : row.categoryName;
      },
    },
    {
      key: "payee",
      header: "Payee / vendor",
      cell: (row) => (
        <div className="min-w-[8rem]">
          <span className="block">{row.payee}</span>
          {row.vendorName && <span className="block text-[0.75rem] text-muted">Vendor: {row.vendorName}</span>}
        </div>
      ),
    },
    { key: "description", header: "Description", priority: "low", cell: (row) => <span className="line-clamp-2 max-w-[16rem]">{row.description}</span> },
    { key: "method", header: "Method", priority: "low", cell: (row) => <span className="whitespace-nowrap">{methodLabel(row.paymentMethod)}</span> },
    { key: "amount", header: "Amount", align: "right", priority: "low", cell: (row) => money(row.amount) },
    { key: "tax", header: "Tax", align: "right", priority: "low", cell: (row) => money(row.taxAmount) },
    { key: "total", header: "Total", align: "right", sortKey: "totalAmount", cell: (row) => <span className="font-medium">{money(row.totalAmount)}</span> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: "attachments",
      header: "Files",
      align: "center",
      cell: (row) => (row.attachmentCount ? number(row.attachmentCount) : <span className="text-muted" title="No attachment">—</span>),
    },
  ];

  return (
    <>
      {header}

      <InlineAlert tone="info" className="mb-6">
        Expense Management is an added module. Tax fields, approvals and payment sources follow <strong className="font-medium">Settings → Expenses</strong>; no other tax or
        accounting rules are applied.
      </InlineAlert>

      <section aria-labelledby="expense-summary-heading" className="mb-10 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="expense-summary-heading" className="text-[0.9375rem] font-medium text-ink">
              Summary
            </h2>
            <p className="text-[0.8125rem] text-muted">Totals count approved and paid expenses only.</p>
          </div>
          <FilterBar className="mb-0">
            <DateInput label="Period from" value={values.periodFrom} onChange={(periodFrom) => setFilters({ periodFrom }, { resetPage: false })} />
            <DateInput label="Period to" value={values.periodTo} onChange={(periodTo) => setFilters({ periodTo }, { resetPage: false })} />
            <AdminButton variant="ghost" disabled={isDefaultPeriod} onClick={() => setFilters({ periodFrom: "", periodTo: "" }, { resetPage: false })}>
              This month
            </AdminButton>
          </FilterBar>
        </div>
        {values.periodFrom > values.periodTo && <InlineAlert tone="warning">The period start is after the period end, so the selected period is empty.</InlineAlert>}
        {summary.error && !summary.latest ? (
          <ErrorState error={summary.error} onRetry={summary.reload} />
        ) : !summary.latest ? (
          <LoadingBlock rows={4} />
        ) : (
          <SummaryView
            summary={summary.latest}
            loading={summary.loading}
            today={today}
            pendingCount={pendingTotal.latest?.total ?? summary.latest.pendingApprovals.count}
            categoryById={categoryById}
            onShowCategory={(categoryId) => setFilters({ categoryId, from: values.periodFrom, to: values.periodTo })}
            onShowPending={() => setFilters({ ...CLEARED_TABLE_FILTERS, status: "submitted" })}
          />
        )}
      </section>

      <section aria-labelledby="expense-directory-heading" id="expense-directory">
        <h2 id="expense-directory-heading" className="mb-3 text-[0.9375rem] font-medium text-ink">
          All expenses
        </h2>
        <FilterBar>
          <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Search number, payee, reference" />
          <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={statusOptions} />
          <FilterSelect label="Category" value={values.categoryId} onChange={(categoryId) => setFilters({ categoryId })} options={categoryOptions(categories.latest, { activeOnly: false })} />
          <FilterSelect label="Method" value={values.paymentMethod} onChange={(paymentMethod) => setFilters({ paymentMethod })} options={paymentMethodOptions} />
          <DateInput label="From" value={values.from} onChange={(from) => setFilters({ from })} />
          <DateInput label="To" value={values.to} onChange={(to) => setFilters({ to })} />
          <FilterSelect
            label="Attachment"
            value={values.hasAttachment}
            onChange={(hasAttachment) => setFilters({ hasAttachment })}
            allLabel="Any"
            options={[
              { value: "true", label: "With attachment" },
              { value: "false", label: "Missing attachment" },
            ]}
          />
          <FilterSelect
            label="Type"
            value={values.recurring}
            onChange={(recurring) => setFilters({ recurring })}
            options={[
              { value: "true", label: "From recurring" },
              { value: "false", label: "One-time" },
            ]}
          />
          <FilterSelect label="Sort" value={values.sort} onChange={(sort) => setFilters({ sort })} allLabel="Expense date (newest)" options={sortOptions} />
          {hasTableFilters && (
            <AdminButton variant="ghost" onClick={() => setFilters(CLEARED_TABLE_FILTERS)}>
              Clear filters
            </AdminButton>
          )}
        </FilterBar>
        <DataTable
          columns={columns}
          rows={list.latest?.items}
          getRowKey={(row) => row.id}
          loading={list.loading}
          error={list.error}
          onRetry={list.reload}
          sort={values.sort || DEFAULT_SORT}
          onSortChange={(sort) => setFilters({ sort: sort === DEFAULT_SORT ? "" : sort })}
          rowHref={(row) => `/admin/expenses/${row.id}`}
          empty={
            hasTableFilters
              ? { title: "No matching expenses", description: "Try changing or clearing the filters." }
              : {
                  title: "No expenses yet",
                  description: "Record an expense as a draft, attach the receipt and submit it.",
                  action: can("expenses:create") ? (
                    <AdminLinkButton href="/admin/expenses/new" variant="primary">
                      New expense
                    </AdminLinkButton>
                  ) : undefined,
                }
          }
          footer={
            list.latest && list.latest.total > 0 ? (
              <Pagination
                page={list.latest.page}
                totalPages={list.latest.totalPages}
                total={list.latest.total}
                pageSize={list.latest.pageSize}
                onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })}
              />
            ) : undefined
          }
        />
      </section>
    </>
  );
}

function SummaryView({
  summary,
  loading,
  today,
  pendingCount,
  categoryById,
  onShowCategory,
  onShowPending,
}: {
  summary: ExpenseSummary;
  loading: boolean;
  today: string;
  pendingCount: number;
  categoryById: Map<string, ExpenseCategory>;
  onShowCategory: (categoryId: string) => void;
  onShowPending: () => void;
}) {
  const maxCategory = Math.max(...summary.topCategories.map((item) => item.total), 0);
  const { period, recurring, pendingApprovals } = summary;

  return (
    <div className={cn("space-y-6 transition-opacity", loading && "opacity-60")} aria-busy={loading || undefined}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today" value={money(summary.today)} hint={formatDate(today)} />
        <StatCard label="This month" value={money(summary.thisMonth)} hint="Month to date" />
        <StatCard label="Selected period" value={money(period.total)} hint={`${plural(period.count, "expense")} · ${formatDate(period.from)} – ${formatDate(period.to)}`} />
        <StatCard
          label="Awaiting approval"
          value={number(pendingCount)}
          tone={pendingCount ? "warning" : "neutral"}
          href="/admin/expenses?status=submitted#expense-directory"
          hint="Submitted, not yet decided"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Top categories" description="Selected period">
          {summary.topCategories.length === 0 ? (
            <p className="text-[0.8125rem] text-muted">No approved or paid expenses in this period.</p>
          ) : (
            <ul className="space-y-3.5">
              {summary.topCategories.map((item) => {
                const category = categoryById.get(item.categoryId);
                return (
                  <li key={item.categoryId}>
                    <div className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                      <button type="button" onClick={() => onShowCategory(item.categoryId)} className="min-w-0 truncate text-left text-ink hover:text-champagne-deep hover:underline">
                        {category ? categoryLabel(category) : item.name}
                      </button>
                      <span className="shrink-0 tabular-nums text-ink">{money(item.total)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-cream" aria-hidden="true">
                      <div className="h-full bg-champagne/70" style={{ width: `${maxCategory ? Math.max((item.total / maxCategory) * 100, 2) : 0}%` }} />
                    </div>
                    <p className="mt-1 text-[0.75rem] text-muted">{plural(item.count, "expense")}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title="Pending approvals"
          description={pendingCount > pendingApprovals.items.length ? `Oldest ${pendingApprovals.items.length} of ${number(pendingCount)}` : undefined}
          actions={
            <button type="button" onClick={onShowPending} className="text-[0.75rem] text-champagne-deep hover:underline">
              View all
            </button>
          }
          flush
        >
          {pendingApprovals.items.length === 0 ? (
            <p className="px-5 py-6 text-[0.8125rem] text-muted">Nothing is waiting for approval.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pendingApprovals.items.map((item) => (
                <li key={item.id}>
                  <Link href={`/admin/expenses/${item.id}`} className={rowClass}>
                    <span className="min-w-0">
                      <span className="block font-medium">{item.expenseNumber}</span>
                      <span className="block truncate text-muted">
                        {item.payee} · {item.createdByName} · {formatDate(item.expenseDate)}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">{money(item.totalAmount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Recurring expenses"
          actions={
            <Link href="/admin/expenses/recurring" className="text-[0.75rem] text-champagne-deep hover:underline">
              Manage
            </Link>
          }
          flush
        >
          <div className="grid grid-cols-2 gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Active templates</p>
              <p className="mt-1 font-serif text-[1.375rem] tabular-nums text-ink">{number(recurring.active)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Monthly equivalent</p>
              <p className="mt-1 font-serif text-[1.375rem] tabular-nums text-ink">{money(recurring.monthlyEquivalent)}</p>
            </div>
          </div>
          <p className="px-5 pt-3 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Due within 30 days</p>
          {recurring.dueWithin30Days.length === 0 ? (
            <p className="px-5 pb-4 pt-2 text-[0.8125rem] text-muted">Nothing due in the next 30 days.</p>
          ) : (
            <ul className="mt-1 divide-y divide-line">
              {recurring.dueWithin30Days.map((item) => (
                <li key={item.id}>
                  <Link href="/admin/expenses/recurring" className={rowClass}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.title}</span>
                      <span className="block text-muted">{formatDate(item.nextDueDate)}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {item.nextDueDate < today && <StatusBadge status="overdue" label="Overdue" tone="danger" />}
                      {item.nextDueDate === today && <StatusBadge status="due" label="Due today" tone="warning" />}
                      <span className="tabular-nums">{money(item.amount)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t border-line px-5 py-3 text-[0.75rem] text-muted">Never posted automatically — create drafts from the recurring page when a bill is due.</p>
        </Panel>
      </div>
    </div>
  );
}
