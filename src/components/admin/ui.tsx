"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { AlertIcon, ChevronLeftIcon, ChevronRightIcon, LockIcon, SearchIcon } from "@/components/icons";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/primitives";
import { AdminApiError } from "@/lib/admin/client";
import { humanize, toneClasses, toneFor, type Tone } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowUpSortIcon, RefreshIcon, SortIcon } from "./icons";

/* ------------------------------------------------------------------ */
/* Buttons (compact, admin density)                                    */
/* ------------------------------------------------------------------ */

type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";

export function adminButton(variant: AdminButtonVariant = "secondary", size: "sm" | "md" = "md", className?: string) {
  return cn(
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-[0.8125rem] font-medium tracking-[0.02em] transition-colors duration-200 disabled:pointer-events-none disabled:opacity-45",
    size === "md" ? "h-10 px-4" : "h-8 px-3",
    variant === "primary" && "bg-ink text-ivory hover:bg-champagne-deep",
    variant === "secondary" && "border border-line-strong bg-porcelain text-ink hover:border-ink",
    variant === "ghost" && "text-ink-soft hover:bg-cream hover:text-ink",
    variant === "danger" && "border border-danger/40 bg-porcelain text-danger hover:bg-danger hover:text-ivory",
    variant === "link" && "h-auto px-0 text-champagne-deep underline-offset-4 hover:underline",
    className,
  );
}

export function AdminButton({
  variant = "secondary",
  size = "md",
  loading,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: AdminButtonVariant; size?: "sm" | "md"; loading?: boolean }) {
  return (
    <button type={type} className={adminButton(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function AdminLinkButton({ href, variant = "secondary", size = "md", className, children }: { href: string; variant?: AdminButtonVariant; size?: "sm" | "md"; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={adminButton(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Page structure                                                      */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  description,
  back,
  actions,
  meta,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-[0.75rem] uppercase tracking-[0.14em] text-muted hover:text-ink">
            <ChevronLeftIcon size={14} />
            {back.label}
          </Link>
        )}
        <h1 className="font-serif text-[1.875rem] leading-tight text-ink md:text-[2.125rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-[0.875rem] text-muted">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  flush?: boolean;
}) {
  return (
    <section className={cn("border border-line bg-porcelain", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[0.9375rem] font-medium text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-[0.8125rem] text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(!flush && "p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, href, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: Tone }) {
  const content = (
    <>
      <p className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={cn("mt-2 font-serif text-[1.75rem] leading-none tabular-nums", tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-ink")}>{value}</p>
      {hint && <p className="mt-2 text-[0.75rem] text-muted">{hint}</p>}
    </>
  );
  const classes = "block border border-line bg-porcelain px-5 py-4";
  return href ? (
    <Link href={href} className={cn(classes, "transition-colors hover:border-ink")}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  );
}

export function StatusBadge({ status, label, tone, className }: { status: string | null | undefined; label?: string; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.04em]", toneClasses[tone ?? toneFor(status)], className)}>
      {label ?? humanize(status)}
    </span>
  );
}

export function KeyValue({ items, columns = 2 }: { items: { label: string; value: ReactNode; hidden?: boolean }[]; columns?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3")}>
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">{item.label}</dt>
            <dd className="mt-0.5 break-words text-[0.875rem] text-ink">{item.value ?? "—"}</dd>
          </div>
        ))}
    </dl>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (value: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("no-scrollbar -mb-px flex gap-1 overflow-x-auto border-b border-line", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[0.8125rem] transition-colors",
            tab.value === value ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
          )}
        >
          {tab.label}
          {tab.count !== undefined && <span className="bg-cream px-1.5 text-[0.6875rem] tabular-nums text-ink-soft">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function PermissionDenied({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center border border-line bg-porcelain px-6 py-16 text-center">
      <LockIcon size={28} className="text-champagne-deep" />
      <h2 className="mt-4 font-serif text-[1.5rem] text-ink">You don&apos;t have access to this</h2>
      <p className="mt-2 max-w-md text-[0.875rem] text-muted">{message ?? "Ask a Super Admin to grant your role the permission you need."}</p>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: AdminApiError | undefined; onRetry?: () => void }) {
  if (error?.code === "forbidden") return <PermissionDenied message={error.message} />;
  return (
    <div role="alert" className="flex flex-col items-center border border-danger/25 bg-danger/5 px-6 py-12 text-center">
      <AlertIcon size={26} className="text-danger" />
      <p className="mt-3 text-[0.9375rem] text-ink">{error?.message ?? "Something went wrong."}</p>
      {onRetry && (
        <AdminButton className="mt-5" onClick={onRetry}>
          <RefreshIcon size={15} />
          Try again
        </AdminButton>
      )}
    </div>
  );
}

export function LoadingBlock({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyNote({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="font-serif text-[1.25rem] text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-[0.8125rem] text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function InlineAlert({ tone = "danger", children, className }: { tone?: "danger" | "warning" | "success" | "info"; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "border px-4 py-3 text-[0.8125rem]",
        tone === "danger" && "border-danger/30 bg-danger/5 text-danger",
        tone === "warning" && "border-warning/30 bg-warning/5 text-warning",
        tone === "success" && "border-success/30 bg-success/5 text-success",
        tone === "info" && "border-line bg-cream text-ink-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data table                                                          */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Field name sent to the API as `sort=field:asc|desc`. */
  sortKey?: string;
  align?: "left" | "right" | "center";
  className?: string;
  /** Hide on small screens. */
  priority?: "high" | "low";
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  loading,
  error,
  onRetry,
  sort,
  onSortChange,
  rowHref,
  empty,
  footer,
  selectable,
  selected,
  onSelectedChange,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  getRowKey: (row: T) => string;
  loading?: boolean;
  error?: AdminApiError;
  onRetry?: () => void;
  sort?: string;
  onSortChange?: (sort: string) => void;
  rowHref?: (row: T) => string | undefined;
  empty?: { title: string; description?: ReactNode; action?: ReactNode };
  footer?: ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (selected: Set<string>) => void;
}) {
  const router = useRouter();
  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} />;

  const [sortField, sortDirection] = (sort ?? "").split(":");
  const allKeys = rows?.map(getRowKey) ?? [];
  const allSelected = Boolean(selectable && allKeys.length && allKeys.every((key) => selected?.has(key)));

  return (
    <div className="border border-line bg-porcelain">
      {error && rows && (
        <InlineAlert className="border-x-0 border-t-0">
          {error.message} {onRetry && <button type="button" className="underline" onClick={onRetry}>Retry</button>}
        </InlineAlert>
      )}
      <div className="relative overflow-x-auto">
        <table className={cn("w-full border-collapse text-left text-[0.8125rem] transition-opacity", loading && rows && "opacity-55")}>
          <thead>
            <tr className="border-b border-line bg-cream/60">
              {selectable && (
                <th scope="col" className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label="Select all rows"
                    checked={allSelected}
                    onChange={() => onSelectedChange?.(allSelected ? new Set() : new Set(allKeys))}
                    className="h-4 w-4 accent-ink"
                  />
                </th>
              )}
              {columns.map((column) => {
                const active = column.sortKey && sortField === column.sortKey;
                const nextSort = column.sortKey ? `${column.sortKey}:${active && sortDirection === "asc" ? "desc" : "asc"}` : "";
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-muted",
                      column.align === "right" && "text-right",
                      column.align === "center" && "text-center",
                      column.priority === "low" && "hidden lg:table-cell",
                    )}
                  >
                    {column.sortKey && onSortChange ? (
                      <button type="button" onClick={() => onSortChange(nextSort)} className="inline-flex items-center gap-1 uppercase hover:text-ink">
                        {column.header}
                        {active ? sortDirection === "asc" ? <ArrowUpSortIcon size={12} /> : <ArrowDownIcon size={12} /> : <SortIcon size={12} className="opacity-40" />}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {!rows &&
              Array.from({ length: 6 }, (_, index) => (
                <tr key={index} className="border-b border-line last:border-0">
                  {selectable && <td className="px-3 py-3" />}
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-3", column.priority === "low" && "hidden lg:table-cell")}>
                      <Skeleton className="h-4 w-full max-w-[10rem]" />
                    </td>
                  ))}
                </tr>
              ))}
            {rows?.map((row) => {
              const key = getRowKey(row);
              const href = rowHref?.(row);
              return (
                <tr
                  key={key}
                  onClick={
                    href
                      ? (event) => {
                          const target = event.target as HTMLElement;
                          if (target.closest("a,button,input,select,textarea,label")) return;
                          if (event.metaKey || event.ctrlKey) window.open(href, "_blank");
                          else router.push(href);
                        }
                      : undefined
                  }
                  className={cn("border-b border-line align-top last:border-0", href && "cursor-pointer hover:bg-cream/50", selected?.has(key) && "bg-champagne-mist/40")}
                >
                  {selectable && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={selected?.has(key) ?? false}
                        onChange={() => {
                          const next = new Set(selected);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          onSelectedChange?.(next);
                        }}
                        className="h-4 w-4 accent-ink"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-ink",
                        column.align === "right" && "text-right tabular-nums",
                        column.align === "center" && "text-center",
                        column.priority === "low" && "hidden lg:table-cell",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows && rows.length === 0 && <EmptyNote title={empty?.title ?? "Nothing here yet"} description={empty?.description} action={empty?.action} />}
      </div>
      {footer}
    </div>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: { page: number; totalPages: number; total: number; pageSize: number; onPageChange: (page: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[0.8125rem] text-muted">
      <p className="tabular-nums">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <AdminButton size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
          <ChevronLeftIcon size={15} />
        </AdminButton>
        <span className="px-2 tabular-nums text-ink">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <AdminButton size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
          <ChevronRightIcon size={15} />
        </AdminButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-wrap items-end gap-3", className)}>{children}</div>;
}

export function SearchBox({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Reflect external changes (e.g. clearing filters) without an effect.
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  return (
    <form
      role="search"
      className={cn("relative min-w-[14rem] flex-1 sm:max-w-sm", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onChange(draft.trim());
      }}
    >
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        id={id}
        type="search"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (draft.trim() !== value) onChange(draft.trim());
        }}
        className="h-10 w-full border border-line bg-porcelain pl-9 pr-3 text-[0.875rem] text-ink outline-none placeholder:text-subtle focus:border-ink"
      />
    </form>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className="mb-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 min-w-[9rem] border border-line bg-porcelain px-2.5 text-[0.8125rem] text-ink outline-none focus:border-ink">
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
        {label}
      </label>
      <input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-10 border border-line bg-porcelain px-2.5 text-[0.8125rem] text-ink outline-none focus:border-ink" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

export function AdminDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const titleId = useId();
  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} className={cn(size === "lg" && "max-w-3xl")}>
      <DialogHeader title={title} titleId={titleId} subtitle={description} onClose={onClose} />
      <div className="px-6 py-5 md:px-8">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4 md:px-8">{footer}</div>}
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "primary",
  pending,
  error,
  children,
  confirmDisabled,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  error?: string | null;
  children?: ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </AdminButton>
          <AdminButton variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={pending} disabled={confirmDisabled}>
            {confirmLabel}
          </AdminButton>
        </>
      }
    >
      {description && <p className="text-[0.875rem] text-ink-soft">{description}</p>}
      {children && <div className={cn(description && "mt-4")}>{children}</div>}
      {error && <InlineAlert className="mt-4">{error}</InlineAlert>}
    </AdminDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

export function BarChart({ points, format = (value) => String(value), height = 180, label }: { points: { label: string; value: number }[]; format?: (value: number) => string; height?: number; label: string }) {
  const max = Math.max(...points.map((point) => point.value), 0);
  if (!points.length || max === 0) return <p className="py-10 text-center text-[0.8125rem] text-muted">No data for this period.</p>;
  const labelEvery = Math.ceil(points.length / 10);
  return (
    <figure aria-label={label}>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {points.map((point) => (
          <div key={point.label} className="group relative flex h-full flex-1 items-end" title={`${point.label}: ${format(point.value)}`}>
            <div className="w-full bg-champagne/70 transition-colors group-hover:bg-champagne-deep" style={{ height: `${Math.max((point.value / max) * 100, point.value > 0 ? 2 : 0)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[3px] text-[0.625rem] text-muted">
        {points.map((point, index) => (
          <span key={point.label} className="flex-1 truncate text-center">
            {index % labelEvery === 0 ? (/^\d{4}-\d{2}-\d{2}$/.test(point.label) ? point.label.slice(5) : point.label) : ""}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {points.map((point) => `${point.label}: ${format(point.value)}`).join(", ")}
      </figcaption>
    </figure>
  );
}
