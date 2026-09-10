"use client";

import { AdminButton, AdminDialog, InlineAlert, KeyValue, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "./types";

/** "roleId" → "Role id", "payment_status" → "Payment status". */
export const fieldLabel = (key: string) => humanize(key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase());

const isPrimitive = (value: unknown) => value === null || ["string", "number", "boolean"].includes(typeof value);

function AuditValue({ value, other, side, present }: { value: unknown; other: unknown; side: "before" | "after"; present: boolean }) {
  if (!present || value === undefined) return <span className="text-subtle">—</span>;
  if (value === null) return <span className="italic text-muted">empty</span>;
  if (typeof value === "boolean") return <>{value ? "Yes" : "No"}</>;
  if (typeof value === "string" || typeof value === "number") {
    return String(value) === "" ? <span className="italic text-muted">blank</span> : <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
  }
  if (Array.isArray(value) && value.every(isPrimitive)) {
    if (!value.length) return <span className="italic text-muted">none</span>;
    const compare = Array.isArray(other);
    const otherItems = new Set(compare ? (other as unknown[]).map(String) : []);
    return (
      <ul className="flex flex-wrap gap-1">
        {value.map((item, index) => {
          const text = String(item);
          const differs = compare && !otherItems.has(text);
          return (
            <li
              key={`${text}-${index}`}
              className={cn(
                "border px-1.5 py-0.5 text-[0.6875rem]",
                !differs && "border-line bg-cream text-ink-soft",
                differs && side === "after" && "border-success/30 bg-success/10 text-success",
                differs && side === "before" && "border-danger/30 bg-danger/10 text-danger line-through",
              )}
            >
              {differs ? (side === "after" ? "+ " : "− ") : ""}
              {text}
            </li>
          );
        })}
      </ul>
    );
  }
  return <pre className="max-w-md whitespace-pre-wrap break-all font-mono text-[0.75rem] text-ink-soft">{JSON.stringify(value, null, 2)}</pre>;
}

function AuditChanges({ before, after }: { before: Record<string, unknown> | null; after: Record<string, unknown> | null }) {
  const keys = [...new Set([...Object.keys(after ?? {}), ...Object.keys(before ?? {})])];
  if (!keys.length) return <p className="border border-line bg-cream/50 px-4 py-4 text-[0.8125rem] text-muted">No field values were recorded for this action.</p>;
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full border-collapse text-left text-[0.8125rem]">
        <thead>
          <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
            <th scope="col" className="px-3 py-2 font-medium">
              Field
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Before
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const hasBefore = Boolean(before && key in before);
            const hasAfter = Boolean(after && key in after);
            const changed = JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]);
            return (
              <tr key={key} className="border-b border-line align-top last:border-0">
                <th scope="row" className="whitespace-nowrap px-3 py-2.5 font-medium text-ink">
                  {fieldLabel(key)}
                  <span className="block font-mono text-[0.6875rem] font-normal text-muted">{key}</span>
                </th>
                <td className={cn("min-w-[8rem] px-3 py-2.5 text-ink", changed && hasBefore && "bg-danger/5")}>
                  <AuditValue value={before?.[key]} other={after?.[key]} side="before" present={hasBefore} />
                </td>
                <td className={cn("min-w-[8rem] px-3 py-2.5 text-ink", changed && hasAfter && "bg-success/5")}>
                  <AuditValue value={after?.[key]} other={before?.[key]} side="after" present={hasAfter} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AuditDetailDialog({ entry, onClose }: { entry: AuditLogEntry; onClose: () => void }) {
  return (
    <AdminDialog
      open
      onClose={onClose}
      size="lg"
      title={humanize(entry.action)}
      description={`${formatDateTime(entry.createdAt)} · ${entry.actorName}${entry.actorRole ? ` (${entry.actorRole})` : ""}`}
      footer={<AdminButton onClick={onClose}>Close</AdminButton>}
    >
      {entry.sensitive && (
        <InlineAlert tone="warning" className="mb-4">
          Sensitive action — it changed access, settings or other protected data.
        </InlineAlert>
      )}
      <KeyValue
        items={[
          { label: "Module", value: humanize(entry.module) },
          { label: "Action", value: <code className="text-[0.8125rem]">{entry.action}</code> },
          { label: "Record", value: entry.entityLabel },
          {
            label: "Entity type",
            value: (
              <>
                {humanize(entry.entityType)} <code className="text-[0.75rem] text-muted">{entry.entityType}</code>
              </>
            ),
          },
          { label: "Entity ID", value: entry.entityId ? <span className="break-all font-mono text-[0.8125rem]">{entry.entityId}</span> : null },
          { label: "Reference", value: entry.reference },
          { label: "Reason", value: entry.reason },
          { label: "Sensitive", value: entry.sensitive ? <StatusBadge status="sensitive" label="Sensitive" tone="warning" /> : "No" },
          { label: "IP address", value: entry.ipAddress },
          { label: "User agent", value: entry.userAgent ? <span className="break-all text-[0.8125rem]">{entry.userAgent}</span> : null },
        ]}
      />
      <h3 className="mb-2 mt-6 text-[0.8125rem] font-medium text-ink">Before → after</h3>
      <AuditChanges before={entry.before} after={entry.after} />
    </AdminDialog>
  );
}
