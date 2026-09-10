"use client";

import { DownloadIcon } from "@/components/admin/icons";
import { adminButton, DataTable, Panel, type Column } from "@/components/admin/ui";
import { adminFileUrl } from "@/lib/admin/client";
import { number } from "@/lib/admin/format";
import { formatReportCell, isNumericFormat, reportRowHref, type Report, type ReportSection } from "./report";

interface Row {
  index: number;
  values: Record<string, unknown>;
}

export function ReportSectionPanel({ report, section, customerId }: { report: Report; section: ReportSection; customerId?: string }) {
  const columns: Column<Row>[] = section.columns.map((column) => ({
    key: column.key,
    header: column.label,
    align: isNumericFormat(column.format) ? "right" : "left",
    className: column.key === "name" || column.key === "category" ? "min-w-[10rem]" : "whitespace-nowrap",
    cell: (row) => formatReportCell(column, row.values[column.key]),
  }));
  const rows: Row[] = section.rows.map((values, index) => ({ index, values }));
  const csvHref = adminFileUrl(`/reports/${encodeURIComponent(report.type)}/export.csv`, {
    from: report.period.from,
    to: report.period.to,
    groupBy: report.groupBy,
    customerId,
    section: section.key,
  });

  return (
    <Panel
      title={section.title}
      description={`${number(rows.length)} ${rows.length === 1 ? "row" : "rows"}`}
      actions={
        <a href={csvHref} download className={adminButton("secondary", "sm")}>
          <DownloadIcon size={14} />
          Download CSV
        </a>
      }
      flush
      bodyClassName="[&>div]:border-0"
    >
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => String(row.index)}
        rowHref={(row) => reportRowHref(row.values)}
        empty={{ title: "No data for this period", description: "Try a wider date range." }}
      />
    </Panel>
  );
}
