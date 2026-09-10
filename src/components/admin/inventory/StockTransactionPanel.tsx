"use client";

import { useState, type FormEvent } from "react";
import { NumberInput, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { AdminButton, ConfirmDialog, InlineAlert, Panel } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { AdminApiError, adminApi, errorMessage } from "@/lib/admin/client";
import { number } from "@/lib/admin/format";
import type { InventoryDetail, StockMovement } from "./types";

type TransactionType = "add" | "reduce" | "adjustment" | "transfer";

const typeOptions: { value: TransactionType; label: string; hint: string }[] = [
  { value: "add", label: "Add stock", hint: "Units received outside a purchase (e.g. returned from repair)." },
  { value: "reduce", label: "Reduce stock", hint: "Damaged, lost, sample or otherwise removed units." },
  { value: "adjustment", label: "Adjustment (counted quantity)", hint: "Set the physically counted quantity at a location." },
  { value: "transfer", label: "Transfer", hint: "Move units from one location to another. Total stock is unchanged." },
];

const EMPTY = { quantity: "", newQuantity: "", reason: "", referenceLabel: "" };

const isWhole = (value: string) => /^\d+$/.test(value.trim());

export function StockTransactionPanel({ detail, onUpdated, onConflict }: { detail: InventoryDetail; onUpdated: (detail: InventoryDetail) => void; onConflict: () => void }) {
  const [type, setType] = useState<TransactionType>("add");
  const [chosenLocation, setChosenLocation] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const activeLevels = detail.levels.filter((level) => level.active);
  // Derived default: first active location until the admin picks one.
  const locationId = activeLevels.some((level) => level.locationId === chosenLocation) ? chosenLocation : (activeLevels[0]?.locationId ?? "");
  const at = (id: string) => detail.levels.find((level) => level.locationId === id)?.quantity ?? 0;
  const nameOf = (id: string) => detail.levels.find((level) => level.locationId === id)?.name ?? id;

  const quantity = Number(values.quantity);
  const counted = Number(values.newQuantity);
  const locationBefore = at(locationId);
  const delta = type === "add" ? quantity : type === "reduce" || type === "transfer" ? -quantity : counted - locationBefore;
  const locationAfter = locationBefore + delta;
  const toBefore = at(toLocationId);
  const toAfter = toBefore + quantity;
  const totalAfter = detail.total + (type === "transfer" ? 0 : delta);

  const set = (key: keyof typeof EMPTY) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  };

  function validate() {
    const next: Record<string, string> = {};
    if (!locationId) next.locationId = "Choose a location.";
    if (type === "transfer") {
      if (!toLocationId) next.toLocationId = "Choose the destination location.";
      else if (toLocationId === locationId) next.toLocationId = "Choose a different destination location.";
    }
    if (type === "adjustment") {
      if (!isWhole(values.newQuantity) || counted > 100_000) next.newQuantity = "Enter the counted quantity (a whole number, 0 or more).";
      else if (counted === locationBefore) next.newQuantity = "The counted quantity matches the current stock.";
    } else if (!isWhole(values.quantity) || quantity < 1 || quantity > 100_000) {
      next.quantity = "Enter a whole number of at least 1.";
    } else if ((type === "reduce" || type === "transfer") && quantity > locationBefore) {
      next.quantity = `Only ${locationBefore} in stock at ${nameOf(locationId)}.`;
    }
    if (!values.reason.trim()) next.reason = "A reason is required for every manual stock change.";
    else if (values.reason.trim().length > 500) next.reason = "Must be 500 characters or fewer.";
    if (values.referenceLabel.trim().length > 80) next.referenceLabel = "Must be 80 characters or fewer.";
    return next;
  }

  function review(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setConflict(false);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length === 0) {
      setConfirmError(null);
      setConfirmOpen(true);
    }
  }

  async function submit() {
    setPending(true);
    setConfirmError(null);
    try {
      const result = await adminApi.post<{ movement: StockMovement; inventory: InventoryDetail }>(`/inventory/${detail.product.id}/movements`, {
        type,
        locationId,
        ...(type === "transfer" ? { toLocationId } : {}),
        ...(type === "adjustment" ? { newQuantity: counted } : { quantity }),
        reason: values.reason.trim(),
        ...(values.referenceLabel.trim() ? { referenceLabel: values.referenceLabel.trim() } : {}),
        expectedVersion: detail.stockVersion,
      });
      setConfirmOpen(false);
      setValues(EMPTY);
      setErrors({});
      toast({ title: "Stock updated", description: `${detail.product.name}: total ${result.movement.totalBefore} → ${result.movement.totalAfter}`, tone: "success" });
      onUpdated(result.inventory);
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 409) {
        setConfirmOpen(false);
        setConflict(true);
        onConflict();
      } else if (caught instanceof AdminApiError && caught.fieldErrors && Object.keys(caught.fieldErrors).length) {
        setConfirmOpen(false);
        setErrors(caught.fieldErrors);
        const known = ["locationId", "toLocationId", "quantity", "newQuantity", "reason", "referenceLabel"];
        const unknown = Object.entries(caught.fieldErrors).filter(([key]) => !known.includes(key));
        setFormError(unknown.length ? unknown.map(([, message]) => message).join(" ") : caught.message);
      } else {
        setConfirmError(errorMessage(caught));
      }
    } finally {
      setPending(false);
    }
  }

  if (activeLevels.length === 0) {
    return (
      <Panel title="Stock transaction">
        <InlineAlert tone="warning">There are no active stock locations. Activate a location in Settings first.</InlineAlert>
      </Panel>
    );
  }

  const selectedType = typeOptions.find((option) => option.value === type)!;

  return (
    <Panel title="Stock transaction" description="Every change is recorded in the movement history with your name and reason.">
      {conflict && (
        <InlineAlert tone="warning" className="mb-4">
          Stock changed since you opened this page. The latest quantities have been loaded — review them and submit again.
        </InlineAlert>
      )}
      {formError && <InlineAlert className="mb-4">{formError}</InlineAlert>}
      <form onSubmit={review} noValidate className="grid gap-4 sm:grid-cols-2">
        <SelectInput
          label="Transaction type"
          required
          value={type}
          onChange={(event) => {
            setType(event.target.value as TransactionType);
            setErrors({});
          }}
          options={typeOptions}
          hint={selectedType.hint}
          containerClassName="sm:col-span-2"
        />
        <SelectInput
          label={type === "transfer" ? "From location" : "Location"}
          required
          value={locationId}
          onChange={(event) => setChosenLocation(event.target.value)}
          options={activeLevels.map((level) => ({ value: level.locationId, label: `${level.name} (${number(level.quantity)} in stock)` }))}
          error={errors.locationId}
        />
        {type === "transfer" && (
          <SelectInput
            label="To location"
            required
            value={toLocationId}
            onChange={(event) => setToLocationId(event.target.value)}
            placeholder="Choose destination"
            options={activeLevels.filter((level) => level.locationId !== locationId).map((level) => ({ value: level.locationId, label: `${level.name} (${number(level.quantity)} in stock)` }))}
            error={errors.toLocationId}
          />
        )}
        {type === "adjustment" ? (
          <NumberInput label="Counted quantity" required min={0} step="1" inputMode="numeric" value={values.newQuantity} onChange={set("newQuantity")} error={errors.newQuantity} hint={`Currently ${locationBefore} at ${nameOf(locationId)}.`} />
        ) : (
          <NumberInput label="Quantity" required min={1} step="1" inputMode="numeric" value={values.quantity} onChange={set("quantity")} error={errors.quantity} hint={`Currently ${locationBefore} at ${nameOf(locationId)}.`} />
        )}
        <TextInput label="Reference" value={values.referenceLabel} onChange={set("referenceLabel")} maxLength={80} placeholder="e.g. Repair slip #221" error={errors.referenceLabel} hint="Optional" />
        <TextArea label="Reason" required rows={3} maxLength={500} value={values.reason} onChange={set("reason")} error={errors.reason} containerClassName="sm:col-span-2" placeholder="Why is this stock changing?" />
        <div className="flex justify-end sm:col-span-2">
          <AdminButton type="submit" variant="primary">
            Review change
          </AdminButton>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !pending && setConfirmOpen(false)}
        onConfirm={submit}
        pending={pending}
        error={confirmError}
        title={`Confirm ${selectedType.label.toLowerCase()}`}
        confirmLabel="Record stock change"
        tone={delta < 0 && type !== "transfer" ? "danger" : "primary"}
      >
        <dl className="divide-y divide-line border border-line text-[0.875rem]">
          <PreviewRow label={nameOf(locationId)} before={locationBefore} after={locationAfter} />
          {type === "transfer" && toLocationId && <PreviewRow label={nameOf(toLocationId)} before={toBefore} after={toAfter} />}
          <PreviewRow label="Total stock" before={detail.total} after={totalAfter} strong />
        </dl>
        <p className="mt-3 text-[0.8125rem] text-ink-soft">
          <span className="font-medium text-ink">Reason:</span> {values.reason.trim()}
          {values.referenceLabel.trim() && (
            <>
              <br />
              <span className="font-medium text-ink">Reference:</span> {values.referenceLabel.trim()}
            </>
          )}
        </p>
        <p className="mt-2 text-[0.75rem] text-muted">Quantities are based on the stock loaded on this page. If stock has changed since, the change will be rejected.</p>
      </ConfirmDialog>
    </Panel>
  );
}

function PreviewRow({ label, before, after, strong }: { label: string; before: number; after: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className={strong ? "font-medium text-ink" : "text-ink-soft"}>{label}</dt>
      <dd className="tabular-nums">
        {number(before)} → <span className={after < before ? "font-medium text-danger" : after > before ? "font-medium text-success" : "font-medium"}>{number(after)}</span>
      </dd>
    </div>
  );
}
