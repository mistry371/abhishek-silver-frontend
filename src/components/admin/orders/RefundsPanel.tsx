"use client";

import { useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { WalletIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, InlineAlert, KeyValue, Panel, StatusBadge } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDateTime, humanize, money } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { dialogError } from "./errors";
import { ProcessRefundDialog, type ProcessRefundTarget } from "./ProcessRefundDialog";
import { REFUND_METHODS, refundMethodLabels, type OrderDetail, type RefundMethod } from "./types";

interface RefundBody {
  amount: number;
  method: RefundMethod;
  reason: string;
  returnId?: string;
  reference?: string;
}

function CreateRefundDialog({ order, onClose, onDone }: { order: OrderDetail; onClose: () => void; onDone: (order: OrderDetail) => void }) {
  const hasGatewayPayment = Boolean(order.payment.providerPaymentId);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<RefundMethod>(hasGatewayPayment ? "original_payment" : "bank_transfer");
  const [reason, setReason] = useState("");
  const [returnId, setReturnId] = useState("");
  const [reference, setReference] = useState("");
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((body: RefundBody) => adminApi.post<OrderDetail>(`/orders/${order.id}/refunds`, body));

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const value = toNumberOrNull(amount);
    const errors: Record<string, string> = {};
    if (value === null || value <= 0) errors.amount = "Enter an amount greater than zero.";
    else if (Math.round(value * 100) !== value * 100) errors.amount = "Use at most two decimal places.";
    if (!reason.trim()) errors.reason = "Enter the reason for the refund.";
    setLocalErrors(errors);
    if (Object.keys(errors).length || value === null) return;

    const result = await mutation.run({
      amount: value,
      method,
      reason: reason.trim(),
      ...(returnId ? { returnId } : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
    });
    if (!result) return;
    toast({ title: "Refund created", description: `${money(value)} pending processing`, tone: "success" });
    onDone(result);
  }

  const fieldError = (key: string) => localErrors[key] ?? mutation.fieldErrors[key];
  const error = dialogError(mutation.error, (key) => ["amount", "method", "reason", "returnId", "reference"].includes(key));

  return (
    <AdminDialog
      open
      onClose={mutation.pending ? () => undefined : onClose}
      title="Create refund"
      description="The refund is saved as pending. Process it once the money has been sent."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={() => submit()} loading={mutation.pending}>
            Create refund
          </AdminButton>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <KeyValue
          columns={3}
          items={[
            { label: "Order total", value: money(order.totals.grandTotal) },
            { label: "Refunded", value: money(order.refundedAmount) },
            { label: "Pending", value: money(order.pendingRefundAmount) },
          ]}
        />
        <NumberInput label="Amount (₹)" required min={0.01} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} error={fieldError("amount")} />
        <SelectInput
          label="Method"
          value={method}
          onChange={(event) => setMethod(event.target.value as RefundMethod)}
          options={REFUND_METHODS.map((value) => ({
            value,
            label: value === "original_payment" && !hasGatewayPayment ? `${refundMethodLabels[value]} — unavailable` : refundMethodLabels[value],
          }))}
          hint={method === "original_payment" ? "Refunded through the payment gateway when you process it." : undefined}
          error={fieldError("method")}
        />
        {order.returns.length > 0 && (
          <SelectInput
            label="Linked return"
            value={returnId}
            onChange={(event) => setReturnId(event.target.value)}
            placeholder="None"
            options={order.returns.map((ret) => ({ value: ret.id, label: `${ret.returnNumber} · ${humanize(ret.status)}` }))}
            error={fieldError("returnId")}
          />
        )}
        <TextArea label="Reason" required rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} error={fieldError("reason")} />
        {method !== "original_payment" && (
          <TextInput label="Reference" hint="Optional. UTR or receipt number, if already known." maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} error={fieldError("reference")} />
        )}
        {error && <InlineAlert>{error}</InlineAlert>}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </AdminDialog>
  );
}

export function RefundsPanel({ order, onUpdated }: { order: OrderDetail; onUpdated: (order: OrderDetail) => void }) {
  const { can } = useAdmin();
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState<ProcessRefundTarget | null>(null);
  const canRefund = can("orders:refunds");
  const paid = order.payment.status === "paid";

  return (
    <Panel
      title="Refunds"
      description={canRefund && !paid ? "Only paid orders can be refunded." : undefined}
      actions={
        canRefund && paid ? (
          <AdminButton size="sm" onClick={() => setCreating(true)}>
            <WalletIcon size={14} />
            Create refund
          </AdminButton>
        ) : undefined
      }
      flush
    >
      <div className="grid grid-cols-2 gap-4 border-b border-line px-5 py-4">
        <div>
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Refunded</p>
          <p className="mt-1 font-serif text-[1.375rem] tabular-nums text-ink">{money(order.refundedAmount)}</p>
        </div>
        <div>
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Pending</p>
          <p className={`mt-1 font-serif text-[1.375rem] tabular-nums ${order.pendingRefundAmount > 0 ? "text-warning" : "text-ink"}`}>{money(order.pendingRefundAmount)}</p>
        </div>
      </div>
      {order.refunds.length === 0 ? (
        <p className="px-5 py-5 text-[0.8125rem] text-muted">No refunds for this order.</p>
      ) : (
        <ul className="divide-y divide-line">
          {order.refunds.map((refund) => {
            const linkedReturn = refund.returnId ? order.returns.find((ret) => ret.id === refund.returnId) : undefined;
            return (
              <li key={refund.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{refund.refundNumber}</span>
                      <StatusBadge status={refund.status} />
                      <span className="tabular-nums text-ink">{money(refund.amount)}</span>
                    </p>
                    <p className="mt-1 text-[0.75rem] text-muted">
                      {refundMethodLabels[refund.method] ?? humanize(refund.method)} · {refund.createdByName} · {formatDateTime(refund.createdAt)}
                    </p>
                  </div>
                  {refund.status === "pending" && canRefund && (
                    <AdminButton size="sm" onClick={() => setProcessing(refund)}>
                      Process
                    </AdminButton>
                  )}
                </div>
                <p className="mt-2 text-[0.8125rem] text-ink">
                  <span className="text-muted">Reason:</span> {refund.reason}
                </p>
                <p className="mt-1 text-[0.75rem] text-muted">
                  {refund.reference && <>Reference: <span className="break-all text-ink-soft">{refund.reference}</span> · </>}
                  {refund.processedAt && <>Processed {formatDateTime(refund.processedAt)} · </>}
                  {linkedReturn && <>Return {linkedReturn.returnNumber}</>}
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {creating && (
        <CreateRefundDialog
          order={order}
          onClose={() => setCreating(false)}
          onDone={(updated) => {
            setCreating(false);
            onUpdated(updated);
          }}
        />
      )}
      {processing && (
        <ProcessRefundDialog
          key={processing.id}
          refund={processing}
          onClose={() => setProcessing(null)}
          onDone={(updated) => {
            setProcessing(null);
            onUpdated(updated);
          }}
        />
      )}
    </Panel>
  );
}
