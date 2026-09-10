import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TotalsRow {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  tone?: "danger" | "success" | "muted";
  hidden?: boolean;
}

/** Label / amount rows for document totals. */
export function TotalsList({ rows, className }: { rows: TotalsRow[]; className?: string }) {
  return (
    <dl className={cn("space-y-1.5 text-[0.8125rem]", className)}>
      {rows
        .filter((row) => !row.hidden)
        .map((row, index) => (
          <div key={index} className={cn("flex items-baseline justify-between gap-4", row.strong && "border-t border-line pt-2 text-[0.9375rem] font-medium")}>
            <dt className={row.strong ? "text-ink" : "text-muted"}>{row.label}</dt>
            <dd className={cn("text-right tabular-nums", row.tone === "danger" ? "text-danger" : row.tone === "success" ? "text-success" : row.tone === "muted" ? "text-muted" : "text-ink")}>
              {row.value}
            </dd>
          </div>
        ))}
    </dl>
  );
}
