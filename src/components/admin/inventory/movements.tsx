"use client";

import Link from "next/link";
import { StatusBadge, type Column } from "@/components/admin/ui";
import { formatDateTime, humanize, type Tone } from "@/lib/admin/format";
import type { MovementType, StockMovement } from "./types";

const typeTones: Record<MovementType, Tone> = {
  opening: "neutral",
  purchase: "success",
  return: "success",
  add: "success",
  sale: "info",
  reduce: "warning",
  adjustment: "accent",
  transfer: "accent",
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
  return <StatusBadge status={type} tone={typeTones[type] ?? "neutral"} />;
}

export function MovementDelta({ movement }: { movement: StockMovement }) {
  if (movement.type === "transfer") return <span className="whitespace-nowrap text-ink-soft">{movement.quantityDelta} moved</span>;
  const delta = movement.quantityDelta;
  return <span className={delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted"}>{delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "0"}</span>;
}

function referenceHref(movement: StockMovement) {
  if (!movement.referenceId) return undefined;
  if (movement.referenceType === "purchase") return `/admin/purchases/${movement.referenceId}`;
  if (movement.referenceType === "order") return `/admin/orders/${movement.referenceId}`;
  if (movement.referenceType === "sale") return `/admin/sales/${movement.referenceId}`;
  return undefined;
}

const arrow = (before: number | null, after: number | null) => (
  <span className="whitespace-nowrap tabular-nums">
    {before ?? "—"} → {after ?? "—"}
  </span>
);

/** Columns shared by the product movement history and the global movement ledger. */
export function movementColumns({ locationName, showProduct = false }: { locationName: (id: string) => string; showProduct?: boolean }): Column<StockMovement>[] {
  return [
    { key: "createdAt", header: "Time", cell: (m) => <span className="whitespace-nowrap">{formatDateTime(m.createdAt)}</span> },
    ...(showProduct
      ? [
          {
            key: "product",
            header: "Product",
            cell: (m: StockMovement) => (
              <span className="block min-w-[10rem]">
                <Link href={`/admin/inventory/${m.productId}`} className="font-medium hover:underline">
                  {m.productName ?? "Product"}
                </Link>
                {m.sku && <span className="block text-[0.75rem] text-muted">{m.sku}</span>}
              </span>
            ),
          },
        ]
      : []),
    { key: "type", header: "Type", cell: (m) => <MovementTypeBadge type={m.type} /> },
    { key: "delta", header: "Change", align: "right", cell: (m) => <MovementDelta movement={m} /> },
    {
      key: "location",
      header: "Location",
      cell: (m) => (
        <span className="whitespace-nowrap">
          {locationName(m.locationId)}
          {m.toLocationId && <> → {locationName(m.toLocationId)}</>}
        </span>
      ),
    },
    { key: "total", header: "Total", cell: (m) => arrow(m.totalBefore, m.totalAfter) },
    {
      key: "atLocation",
      header: "At location",
      cell: (m) => (
        <span className="block text-[0.8125rem]">
          {arrow(m.locationBefore, m.locationAfter)}
          {m.toLocationId && (
            <span className="block text-[0.75rem] text-muted">
              {locationName(m.toLocationId)}: {arrow(m.toLocationBefore, m.toLocationAfter)}
            </span>
          )}
        </span>
      ),
    },
    { key: "actor", header: "By", priority: "low", cell: (m) => m.actorName },
    { key: "reason", header: "Reason", cell: (m) => <span className="block min-w-[10rem] max-w-[18rem] break-words text-ink-soft">{m.reason ?? "—"}</span> },
    {
      key: "reference",
      header: "Reference",
      priority: "low",
      cell: (m) => {
        const href = referenceHref(m);
        if (!m.referenceLabel && !m.referenceType) return <span className="text-muted">—</span>;
        return (
          <span className="block whitespace-nowrap">
            {m.referenceLabel ? (
              href ? (
                <Link href={href} className="text-champagne-deep hover:underline">
                  {m.referenceLabel}
                </Link>
              ) : (
                m.referenceLabel
              )
            ) : null}
            {m.referenceType && <span className="block text-[0.6875rem] text-muted">{humanize(m.referenceType)}</span>}
          </span>
        );
      },
    },
  ];
}
