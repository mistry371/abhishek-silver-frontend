"use client";

import { useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { controlClass, NumberInput, toNumberOrNull } from "@/components/admin/fields";
import { EditIcon } from "@/components/admin/icons";
import { AdminButton, ConfirmDialog, DataTable, InlineAlert, KeyValue, Panel, StatusBadge, type Column } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDateTime, metalLabels, money, number as formatNumber, percent } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";
import { ReasonField, type Metal, type MetalRateRow, type PricingOverview, type Purity } from "./shared";

const rowKey = (row: { metal: string; purity: string }) => `${row.metal}:${row.purity}`;
const rowLabel = (row: MetalRateRow) => `${metalLabels[row.metal] ?? row.metal} · ${row.label}`;
const MAX_RATE = 1_000_000;
const BIG_CHANGE = 10;

function changePercent(from: number | null, to: number) {
  if (from === null || from === 0) return null;
  return ((to - from) / from) * 100;
}

function Delta({ from, to }: { from: number | null; to: number }) {
  const change = changePercent(from, to);
  if (change === null) return <span className="text-muted">First rate</span>;
  return (
    <span className={cn("tabular-nums", Math.abs(change) >= BIG_CHANGE ? "font-medium text-warning" : "text-ink-soft")}>
      {change > 0 ? "+" : ""}
      {formatNumber(change)}%
    </span>
  );
}

interface RatesPayload {
  rates: { metal: Metal; purity: Purity; ratePerGram: number }[];
  reason: string;
}

/* ------------------------------------------------------------------ */
/* Metal rates                                                         */
/* ------------------------------------------------------------------ */

export function MetalRatesTab({ overview, onChanged }: { overview: PricingOverview; onChanged: () => void }) {
  const { can } = useAdmin();
  const canManage = can("pricing:manage");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [submittedKeys, setSubmittedKeys] = useState<string[]>([]);
  const mutation = useMutation((payload: RatesPayload) => adminApi.put<{ updated: number; affectedProducts: number }>("/pricing/rates", payload));

  const changes = editing
    ? overview.rates.flatMap((row) => {
        const next = toNumberOrNull(draft[rowKey(row)] ?? "");
        return next === null || next === row.ratePerGram ? [] : [{ row, next }];
      })
    : [];
  const missing = overview.rates.filter((row) => row.ratePerGram === null);
  const bigChanges = changes.filter(({ row, next }) => Math.abs(changePercent(row.ratePerGram, next) ?? 0) >= BIG_CHANGE);

  const serverRowErrors: Record<string, string> = {};
  for (const [name, message] of Object.entries(mutation.fieldErrors)) {
    const match = /^rates\.(\d+)/.exec(name);
    const key = match ? submittedKeys[Number(match[1])] : undefined;
    if (key) serverRowErrors[key] = message;
  }
  const errorFor = (key: string) => localErrors[key] ?? serverRowErrors[key];

  function startEditing() {
    setDraft(Object.fromEntries(overview.rates.map((row) => [rowKey(row), row.ratePerGram === null ? "" : String(row.ratePerGram)])));
    setReason("");
    setLocalErrors({});
    mutation.clearError();
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setLocalErrors({});
    mutation.clearError();
  }

  function review(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    for (const { row, next } of changes) {
      if (next <= 0 || next > MAX_RATE) errors[rowKey(row)] = "Enter a rate above ₹0 and up to ₹10,00,000.";
    }
    if (!changes.length) errors._form = "Change at least one rate before reviewing.";
    if (!reason.trim()) errors.reason = "Give a reason for this change.";
    setLocalErrors(errors);
    if (Object.keys(errors).length) return;
    mutation.clearError();
    setConfirming(true);
  }

  async function confirm() {
    const rates = changes.map(({ row, next }) => ({ metal: row.metal, purity: row.purity, ratePerGram: next }));
    setSubmittedKeys(rates.map(rowKey));
    const result = await mutation.run({ rates, reason: reason.trim() });
    if (!result) return;
    setConfirming(false);
    setEditing(false);
    toast({
      tone: "success",
      title: `${result.updated} metal rate${result.updated === 1 ? "" : "s"} updated`,
      description: `${result.affectedProducts} active product${result.affectedProducts === 1 ? "" : "s"} now use the new rate${result.updated === 1 ? "" : "s"} on the website.`,
    });
    onChanged();
  }

  const changeColumn: Column<MetalRateRow> = {
    key: "change",
    header: "Change",
    align: "right",
    cell: (row) => {
      const change = changes.find((item) => rowKey(item.row) === rowKey(row));
      return change ? <Delta from={row.ratePerGram} to={change.next} /> : <span className="text-subtle">—</span>;
    },
  };

  const columns: Column<MetalRateRow>[] = [
    { key: "metal", header: "Metal", cell: (row) => metalLabels[row.metal] ?? row.metal },
    { key: "purity", header: "Purity", cell: (row) => row.label },
    {
      key: "rate",
      header: "Rate per gram",
      align: "right",
      cell: (row) => {
        if (!editing) return row.ratePerGram === null ? <StatusBadge status="not_set" label="Not set" tone="warning" /> : <span className="font-medium">{money(row.ratePerGram)}</span>;
        const key = rowKey(row);
        const error = errorFor(key);
        return (
          <div className="ml-auto flex w-full max-w-[11rem] flex-col items-end">
            <div className="relative w-full">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max={MAX_RATE}
                value={draft[key] ?? ""}
                placeholder={row.ratePerGram === null ? "Not set" : undefined}
                aria-label={`Rate per gram for ${rowLabel(row)}`}
                aria-invalid={error ? true : undefined}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraft((current) => ({ ...current, [key]: value }));
                }}
                className={controlClass(error, "h-9 pl-7 text-right tabular-nums")}
              />
            </div>
            {error && (
              <p role="alert" className="mt-1 text-right text-[0.75rem] text-danger">
                {error}
              </p>
            )}
          </div>
        );
      },
    },
    ...(editing ? [changeColumn] : []),
    { key: "updatedBy", header: "Updated by", priority: "low", cell: (row) => row.updatedBy ?? "—" },
    { key: "updatedAt", header: "Last updated", cell: (row) => <span className="whitespace-nowrap text-ink-soft">{formatDateTime(row.updatedAt)}</span> },
  ];

  const dialogError = mutation.error ? Object.values(mutation.error.fieldErrors ?? {}).join(" ") || mutation.error.message : null;

  return (
    <form onSubmit={review} className="space-y-4" noValidate>
      {missing.length > 0 && (
        <InlineAlert tone="warning">
          {missing.map(rowLabel).join(", ")} {missing.length === 1 ? "has" : "have"} no rate. Products in {missing.length === 1 ? "this purity" : "these purities"} can’t be priced on the website until a rate is set.
        </InlineAlert>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[0.9375rem] font-medium text-ink">Metal rates</h2>
          <p className="mt-0.5 text-[0.8125rem] text-muted">Rate per gram for each purity. Live website prices are calculated from these rates.</p>
        </div>
        {canManage && !editing && (
          <AdminButton variant="primary" onClick={startEditing}>
            <EditIcon size={15} />
            Update rates
          </AdminButton>
        )}
      </div>

      <DataTable columns={columns} rows={overview.rates} getRowKey={rowKey} />

      {editing && (
        <div className="grid gap-4 border border-line bg-porcelain p-5">
          <ReasonField value={reason} onChange={setReason} error={localErrors.reason ?? mutation.fieldErrors.reason} />
          {localErrors._form && <InlineAlert>{localErrors._form}</InlineAlert>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[0.8125rem] text-muted">{changes.length ? `${changes.length} rate${changes.length === 1 ? "" : "s"} changed. You’ll confirm before anything is saved.` : "No rates changed yet."}</p>
            <div className="flex flex-wrap gap-2">
              <AdminButton variant="ghost" onClick={cancelEditing}>
                Cancel
              </AdminButton>
              <AdminButton variant="primary" type="submit">
                Review changes{changes.length ? ` (${changes.length})` : ""}
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => {
          if (!mutation.pending) setConfirming(false);
        }}
        onConfirm={confirm}
        title="Update metal rates?"
        confirmLabel={`Update ${changes.length} rate${changes.length === 1 ? "" : "s"}`}
        pending={mutation.pending}
        error={dialogError}
      >
        <ul className="divide-y divide-line border border-line">
          {changes.map(({ row, next }) => (
            <li key={rowKey(row)} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-[0.875rem]">
              <span className="text-ink">{rowLabel(row)}</span>
              <span className="flex items-center gap-2 tabular-nums">
                <span className="text-muted">{row.ratePerGram === null ? "Not set" : money(row.ratePerGram)}</span>
                <span aria-hidden="true">→</span>
                <span className="sr-only">to</span>
                <span className="font-medium text-ink">{money(next)}</span>
                <span className="text-[0.75rem]">
                  (<Delta from={row.ratePerGram} to={next} />)
                </span>
              </span>
            </li>
          ))}
        </ul>
        <InlineAlert tone="warning" className="mt-4">
          Live website prices update immediately for every active product in {changes.length === 1 ? "this purity" : "these purities"}.
        </InlineAlert>
        {bigChanges.length > 0 && (
          <InlineAlert tone="danger" className="mt-3">
            {bigChanges.map(({ row }) => rowLabel(row)).join(", ")} {bigChanges.length === 1 ? "changes" : "change"} by {BIG_CHANGE}% or more. Check for typing mistakes before confirming.
          </InlineAlert>
        )}
        <p className="mt-3 text-[0.8125rem] text-muted">
          Reason: <span className="text-ink">{reason.trim()}</span>
        </p>
      </ConfirmDialog>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* GST                                                                 */
/* ------------------------------------------------------------------ */

export function GstTab({ overview, onChanged }: { overview: PricingOverview; onChanged: () => void }) {
  const { can } = useAdmin();
  const canManage = can("pricing:manage");
  const current = overview.gst.rate;
  const [rate, setRate] = useState(current === null ? "" : String(current));
  const [reason, setReason] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const mutation = useMutation((payload: { gstRate: number; reason: string }) => adminApi.put<{ gstRate: number }>("/pricing/gst", payload));
  const next = toNumberOrNull(rate);

  function review(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (next === null) errors.gstRate = "Enter the GST rate.";
    else if (next < 0 || next > 28) errors.gstRate = "GST must be between 0% and 28%.";
    else if (next === current) errors.gstRate = "This is already the current rate.";
    if (!reason.trim()) errors.reason = "Give a reason for this change.";
    setLocalErrors(errors);
    if (Object.keys(errors).length) return;
    mutation.clearError();
    setConfirming(true);
  }

  async function confirm() {
    if (next === null) return;
    const result = await mutation.run({ gstRate: next, reason: reason.trim() });
    if (!result) return;
    setConfirming(false);
    toast({ tone: "success", title: `GST updated to ${percent(result.gstRate)}`, description: "Live website prices now include the new rate." });
    onChanged();
  }

  const dialogError = mutation.error ? Object.values(mutation.error.fieldErrors ?? {}).join(" ") || mutation.error.message : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Panel title="Current GST" description="Applied to the taxable value of every product price.">
        {current === null ? (
          <InlineAlert tone="warning">No GST rate is set, so prices are currently calculated with 0% GST.</InlineAlert>
        ) : (
          <p className="font-serif text-[2.5rem] leading-none tabular-nums text-ink">{percent(current)}</p>
        )}
        <div className="mt-5">
          <KeyValue
            items={[
              { label: "Updated by", value: overview.gst.updatedBy ?? "—" },
              { label: "Last updated", value: formatDateTime(overview.gst.updatedAt) },
            ]}
          />
        </div>
      </Panel>

      {canManage ? (
        <Panel title="Change GST rate" description="The new rate applies to live website prices as soon as you confirm.">
          <form onSubmit={review} className="grid gap-4" noValidate>
            <NumberInput
              label="New GST rate (%)"
              required
              min={0}
              max={28}
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              error={localErrors.gstRate ?? mutation.fieldErrors.gstRate}
              hint="Between 0% and 28%. Jewellery is usually 3%."
              containerClassName="max-w-xs"
            />
            <ReasonField value={reason} onChange={setReason} error={localErrors.reason ?? mutation.fieldErrors.reason} />
            <div className="flex justify-end">
              <AdminButton variant="primary" type="submit">
                Review change
              </AdminButton>
            </div>
          </form>
        </Panel>
      ) : (
        <InlineAlert tone="info" className="self-start">
          Your role can view GST but not change it. Ask a Super Admin for the pricing management permission.
        </InlineAlert>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => {
          if (!mutation.pending) setConfirming(false);
        }}
        onConfirm={confirm}
        title="Update GST rate?"
        confirmLabel="Update GST"
        pending={mutation.pending}
        error={dialogError}
      >
        <p className="flex items-center gap-3 text-[1.125rem] tabular-nums">
          <span className="text-muted">{current === null ? "Not set" : percent(current)}</span>
          <span aria-hidden="true">→</span>
          <span className="sr-only">to</span>
          <span className="font-medium text-ink">{percent(next)}</span>
        </p>
        <InlineAlert tone="warning" className="mt-4">
          Live website prices for every active product update immediately.
        </InlineAlert>
        <p className="mt-3 text-[0.8125rem] text-muted">
          Reason: <span className="text-ink">{reason.trim()}</span>
        </p>
      </ConfirmDialog>
    </div>
  );
}
