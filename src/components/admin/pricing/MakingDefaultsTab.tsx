"use client";

import { useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { controlClass, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, DataTable, EmptyNote, InlineAlert, type Column } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { useMutation } from "@/lib/admin/hooks";
import { makingLabel, makingTypeOptions, ReasonField, type MakingType, type PricingOverview } from "./shared";

type DefaultRow = PricingOverview["makingDefaults"][number];
type DraftRow = { type: MakingType | ""; value: string };

const valueHint: Record<MakingType, string> = { per_gram: "₹ per gram", percentage: "% of metal value", fixed: "₹ per piece" };

function initialDraft(rows: DefaultRow[]) {
  return Object.fromEntries(rows.map((row) => [row.categoryId, { type: row.type ?? "", value: row.value === null ? "" : String(row.value) } satisfies DraftRow]));
}

/** Parent should key this component by the loaded data so it re-initialises after saving. */
export function MakingDefaultsTab({ overview, onChanged }: { overview: PricingOverview; onChanged: () => void }) {
  const { can } = useAdmin();
  const canManage = can("pricing:manage");
  const rows = overview.makingDefaults;
  const [draft, setDraft] = useState<Record<string, DraftRow>>(() => initialDraft(rows));
  const [reason, setReason] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const mutation = useMutation((payload: { items: { categoryId: string; type: MakingType; value: number }[]; reason: string }) =>
    adminApi.put<{ updated: number }>("/pricing/making-defaults", payload),
  );

  const changed = rows.filter((row) => {
    const entry = draft[row.categoryId];
    if (!entry) return false;
    return entry.type !== (row.type ?? "") || toNumberOrNull(entry.value) !== row.value;
  });

  const serverRowErrors: Record<string, string> = {};
  for (const [name, message] of Object.entries(mutation.fieldErrors)) {
    const match = /^items\.(\d+)/.exec(name);
    const id = match ? submittedIds[Number(match[1])] : undefined;
    if (id) serverRowErrors[id] = message;
  }

  const update = (categoryId: string, patch: Partial<DraftRow>) =>
    setDraft((current) => ({ ...current, [categoryId]: { ...(current[categoryId] ?? { type: "", value: "" }), ...patch } }));

  async function save(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const items: { categoryId: string; type: MakingType; value: number }[] = [];
    for (const row of changed) {
      const entry = draft[row.categoryId]!;
      const value = toNumberOrNull(entry.value);
      if (!entry.type) errors[row.categoryId] = "Choose how making is charged.";
      else if (value === null) errors[row.categoryId] = "Enter a value.";
      else if (value < 0 || value > 10_000_000) errors[row.categoryId] = "Enter a value between 0 and 1,00,00,000.";
      else if (entry.type === "percentage" && value > 100) errors[row.categoryId] = "A percentage can’t exceed 100.";
      else items.push({ categoryId: row.categoryId, type: entry.type, value });
    }
    if (!changed.length) errors._form = "Change at least one default before saving.";
    if (!reason.trim()) errors.reason = "Give a reason for this change.";
    setLocalErrors(errors);
    if (Object.keys(errors).length) return;
    setSubmittedIds(items.map((item) => item.categoryId));
    const result = await mutation.run({ items, reason: reason.trim() });
    if (!result) return;
    toast({
      tone: "success",
      title: "Making charge defaults saved",
      description: `${result.updated} jewellery type${result.updated === 1 ? "" : "s"} updated. Existing products keep their own making charges.`,
    });
    onChanged();
  }

  if (!rows.length) {
    return (
      <div className="border border-line bg-porcelain">
        <EmptyNote title="No jewellery types yet" description="Making charge defaults are set per jewellery-type category. Add type categories in the catalogue first." />
      </div>
    );
  }

  const columns: Column<DefaultRow>[] = [
    { key: "category", header: "Jewellery type", cell: (row) => <span className="font-medium">{row.categoryName}</span> },
    { key: "current", header: "Saved default", cell: (row) => <span className={row.type ? "text-ink" : "text-muted"}>{makingLabel(row.type, row.value)}</span> },
  ];

  if (canManage) {
    columns.push(
      {
        key: "type",
        header: "Charged as",
        cell: (row) => {
          const entry = draft[row.categoryId] ?? { type: "", value: "" };
          return (
            <select
              aria-label={`How making is charged for ${row.categoryName}`}
              value={entry.type}
              onChange={(event) => update(row.categoryId, { type: event.target.value as MakingType | "" })}
              className={controlClass(undefined, "h-9 min-w-[10rem]")}
            >
              {!row.type && <option value="">Not set</option>}
              {makingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        key: "value",
        header: "Value",
        cell: (row) => {
          const entry = draft[row.categoryId] ?? { type: "", value: "" };
          const error = localErrors[row.categoryId] ?? serverRowErrors[row.categoryId];
          return (
            <div className="flex min-w-[9rem] max-w-[12rem] flex-col">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                aria-label={`Making charge value for ${row.categoryName}`}
                aria-invalid={error ? true : undefined}
                value={entry.value}
                onChange={(event) => update(row.categoryId, { value: event.target.value })}
                className={controlClass(error, "h-9 text-right tabular-nums")}
              />
              {error ? (
                <p role="alert" className="mt-1 text-[0.75rem] text-danger">
                  {error}
                </p>
              ) : (
                entry.type && <p className="mt-1 text-[0.6875rem] text-muted">{valueHint[entry.type]}</p>
              )}
            </div>
          );
        },
      },
    );
  }

  return (
    <form onSubmit={save} className="space-y-4" noValidate>
      <div>
        <h2 className="text-[0.9375rem] font-medium text-ink">Making charge defaults</h2>
        <p className="mt-0.5 max-w-3xl text-[0.8125rem] text-muted">
          Starting values suggested when staff create a new product in each jewellery type. Changing a default doesn’t reprice existing products — each product keeps the making charge saved on it.
        </p>
      </div>

      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.categoryId} />

      {canManage ? (
        <div className="grid gap-4 border border-line bg-porcelain p-5">
          <ReasonField value={reason} onChange={setReason} error={localErrors.reason ?? mutation.fieldErrors.reason} />
          {localErrors._form && <InlineAlert>{localErrors._form}</InlineAlert>}
          {mutation.error && !Object.keys(mutation.fieldErrors).length && <InlineAlert>{mutation.error.message}</InlineAlert>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.8125rem] text-muted">{changed.length ? `${changed.length} default${changed.length === 1 ? "" : "s"} changed.` : "No changes yet."}</p>
            <div className="flex flex-wrap gap-2">
              <AdminButton
                variant="ghost"
                disabled={!changed.length || mutation.pending}
                onClick={() => {
                  setDraft(initialDraft(rows));
                  setLocalErrors({});
                  mutation.clearError();
                }}
              >
                Discard changes
              </AdminButton>
              <AdminButton variant="primary" type="submit" loading={mutation.pending}>
                Save defaults
              </AdminButton>
            </div>
          </div>
        </div>
      ) : (
        <InlineAlert tone="info">Your role can view making charge defaults but not change them.</InlineAlert>
      )}
    </form>
  );
}
