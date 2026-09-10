"use client";

import Link from "next/link";
import { AdminLinkButton, DataTable, FilterBar, FilterSelect, InlineAlert, Pagination, StatusBadge, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/lib/admin/client";
import { formatDateTime, humanize, metalLabels, money, number as formatNumber, percent, purityLabels } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";
import { discountLabel, makingLabel, targetSummary, type PricingOverview, type RunningOfferDiscount } from "./shared";

/* ------------------------------------------------------------------ */
/* Price history                                                       */
/* ------------------------------------------------------------------ */

type HistoryKind = "metal_rate" | "gst" | "making_default" | "charge_rate";

interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  label: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string;
  affectedProducts: number;
  actorAdminId: string | null;
  actorName: string;
  createdAt: string;
}

const kindLabels: Record<HistoryKind, string> = {
  metal_rate: "Metal rates",
  gst: "GST",
  making_default: "Making defaults",
  charge_rate: "Stone & other charges",
};

type Line = { label: string; before?: string; after: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const records = (value: unknown) => (Array.isArray(value) ? value.filter(isRecord) : []);
const numberOrNull = (value: unknown) => (value === null || value === undefined || value === "" ? null : Number(value));

const IGNORED_FIELDS = new Set(["id", "createdAt", "updatedAt"]);
const fieldLabels: Record<string, string> = { name: "Name", kind: "Kind", unit: "Unit", rate: "Rate", active: "Status" };

function formatField(key: string, value: unknown) {
  if (value === null || value === undefined) return "—";
  if (key === "rate" || key === "ratePerGram") return money(Number(value));
  if (key === "gstRate") return percent(Number(value));
  if (key === "active") return value ? "Active" : "Inactive";
  if (typeof value === "string") return key === "kind" || key === "unit" || key === "type" ? humanize(value) : value;
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return JSON.stringify(value);
}

function describe(entry: HistoryEntry, categoryNames: Record<string, string>): Line[] {
  const before = isRecord(entry.before) ? entry.before : null;
  const after = isRecord(entry.after) ? entry.after : null;
  if (!after) return [];

  if (entry.kind === "metal_rate") {
    const previous = records(before?.rates);
    return records(after.rates).map((rate) => {
      const old = previous.find((item) => item.metal === rate.metal && item.purity === rate.purity);
      const oldRate = numberOrNull(old?.ratePerGram);
      return {
        label: `${metalLabels[String(rate.metal)] ?? String(rate.metal)} ${purityLabels[String(rate.purity)] ?? String(rate.purity)}`,
        before: before ? (oldRate === null ? "Not set" : money(oldRate)) : undefined,
        after: money(Number(rate.ratePerGram)),
      };
    });
  }

  if (entry.kind === "gst") {
    const old = numberOrNull(before?.gstRate);
    return [{ label: "GST", before: before ? (old === null ? "Not set" : percent(old)) : undefined, after: percent(Number(after.gstRate)) }];
  }

  if (entry.kind === "making_default") {
    const previous = records(before?.items);
    return records(after.items).map((item) => {
      const old = previous.find((candidate) => candidate.categoryId === item.categoryId);
      return {
        label: categoryNames[String(item.categoryId)] ?? "Removed category",
        before: old ? makingLabel(String(old.type), numberOrNull(old.value)) : "Not set",
        after: makingLabel(String(item.type), numberOrNull(item.value)),
      };
    });
  }

  return Object.keys(after)
    .filter((key) => !IGNORED_FIELDS.has(key))
    .map((key) => ({ label: fieldLabels[key] ?? humanize(key), before: before ? formatField(key, before[key]) : undefined, after: formatField(key, after[key]) }));
}

export function HistoryTab({ categoryNames }: { categoryNames: Record<string, string> }) {
  const { values, setFilters } = useUrlFilters(["kind", "page"] as const);
  const page = Math.max(1, Number(values.page) || 1);
  const { latest, loading, error, reload } = useAdminResource<Paginated<HistoryEntry>>("/pricing/history", { kind: values.kind || undefined, page, pageSize: 20 });

  const columns: Column<HistoryEntry>[] = [
    { key: "createdAt", header: "When", cell: (row) => <span className="whitespace-nowrap text-ink-soft">{formatDateTime(row.createdAt)}</span> },
    {
      key: "change",
      header: "Change",
      cell: (row) => (
        <div className="min-w-[9rem]">
          <p className="font-medium">{row.label}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <StatusBadge status={row.kind} label={kindLabels[row.kind] ?? humanize(row.kind)} tone="accent" />
            {row.kind === "charge_rate" && !row.before && <StatusBadge status="new" label="Created" tone="info" />}
          </div>
        </div>
      ),
    },
    {
      key: "details",
      header: "Before → after",
      cell: (row) => {
        const lines = describe(row, categoryNames);
        if (!lines.length) return <span className="text-muted">—</span>;
        return (
          <ul className="min-w-[14rem] space-y-0.5">
            {lines.map((line, index) => (
              <li key={`${line.label}-${index}`} className="tabular-nums">
                <span className="text-muted">{line.label}: </span>
                {line.before !== undefined && (
                  <>
                    <span className="text-ink-soft">{line.before}</span>
                    <span aria-hidden="true" className="px-1 text-muted">
                      →
                    </span>
                    <span className="sr-only"> to </span>
                  </>
                )}
                <span className="font-medium text-ink">{line.after}</span>
              </li>
            ))}
          </ul>
        );
      },
    },
    { key: "reason", header: "Reason", cell: (row) => <p className="min-w-[10rem] max-w-xs whitespace-pre-line break-words text-ink-soft">{row.reason}</p> },
    {
      key: "affected",
      header: "Products",
      align: "right",
      priority: "low",
      cell: (row) => (row.kind === "metal_rate" || row.kind === "gst" ? formatNumber(row.affectedProducts) : <span className="text-muted">—</span>),
    },
    { key: "actor", header: "By", cell: (row) => row.actorName },
  ];

  return (
    <div>
      <FilterBar>
        <FilterSelect
          label="Change type"
          value={values.kind}
          onChange={(kind) => setFilters({ kind })}
          options={(Object.keys(kindLabels) as HistoryKind[]).map((kind) => ({ value: kind, label: kindLabels[kind] }))}
          allLabel="All changes"
        />
      </FilterBar>
      <DataTable
        columns={columns}
        rows={latest?.items}
        getRowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={{ title: "No pricing changes yet", description: values.kind ? "No changes of this type have been recorded." : "Rate, GST and charge updates will appear here with their reasons." }}
        footer={latest && latest.total > 0 ? <Pagination page={latest.page} totalPages={latest.totalPages} total={latest.total} pageSize={latest.pageSize} onPageChange={(next) => setFilters({ page: String(next) })} /> : undefined}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Running offer discounts                                             */
/* ------------------------------------------------------------------ */

export function RunningOffersTab({ overview }: { overview: PricingOverview }) {
  const columns: Column<RunningOfferDiscount>[] = [
    {
      key: "title",
      header: "Offer",
      cell: (row) => (
        <Link href="/admin/offers" className="font-medium hover:text-champagne-deep hover:underline">
          {row.title}
        </Link>
      ),
    },
    { key: "discount", header: "Price discount", cell: (row) => discountLabel(row.discount) },
    { key: "target", header: "Applies to", cell: (row) => targetSummary(row.target) },
    { key: "endsAt", header: "Ends", cell: (row) => <span className="whitespace-nowrap text-ink-soft">{row.endsAt ? formatDateTime(row.endsAt) : "No end date"}</span> },
  ];

  return (
    <div className="space-y-4">
      <InlineAlert tone="info">
        These offers are running now and discount live website prices. Customers get the single best price between a product’s own discount and any running offer. Manage them in{" "}
        <Link href="/admin/offers" className="underline underline-offset-2">
          Offers
        </Link>
        .
      </InlineAlert>
      <DataTable
        columns={columns}
        rows={overview.runningOfferDiscounts}
        getRowKey={(row) => row.offerId}
        empty={{
          title: "No offers are discounting prices",
          description: "Offers with a price discount appear here while they’re running.",
          action: (
            <AdminLinkButton href="/admin/offers" size="sm">
              Go to offers
            </AdminLinkButton>
          ),
        }}
      />
    </div>
  );
}
