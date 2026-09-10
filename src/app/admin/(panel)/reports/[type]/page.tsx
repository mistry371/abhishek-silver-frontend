"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { RefreshIcon } from "@/components/admin/icons";
import { CustomerPicker } from "@/components/admin/reports/CustomerPicker";
import { ReportChartPanel } from "@/components/admin/reports/ReportChartPanel";
import { formatReportValue, REPORT_INFO, shiftIsoDate, SNAPSHOT_REPORTS, type Report } from "@/components/admin/reports/report";
import { ReportSectionPanel } from "@/components/admin/reports/ReportSectionPanel";
import { AdminButton, DateInput, EmptyNote, ErrorState, FilterBar, FilterSelect, InlineAlert, LoadingBlock, PageHeader, Panel, StatCard } from "@/components/admin/ui";
import { formatDate, formatDateTime, humanize, todayIst } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

const FILTER_KEYS = ["from", "to", "groupBy", "customerId"] as const;
const GROUP_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
];

function ReportBody({ report, loading, customerId }: { report: Report; loading: boolean; customerId?: string }) {
  return (
    <div className={cn("space-y-6 transition-opacity", loading && "opacity-60")} aria-busy={loading || undefined}>
      {report.summary.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {report.summary.map((item) => (
            <StatCard key={item.label} label={item.label} value={<span className={cn(item.format === "text" && "text-[1.25rem]")}>{formatReportValue(item.value, item.format)}</span>} />
          ))}
        </div>
      )}
      {report.charts.length > 0 && (
        <div className={cn("grid gap-6", report.charts.length > 1 && "xl:grid-cols-2")}>
          {report.charts.map((chart) => (
            <ReportChartPanel key={chart.key} chart={chart} />
          ))}
        </div>
      )}
      {report.sections.map((section) => (
        <ReportSectionPanel key={section.key} report={report} section={section} customerId={customerId} />
      ))}
    </div>
  );
}

export default function ReportPage() {
  const params = useParams<{ type: string }>();
  const type = String(params.type ?? "");
  const info = REPORT_INFO[type];
  const snapshot = SNAPSHOT_REPORTS.has(type);
  const needsCustomer = type === "customer-history";

  // Default period: the last 30 days in IST, fixed when the page opens.
  const [defaults] = useState(() => {
    const to = todayIst();
    return { from: shiftIsoDate(to, -29), to };
  });
  const [customerLabel, setCustomerLabel] = useState("");
  const { values, setFilters } = useUrlFilters(FILTER_KEYS);

  const from = values.from || defaults.from;
  const to = values.to || defaults.to;
  const groupBy = values.groupBy === "day" || values.groupBy === "month" ? values.groupBy : "";
  const customerId = needsCustomer ? values.customerId : "";

  const path = needsCustomer && !customerId ? null : `/reports/${encodeURIComponent(type)}`;
  const { data, latest, loading, error, reload } = useAdminResource<Report>(path, snapshot ? {} : { from, to, groupBy, customerId });
  const report = data ?? (loading && latest?.type === type ? latest : undefined);
  const validation = error?.status === 422 ? Object.values(error.fieldErrors ?? {}).join(" ") || error.message : null;
  const customerSummary = report?.type === "customer-history" ? report.summary.find((item) => item.label === "Customer")?.value : undefined;

  return (
    <>
      <PageHeader
        title={report?.title ?? info?.title ?? humanize(type)}
        description={info?.description}
        back={{ href: "/admin/reports", label: "Reports" }}
        actions={
          path && (
            <AdminButton onClick={reload} disabled={loading}>
              <RefreshIcon size={15} />
              Refresh
            </AdminButton>
          )
        }
        meta={
          report && (
            <p className="text-[0.75rem] text-muted">
              {snapshot ? "Current stock snapshot" : `${formatDate(report.period.from)} – ${formatDate(report.period.to)} · grouped by ${report.groupBy}`} · Generated {formatDateTime(report.generatedAt)}
            </p>
          )
        }
      />

      {(needsCustomer || !snapshot) && (
        <FilterBar>
          {needsCustomer && (
            <CustomerPicker
              selectedId={customerId}
              selectedLabel={customerLabel || (typeof customerSummary === "string" ? customerSummary : undefined)}
              onSelect={(customer) => {
                setCustomerLabel(customer.label);
                setFilters({ customerId: customer.id });
              }}
              onClear={() => {
                setCustomerLabel("");
                setFilters({ customerId: "" });
              }}
            />
          )}
          {!snapshot && (
            <>
              <DateInput label="From" value={from} onChange={(value) => setFilters({ from: value })} />
              <DateInput label="To" value={to} onChange={(value) => setFilters({ to: value })} />
              <FilterSelect label="Group by" value={groupBy} onChange={(value) => setFilters({ groupBy: value })} options={GROUP_OPTIONS} allLabel="Automatic" />
              {(values.from || values.to || values.groupBy) && (
                <AdminButton variant="ghost" onClick={() => setFilters({ from: "", to: "", groupBy: "" })}>
                  Reset to last 30 days
                </AdminButton>
              )}
            </>
          )}
        </FilterBar>
      )}

      {snapshot && (
        <InlineAlert tone="info" className="mb-4">
          This report shows stock as it is right now, so there is no date range to choose.
        </InlineAlert>
      )}

      {!path ? (
        <Panel>
          <EmptyNote title="Choose a customer" description="Search by name, mobile number, email or customer ID to see everything they bought in the selected period." />
        </Panel>
      ) : validation ? (
        <InlineAlert>{validation}</InlineAlert>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !report ? (
        <LoadingBlock rows={6} />
      ) : (
        <ReportBody report={report} loading={loading} customerId={customerId || undefined} />
      )}
    </>
  );
}
