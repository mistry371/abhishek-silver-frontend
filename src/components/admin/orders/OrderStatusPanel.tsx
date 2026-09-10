"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CheckboxInput, TextArea, TextInput } from "@/components/admin/fields";
import { AdminButton, ConfirmDialog, InlineAlert, Panel, StatusBadge } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { humanize } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { dialogError } from "./errors";
import type { OrderDetail, OrderStatus } from "./types";

const actionLabels: Record<OrderStatus, string> = {
  new: "Mark new",
  confirmed: "Confirm order",
  processing: "Start processing",
  packed: "Mark packed",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  completed: "Complete order",
  cancelled: "Cancel order",
  returned: "Mark returned",
  refunded: "Mark refunded",
};

interface StatusBody {
  status: OrderStatus;
  note?: string;
  carrier?: string;
  trackingNumber?: string;
  restock?: boolean;
}

function StatusChangeDialog({ order, status, onClose, onDone }: { order: OrderDetail; status: OrderStatus; onClose: () => void; onDone: (order: OrderDetail) => void }) {
  const [note, setNote] = useState("");
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const [restock, setRestock] = useState(true);
  const mutation = useMutation((body: StatusBody) => adminApi.post<OrderDetail>(`/orders/${order.id}/status`, body));

  const cancelling = status === "cancelled";
  const shipping = status === "shipped";
  const hasReceivedReturn = order.returns.some((ret) => ret.status === "received" || ret.status === "closed");

  async function confirm() {
    const result = await mutation.run({
      status,
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(shipping ? { carrier: carrier.trim(), trackingNumber: trackingNumber.trim() } : {}),
      ...(cancelling ? { restock: order.stockCommitted && restock } : {}),
    });
    if (!result) return;
    toast({ title: `${order.orderNumber} is now ${humanize(result.status).toLowerCase()}`, tone: "success" });
    onDone(result);
  }

  const fieldErrors = mutation.fieldErrors;

  return (
    <ConfirmDialog
      open
      onClose={mutation.pending ? () => undefined : onClose}
      onConfirm={confirm}
      title={actionLabels[status]}
      description={
        <>
          Move {order.orderNumber} from <strong>{humanize(order.status)}</strong> to <strong>{humanize(status)}</strong>.
        </>
      }
      confirmLabel={actionLabels[status]}
      tone={cancelling ? "danger" : "primary"}
      pending={mutation.pending}
      error={dialogError(mutation.error, (key) => ["note", "carrier", "trackingNumber", "restock"].includes(key))}
    >
      <div className="space-y-4">
        {status === "confirmed" && order.payment.status !== "paid" && (
          <InlineAlert tone="warning">Payment is {humanize(order.payment.status).toLowerCase()}. Only paid orders can be confirmed.</InlineAlert>
        )}
        {status === "returned" && !hasReceivedReturn && <InlineAlert tone="warning">Record a return and mark it received before marking the order returned.</InlineAlert>}
        {status === "refunded" && order.refundedAmount <= 0 && <InlineAlert tone="warning">Process a refund for this order before marking it refunded.</InlineAlert>}
        {cancelling && order.payment.status === "paid" && <InlineAlert tone="info">Cancelling doesn&apos;t return the customer&apos;s money. Create and process a refund afterwards.</InlineAlert>}

        {shipping && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Carrier" maxLength={80} value={carrier} onChange={(event) => setCarrier(event.target.value)} error={fieldErrors.carrier} placeholder="e.g. Blue Dart" />
            <TextInput label="Tracking number" maxLength={80} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} error={fieldErrors.trackingNumber} />
          </div>
        )}

        {cancelling && (
          <CheckboxInput
            label="Put the items back into stock"
            description={order.stockCommitted ? "Stock was deducted when this order was paid; this adds it back." : "No stock was deducted for this order, so there is nothing to restock."}
            checked={order.stockCommitted && restock}
            disabled={!order.stockCommitted}
            onChange={(event) => setRestock(event.target.checked)}
          />
        )}

        <TextArea
          label="Note for the customer"
          hint="Visible to the customer in their order timeline."
          rows={3}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={fieldErrors.note}
        />
      </div>
    </ConfirmDialog>
  );
}

export function OrderStatusPanel({ order, onUpdated }: { order: OrderDetail; onUpdated: (order: OrderDetail) => void }) {
  const { can } = useAdmin();
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const allowed = can("orders:update_status");
  const firstForward = order.allowedTransitions.find((status) => status !== "cancelled");

  return (
    <Panel title="Status workflow">
      <div className="flex items-center gap-2 text-[0.8125rem] text-muted">
        Current <StatusBadge status={order.status} />
      </div>
      {order.allowedTransitions.length === 0 ? (
        <p className="mt-3 text-[0.8125rem] text-muted">This order has reached a final status.</p>
      ) : !allowed ? (
        <p className="mt-3 text-[0.8125rem] text-muted">Your role can&apos;t change order status.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {order.allowedTransitions.map((status) => (
            <AdminButton key={status} size="sm" variant={status === "cancelled" ? "danger" : status === firstForward ? "primary" : "secondary"} onClick={() => setTarget(status)}>
              {actionLabels[status]}
            </AdminButton>
          ))}
        </div>
      )}
      {target && (
        <StatusChangeDialog
          key={target}
          order={order}
          status={target}
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
