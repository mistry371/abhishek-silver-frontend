"use client";

import { BarChart, Panel } from "@/components/admin/ui";
import { formatReportValue, PERIOD_LABEL, type ReportChart } from "./report";

/** Horizontal bars for charts whose labels are names/SKUs rather than dates. */
function RankedBars({ points, format }: { points: ReportChart["points"]; format: (value: number) => string }) {
  const max = Math.max(...points.map((point) => point.value), 0);
  if (!points.length || max === 0) return <p className="py-10 text-center text-[0.8125rem] text-muted">No data for this period.</p>;
  return (
    <ul className="space-y-2.5">
      {points.map((point, index) => (
        <li key={`${point.label}-${index}`} className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-[0.8125rem] sm:grid-cols-[minmax(0,11rem)_1fr_auto]">
          <span className="truncate text-ink-soft" title={point.label}>
            {point.label}
          </span>
          <span className="h-2.5 bg-cream" aria-hidden="true">
            <span className="block h-full bg-champagne/70" style={{ width: `${Math.max((point.value / max) * 100, point.value > 0 ? 2 : 0)}%` }} />
          </span>
          <span className="tabular-nums text-ink">{format(point.value)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ReportChartPanel({ chart }: { chart: ReportChart }) {
  const format = (value: number) => formatReportValue(value, chart.format);
  const byPeriod = chart.points.every((point) => PERIOD_LABEL.test(point.label));
  return (
    <Panel title={chart.title}>
      {byPeriod ? <BarChart points={chart.points} format={format} label={chart.title} /> : <RankedBars points={chart.points} format={format} />}
    </Panel>
  );
}
