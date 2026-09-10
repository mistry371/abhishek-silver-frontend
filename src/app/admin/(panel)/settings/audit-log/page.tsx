"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CheckboxInput } from "@/components/admin/fields";
import { AuditDetailDialog } from "@/components/admin/settings/AuditDetailDialog";
import { AUDIT_MODULES, type AuditLogEntry } from "@/components/admin/settings/types";
import { AdminButton, DateInput, EmptyNote, ErrorState, FilterBar, FilterSelect, InlineAlert, LoadingBlock, PageHeader, Pagination, PermissionDenied, SearchBox, StatusBadge } from "@/components/admin/ui";
import type { Paginated } from "@/lib/admin/client";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

const FILTER_KEYS = ["q", "module", "action", "sensitive", "from", "to", "page"] as const;
const MODULE_OPTIONS = AUDIT_MODULES.map((module) => ({ value: module, label: humanize(module) }));
const PAGE_SIZE = 25;

export default function AuditLogPage() {
  const { can } = useAdmin();
  const allowed = can("audit:view");
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const { data, latest, loading, error, reload } = useAdminResource<Paginated<AuditLogEntry>>(allowed ? "/audit-logs" : null, { ...query, pageSize: PAGE_SIZE });
  const [openEntry, setOpenEntry] = useState<AuditLogEntry | null>(null);

  const header = <PageHeader title="Audit log" description="A permanent record of who changed what, and when. Click an entry to see the details." back={{ href: "/admin/settings", label: "Settings" }} />;
  if (!allowed) {
    return (
      <>
        {header}
        <PermissionDenied message="Viewing the audit log needs the “View the audit log” permission." />
      </>
    );
  }

  const page = data ?? latest;
  const rows = page?.items;
  const filtered = Boolean(values.q || values.module || values.action || values.sensitive || values.from || values.to);
  const validation = error?.status === 422 ? Object.values(error.fieldErrors ?? {}).join(" ") || error.message : null;

  return (
    <>
      {header}
      <FilterBar>
        <SearchBox value={values.q} onChange={(value) => setFilters({ q: value })} placeholder="Search person, record or action" />
        <FilterSelect label="Module" value={values.module} onChange={(value) => setFilters({ module: value })} options={MODULE_OPTIONS} allLabel="All modules" />
        <SearchBox value={values.action} onChange={(value) => setFilters({ action: value })} placeholder="Exact action code, e.g. user.update" className="sm:max-w-[16rem]" />
        <DateInput label="From" value={values.from} onChange={(value) => setFilters({ from: value })} />
        <DateInput label="To" value={values.to} onChange={(value) => setFilters({ to: value })} />
        <CheckboxInput className="h-10 items-center" label="Sensitive only" checked={values.sensitive === "true"} onChange={(event) => setFilters({ sensitive: event.target.checked ? "true" : "" })} />
        {filtered && (
          <AdminButton variant="ghost" onClick={() => setFilters({ q: "", module: "", action: "", sensitive: "", from: "", to: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>

      {validation ? (
        <InlineAlert>{validation}</InlineAlert>
      ) : error && !rows ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !rows ? (
        <LoadingBlock rows={8} />
      ) : (
        <div className="border border-line bg-porcelain">
          {error && (
            <InlineAlert className="border-x-0 border-t-0">
              {error.message}{" "}
              <button type="button" className="underline" onClick={reload}>
                Retry
              </button>
            </InlineAlert>
          )}
          <div className="overflow-x-auto">
            <table className={cn("w-full border-collapse text-left text-[0.8125rem] transition-opacity", loading && "opacity-55")}>
              <thead>
                <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5 font-medium">
                    Time
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Actor
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                    Module
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Record
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id} onClick={() => setOpenEntry(entry)} className="cursor-pointer border-b border-line align-top last:border-0 hover:bg-cream/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenEntry(entry);
                        }}
                        className="text-left text-ink underline-offset-4 hover:underline"
                        aria-label={`View details of ${humanize(entry.action)} on ${formatDateTime(entry.createdAt)}`}
                      >
                        {formatDateTime(entry.createdAt)}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink">{entry.actorName}</p>
                      {entry.actorRole && <p className="text-[0.75rem] text-muted">{entry.actorRole}</p>}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft md:table-cell">{humanize(entry.module)}</td>
                    <td className="px-4 py-3">
                      <p className="text-ink">{humanize(entry.action)}</p>
                      <p className="flex flex-wrap items-center gap-1.5">
                        <code className="text-[0.6875rem] text-muted">{entry.action}</code>
                        {entry.sensitive && <StatusBadge status="sensitive" label="Sensitive" tone="warning" />}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[16rem] truncate text-ink">{entry.entityLabel ?? "—"}</p>
                      <p className="text-[0.75rem] text-muted">{humanize(entry.entityType)}</p>
                    </td>
                    <td className="hidden max-w-[18rem] px-4 py-3 text-ink-soft lg:table-cell">
                      <p className="line-clamp-2">{entry.reason ?? "—"}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <EmptyNote title={filtered ? "No entries match these filters" : "No activity recorded yet"} description={filtered ? "Try removing a filter or widening the dates." : undefined} />}
          </div>
          {page && page.total > 0 && <Pagination page={page.page} totalPages={page.totalPages} total={page.total} pageSize={page.pageSize} onPageChange={(next) => setFilters({ page: String(next) }, { resetPage: false })} />}
        </div>
      )}

      {openEntry && <AuditDetailDialog entry={openEntry} onClose={() => setOpenEntry(null)} />}
    </>
  );
}
