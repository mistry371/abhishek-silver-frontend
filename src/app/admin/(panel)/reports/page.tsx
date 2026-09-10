"use client";

import Link from "next/link";
import { ChartIcon } from "@/components/admin/icons";
import { REPORT_INFO, type ReportListItem } from "@/components/admin/reports/report";
import { EmptyNote, ErrorState, LoadingBlock, PageHeader, Panel } from "@/components/admin/ui";
import { ChevronRightIcon } from "@/components/icons";
import { useAdminResource } from "@/lib/admin/hooks";

export default function ReportsPage() {
  const { data, error, reload } = useAdminResource<ReportListItem[]>("/reports");

  return (
    <>
      <PageHeader
        title="Reports"
        description="Every figure is calculated from recorded sales, orders, invoices, stock movements, purchases and expenses for the dates you choose (Indian Standard Time)."
      />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingBlock rows={4} />}
      {data && data.length === 0 && (
        <Panel>
          <EmptyNote title="No reports available" description="Your role doesn't include any report permissions. Ask a Super Admin if you need access." />
        </Panel>
      )}
      {data && data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((report) => (
            <li key={report.type}>
              <Link href={`/admin/reports/${report.type}`} className="group flex h-full flex-col border border-line bg-porcelain px-5 py-4 transition-colors hover:border-ink">
                <span className="flex items-center gap-2 text-[0.9375rem] font-medium text-ink">
                  <ChartIcon size={16} className="shrink-0 text-champagne-deep" />
                  {report.title}
                </span>
                <span className="mt-1.5 flex-1 text-[0.8125rem] text-muted">{REPORT_INFO[report.type]?.description}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-[0.75rem] text-champagne-deep">
                  Open report
                  <ChevronRightIcon size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
