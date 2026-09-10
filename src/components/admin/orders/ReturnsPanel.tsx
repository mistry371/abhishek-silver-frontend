"use client";

import { useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { controlClass, TextArea } from "@/components/admin/fields";
import { AdminButton, AdminDialog, InlineAlert, Panel, StatusBadge } from "@/components/admin/ui";
import { ReturnIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { dialogError } from "./errors";
import { ReturnActions, ReturnStatusDialog, type ReturnActionTarget } from "./ReturnStatusDialog";
import { RETURNABLE_STATUSES, type OrderDetail } from "./types";

interface ReturnBody {
  reason: string;
  items: { orderItemId: string; quantity: number }[];
  notes?: string;
}

/** Quantity per order item not yet claimed by a (non-rejected) return — mirrors the server's check. */
function returnableQuantities(order: OrderDetail) {
  const used = new Map<string, number>();
  for (const ret of order.returns) {
    if (ret.status === "rejected") continue;
    for (const line of ret.items) used.set(line.orderItemId, (used.get(line.orderItemId) ?? 0) + line.quantity);
  }
  return new Map(order.items.map((item) => [item.id, Math.max(0, item.quantity - (used.get(item.id) ?? 0))]));
}

function CreateReturnDialog({ order, onClose, onDone }: { order: OrderDetail; onClose: () => void; onDone: (order: OrderDetail) => void }) {
  const remaining = returnableQuantities(order);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [submittedIds, setSubmittedIds] = useState<string[]>([]);
  const mutation = useMutation((body: ReturnBody) => adminApi.post<OrderDetail>(`/orders/${order.id}/returns`, body));

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const lines: ReturnBody["items"] = [];
    for (const item of order.items) {
      const raw = (quantities[item.id] ?? "").trim();
      if (!raw) continue;
      const quantity = Number(raw);
      if (!Number.isInteger(quantity) || quantity < 0) {
        setLocalError(`Enter a whole number for ${item.name}.`);
        return;
      }
      if (quantity > (remaining.get(item.id) ?? 0)) {
        setLocalError(`Only ${remaining.get(item.id) ?? 0} of ${item.name} can still be returned.`);
        return;
      }
      if (quantity > 0) lines.push({ orderItemId: item.id, quantity });
    }
    if (!lines.length) {
      setLocalError("Choose at least one item and quantity to return.");
      return;
    }
    if (!reason.trim()) {
      setLocalError("Enter the reason for the return.");
      return;
    }
    setLocalError(null);
    setSubmittedIds(lines.map((line) => line.orderItemId));
    const result = await mutation.run({ reason: reason.trim(), items: lines, ...(notes.trim() ? { notes: notes.trim() } : {}) });
    if (!result) return;
    toast({ title: "Return recorded", description: `${lines.reduce((sum, line) => sum + line.quantity, 0)} item(s) on ${order.orderNumber}`, tone: "success" });
    onDone(result);
  }

  const fieldErrors = mutation.fieldErrors;
  const itemError = (itemId: string) => {
    const index = submittedIds.indexOf(itemId);
    return index < 0 ? undefined : (fieldErrors[`items.${index}.quantity`] ?? fieldErrors[`items.${index}.orderItemId`]);
  };
  const serverError = dialogError(mutation.error, (key) => key === "reason" || key === "notes" || /^items\.\d+\.(quantity|orderItemId)$/.test(key));

  return (
    <AdminDialog
      open
      size="lg"
      onClose={mutation.pending ? () => undefined : onClose}
      title="Record a return"
      description={`Choose the items from ${order.orderNumber} that the customer is sending back.`}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={() => submit()} loading={mutation.pending}>
            Create return
          </AdminButton>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="overflow-x-auto border border-line">
          <table className="w-full text-left text-[0.8125rem]">
            <thead>
              <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                <th scope="col" className="px-3 py-2 font-medium">Item</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Ordered</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Returnable</th>
                <th scope="col" className="w-28 px-3 py-2 text-right font-medium">Return qty</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => {
                const max = remaining.get(item.id) ?? 0;
                const error = itemError(item.id);
                return (
                  <tr key={item.id} className="border-b border-line align-top last:border-0">
                    <td className="px-3 py-2.5">
                      <span className="block text-ink">{item.name}</span>
                      <span className="block text-[0.75rem] text-muted">
                        {item.sku}
                        {item.size ? ` · Size ${item.size}` : ""}
                      </span>
                      {error && (
                        <span role="alert" className="mt-1 block text-[0.75rem] text-danger">
                          {error}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{max}</td>
                    <td className="px-3 py-2.5 text-right">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={max}
                        step={1}
                        disabled={max === 0}
                        aria-label={`Quantity of ${item.name} to return`}
                        placeholder="0"
                        value={quantities[item.id] ?? ""}
                        onChange={(event) => setQuantities((previous) => ({ ...previous, [item.id]: event.target.value }))}
                        className={controlClass(error, "h-9 w-20 text-right tabular-nums")}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TextArea label="Reason" required rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} error={fieldErrors.reason} placeholder="e.g. Size doesn't fit" />
        <TextArea label="Notes" hint="Internal. Condition of the items, pickup arrangements, etc." rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} error={fieldErrors.notes} />
        {(localError || serverError) && <InlineAlert>{localError ?? serverError}</InlineAlert>}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </AdminDialog>
  );
}

export function ReturnsPanel({ order, onUpdated }: { order: OrderDetail; onUpdated: (order: OrderDetail) => void }) {
  const { can } = useAdmin();
  const [creating, setCreating] = useState(false);
  const [target, setTarget] = useState<ReturnActionTarget | null>(null);
  const canReturn = can("orders:returns");
  const returnable = RETURNABLE_STATUSES.includes(order.status);

  return (
    <Panel
      title="Returns"
      description={canReturn && !returnable ? "Returns can be recorded once the order is shipped, delivered or completed." : undefined}
      actions={
        canReturn && returnable ? (
          <AdminButton size="sm" onClick={() => setCreating(true)}>
            <ReturnIcon size={14} />
            Record return
          </AdminButton>
        ) : undefined
      }
      flush
    >
      {order.returns.length === 0 ? (
        <p className="px-5 py-5 text-[0.8125rem] text-muted">No returns for this order.</p>
      ) : (
        <ul className="divide-y divide-line">
          {order.returns.map((ret) => (
            <li key={ret.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-ink">{ret.returnNumber}</span>
                    <StatusBadge status={ret.status} />
                    {ret.restocked && <StatusBadge status="restocked" label={ret.restockLocationId ? `Restocked · ${ret.restockLocationId}` : "Restocked"} tone="success" />}
                  </p>
                  <p className="mt-1 text-[0.75rem] text-muted">
                    {ret.createdByName} · {formatDateTime(ret.createdAt)}
                  </p>
                </div>
                <ReturnActions ret={ret} onAction={setTarget} />
              </div>
              <p className="mt-2 text-[0.8125rem] text-ink">
                <span className="text-muted">Reason:</span> {ret.reason}
              </p>
              <ul className="mt-2 space-y-0.5 text-[0.8125rem] text-ink-soft">
                {ret.items.map((line) => (
                  <li key={line.orderItemId}>
                    {line.name} <span className="text-muted">({line.sku})</span> × {line.quantity}
                  </li>
                ))}
              </ul>
              {ret.notes && <p className="mt-2 whitespace-pre-wrap border-l-2 border-line pl-3 text-[0.75rem] text-muted">{ret.notes}</p>}
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <CreateReturnDialog
          order={order}
          onClose={() => setCreating(false)}
          onDone={(updated) => {
            setCreating(false);
            onUpdated(updated);
          }}
        />
      )}
      {target && (
        <ReturnStatusDialog
          key={`${target.returnId}:${target.status}`}
          target={target}
          onClose={() => setTarget(null)}
          onDone={(updated) => {
            setTarget(null);
            onUpdated(updated);
          }}
        />
      )}
    </Panel>
  );
}
