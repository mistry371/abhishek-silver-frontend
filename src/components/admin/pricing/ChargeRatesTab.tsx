"use client";

import { useId, useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CheckboxInput, NumberInput, SelectInput, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { EditIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, DataTable, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDateTime, humanize, money } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { MutationAlert, ReasonField, type ChargeRate, type PricingOverview } from "./shared";

const unitSuffix: Record<ChargeRate["unit"], string> = { per_carat: "/ carat", per_piece: "/ piece", fixed: "fixed" };
const unitOptions = [
  { value: "per_carat", label: "Per carat" },
  { value: "per_piece", label: "Per piece" },
  { value: "fixed", label: "Fixed amount" },
];
const kindOptions = [
  { value: "stone", label: "Stone" },
  { value: "other", label: "Other charge" },
];

type ChargeRatePayload = Pick<ChargeRate, "name" | "kind" | "unit" | "rate" | "active"> & { reason: string };

export function ChargeRatesTab({ overview, onChanged }: { overview: PricingOverview; onChanged: () => void }) {
  const { can } = useAdmin();
  const canManage = can("pricing:manage");
  const [editing, setEditing] = useState<ChargeRate | "new" | null>(null);

  const columns: Column<ChargeRate>[] = [
    { key: "name", header: "Name", cell: (row) => <span className="font-medium">{row.name}</span> },
    { key: "kind", header: "Kind", cell: (row) => (row.kind === "stone" ? "Stone" : "Other charge") },
    {
      key: "rate",
      header: "Rate",
      align: "right",
      cell: (row) => (
        <span className="whitespace-nowrap">
          {money(row.rate)} <span className="text-muted">{unitSuffix[row.unit] ?? humanize(row.unit)}</span>
        </span>
      ),
    },
    { key: "active", header: "Status", cell: (row) => <StatusBadge status={row.active ? "active" : "inactive"} /> },
    { key: "updatedAt", header: "Last updated", priority: "low", cell: (row) => <span className="whitespace-nowrap text-ink-soft">{formatDateTime(row.updatedAt)}</span> },
  ];
  if (canManage) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (
        <AdminButton size="sm" variant="ghost" onClick={() => setEditing(row)} aria-label={`Edit ${row.name}`}>
          <EditIcon size={14} />
          Edit
        </AdminButton>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[0.9375rem] font-medium text-ink">Stone &amp; other charge rates</h2>
          <p className="mt-0.5 max-w-3xl text-[0.8125rem] text-muted">
            Reference rates staff use when working out a product’s stone and other charges (settings, enamel, stringing). Changing a rate here doesn’t reprice existing products.
          </p>
        </div>
        {canManage && (
          <AdminButton variant="primary" onClick={() => setEditing("new")}>
            <PlusIcon size={15} />
            Add charge rate
          </AdminButton>
        )}
      </div>

      <DataTable
        columns={columns}
        rows={overview.chargeRates}
        getRowKey={(row) => row.id}
        empty={{
          title: "No charge rates yet",
          description: "Add rates for stones (per carat or piece) and other work to keep product pricing consistent.",
          action: canManage ? (
            <AdminButton onClick={() => setEditing("new")}>
              <PlusIcon size={15} />
              Add charge rate
            </AdminButton>
          ) : undefined,
        }}
      />

      {editing && (
        <ChargeRateDialog
          rate={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function ChargeRateDialog({ rate, onClose, onSaved }: { rate: ChargeRate | null; onClose: () => void; onSaved: () => void }) {
  const formId = useId();
  const [form, setForm] = useState({
    name: rate?.name ?? "",
    kind: rate?.kind ?? ("stone" as ChargeRate["kind"]),
    unit: rate?.unit ?? ("per_carat" as ChargeRate["unit"]),
    rate: rate ? String(rate.rate) : "",
    active: rate?.active ?? true,
  });
  const [reason, setReason] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((payload: ChargeRatePayload) =>
    rate ? adminApi.patch<ChargeRate>(`/pricing/charge-rates/${rate.id}`, payload) : adminApi.post<ChargeRate>("/pricing/charge-rates", payload),
  );
  const errors: Record<string, string | undefined> = { ...mutation.fieldErrors, ...localErrors };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const name = form.name.trim();
    const value = toNumberOrNull(form.rate);
    if (!name) nextErrors.name = "Enter a name.";
    else if (name.length > 80) nextErrors.name = "Use 80 characters or fewer.";
    if (value === null) nextErrors.rate = "Enter the rate.";
    else if (value < 0 || value > 100_000_000) nextErrors.rate = "Enter an amount between 0 and 10,00,00,000.";
    if (!reason.trim()) nextErrors.reason = "Give a reason for this change.";
    if (rate && value !== null && name === rate.name && form.kind === rate.kind && form.unit === rate.unit && value === rate.rate && form.active === rate.active) {
      nextErrors._form = "Nothing has changed.";
    }
    setLocalErrors(nextErrors);
    if (Object.keys(nextErrors).length || value === null) return;

    // Always send every field: the API's partial schema would otherwise apply `active`'s default.
    const result = await mutation.run({ name, kind: form.kind, unit: form.unit, rate: value, active: form.active, reason: reason.trim() });
    if (!result) return;
    toast({ tone: "success", title: rate ? `${result.name} updated` : `${result.name} added` });
    onSaved();
  }

  return (
    <AdminDialog
      open
      onClose={() => {
        if (!mutation.pending) onClose();
      }}
      title={rate ? `Edit ${rate.name}` : "Add charge rate"}
      description="Changes are recorded in price history with your reason."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" form={formId} loading={mutation.pending}>
            {rate ? "Save changes" : "Add rate"}
          </AdminButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <TextInput label="Name" required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={errors.name} placeholder="e.g. Cubic zirconia" containerClassName="sm:col-span-2" />
        <SelectInput label="Kind" required options={kindOptions} value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as ChargeRate["kind"] })} error={errors.kind} />
        <SelectInput label="Unit" required options={unitOptions} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value as ChargeRate["unit"] })} error={errors.unit} />
        <NumberInput label="Rate (₹)" required min={0} step="0.01" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value })} error={errors.rate} />
        <div className="flex items-end pb-2">
          <CheckboxInput label="Active" description="Inactive rates stay in history but aren’t offered to staff." checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
        </div>
        <ReasonField value={reason} onChange={setReason} error={errors.reason} />
        <MutationAlert error={mutation.error && !Object.keys(mutation.fieldErrors).some((key) => key !== "_form") ? mutation.error : null} className="sm:col-span-2" />
        {localErrors._form && <p className="text-[0.8125rem] text-muted sm:col-span-2">{localErrors._form}</p>}
      </form>
    </AdminDialog>
  );
}
