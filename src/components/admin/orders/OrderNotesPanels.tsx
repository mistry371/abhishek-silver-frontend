"use client";

import { useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { SelectInput, TextArea } from "@/components/admin/fields";
import { LockIcon, MessageIcon } from "@/components/icons";
import { AdminButton, AdminDialog, InlineAlert, Panel, StatusBadge } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { dialogError } from "./errors";
import { channelLabels, COMMUNICATION_CHANNELS, type CommunicationChannel, type OrderCommunication, type OrderDetail, type OrderNote } from "./types";

/* ------------------------------------------------------------------ */
/* Internal notes                                                      */
/* ------------------------------------------------------------------ */

export function InternalNotesPanel({ order, onChange }: { order: OrderDetail; onChange: (order: OrderDetail) => void }) {
  const { can } = useAdmin();
  const [body, setBody] = useState("");
  const mutation = useMutation((text: string) => adminApi.post<OrderNote>(`/orders/${order.id}/notes`, { body: text }));
  const canManage = can("orders:manage");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    const note = await mutation.run(body.trim());
    if (!note) return;
    setBody("");
    toast({ title: "Internal note added", tone: "success" });
    onChange({ ...order, internalNotes: [note, ...order.internalNotes] });
  }

  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-2">
          <LockIcon size={14} className="text-champagne-deep" />
          Internal notes
        </span>
      }
      description="Internal – never shown to the customer."
    >
      {canManage && (
        <form onSubmit={submit} className="mb-4 space-y-2">
          <TextArea
            label="Add a note"
            rows={3}
            maxLength={2000}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            error={mutation.fieldErrors.body}
            placeholder="Only admins can see this."
          />
          {mutation.error && !mutation.fieldErrors.body && <InlineAlert>{dialogError(mutation.error)}</InlineAlert>}
          <div className="flex justify-end">
            <AdminButton type="submit" size="sm" variant="primary" loading={mutation.pending} disabled={!body.trim()}>
              Add note
            </AdminButton>
          </div>
        </form>
      )}
      {order.internalNotes.length === 0 ? (
        <p className="text-[0.8125rem] text-muted">No internal notes.</p>
      ) : (
        <ul className="space-y-3">
          {order.internalNotes.map((note) => (
            <li key={note.id} className="border-l-2 border-champagne-soft bg-cream/50 px-3 py-2">
              <p className="whitespace-pre-wrap break-words text-[0.8125rem] text-ink">{note.body}</p>
              <p className="mt-1 text-[0.6875rem] text-muted">
                {note.authorName} · {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/* Customer communications                                             */
/* ------------------------------------------------------------------ */

function LogCommunicationDialog({ order, onClose, onDone }: { order: OrderDetail; onClose: () => void; onDone: (row: OrderCommunication) => void }) {
  const [channel, setChannel] = useState<CommunicationChannel>("phone");
  const [direction, setDirection] = useState<"outbound" | "inbound">("outbound");
  const [summary, setSummary] = useState("");
  const mutation = useMutation((body: { channel: CommunicationChannel; direction: "outbound" | "inbound"; summary: string }) =>
    adminApi.post<OrderCommunication>(`/orders/${order.id}/communications`, body),
  );

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const row = await mutation.run({ channel, direction, summary: summary.trim() });
    if (!row) return;
    toast({ title: "Communication logged", tone: "success" });
    onDone(row);
  }

  const error = dialogError(mutation.error, (key) => ["channel", "direction", "summary"].includes(key));

  return (
    <AdminDialog
      open
      onClose={mutation.pending ? () => undefined : onClose}
      title="Log communication"
      description={`Record a conversation with ${order.customer.name} about ${order.orderNumber}.`}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={() => submit()} loading={mutation.pending} disabled={!summary.trim()}>
            Save
          </AdminButton>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            label="Channel"
            value={channel}
            onChange={(event) => setChannel(event.target.value as CommunicationChannel)}
            options={COMMUNICATION_CHANNELS.map((value) => ({ value, label: channelLabels[value] }))}
            error={mutation.fieldErrors.channel}
          />
          <SelectInput
            label="Direction"
            value={direction}
            onChange={(event) => setDirection(event.target.value as "outbound" | "inbound")}
            options={[
              { value: "outbound", label: "Outbound — we contacted them" },
              { value: "inbound", label: "Inbound — they contacted us" },
            ]}
            error={mutation.fieldErrors.direction}
          />
        </div>
        <TextArea label="Summary" required rows={4} maxLength={1000} value={summary} onChange={(event) => setSummary(event.target.value)} error={mutation.fieldErrors.summary} />
        {error && <InlineAlert>{error}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}

export function CommunicationsPanel({ order, onChange }: { order: OrderDetail; onChange: (order: OrderDetail) => void }) {
  const { can } = useAdmin();
  const [open, setOpen] = useState(false);

  return (
    <Panel
      title="Customer communications"
      description="Calls, messages and emails about this order."
      actions={
        can("orders:manage") ? (
          <AdminButton size="sm" onClick={() => setOpen(true)}>
            <MessageIcon size={14} />
            Log
          </AdminButton>
        ) : undefined
      }
    >
      {order.communications.length === 0 ? (
        <p className="text-[0.8125rem] text-muted">Nothing logged yet.</p>
      ) : (
        <ul className="space-y-3">
          {order.communications.map((row) => (
            <li key={row.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={row.channel} label={channelLabels[row.channel] ?? row.channel} tone="neutral" />
                <StatusBadge status={row.direction} label={row.direction === "inbound" ? "Inbound" : "Outbound"} tone={row.direction === "inbound" ? "info" : "accent"} />
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[0.8125rem] text-ink">{row.summary}</p>
              <p className="mt-1 text-[0.6875rem] text-muted">
                {row.authorName} · {formatDateTime(row.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <LogCommunicationDialog
          order={order}
          onClose={() => setOpen(false)}
          onDone={(row) => {
            setOpen(false);
            onChange({ ...order, communications: [row, ...order.communications] });
          }}
        />
      )}
    </Panel>
  );
}
