"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CheckboxInput, SelectInput, TextArea } from "@/components/admin/fields";
import { AdminButton, ConfirmDialog } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import { dialogError } from "./errors";
import { RETURN_TRANSITIONS, type OrderDetail, type ReturnStatus, type ReturnTargetStatus, type StockLocation } from "./types";

export interface ReturnActionTarget {
  returnId: string;
  returnNumber: string;
  status: ReturnTargetStatus;
}

const actionLabels: Record<ReturnTargetStatus, string> = {
  approved: "Approve",
  rejected: "Reject",
  received: "Mark received",
  closed: "Close",
};

const doneLabels: Record<ReturnTargetStatus, string> = {
  approved: "approved",
  rejected: "rejected",
  received: "marked as received",
  closed: "closed",
};

const titles: Record<ReturnTargetStatus, string> = {
  approved: "Approve return",
  rejected: "Reject return",
  received: "Mark return as received",
  closed: "Close return",
};

/** Buttons for the allowed next statuses of a return. Hidden without `orders:returns`. */
export function ReturnActions({
  ret,
  onAction,
}: {
  ret: { id: string; returnNumber: string; status: ReturnStatus };
  onAction: (target: ReturnActionTarget) => void;
}) {
  const { can } = useAdmin();
  const next = RETURN_TRANSITIONS[ret.status] ?? [];
  if (!can("orders:returns") || next.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {next.map((status) => (
        <AdminButton
          key={status}
          size="sm"
          variant={status === "rejected" ? "danger" : status === "closed" ? "ghost" : "secondary"}
          onClick={() => onAction({ returnId: ret.id, returnNumber: ret.returnNumber, status })}
        >
          {actionLabels[status]}
        </AdminButton>
      ))}
    </div>
  );
}

/**
 * Confirms a return status change. Render it only while a target is set
 * (`{target && <ReturnStatusDialog key=… />}`) so its form state starts fresh.
 */
export function ReturnStatusDialog({ target, onClose, onDone }: { target: ReturnActionTarget; onClose: () => void; onDone: (order: OrderDetail) => void }) {
  const { can } = useAdmin();
  const [note, setNote] = useState("");
  const [restock, setRestock] = useState(true);
  const [locationId, setLocationId] = useState("");
  const receiving = target.status === "received";

  // Location list is optional: without inventory access (403) the server picks the default location.
  const locations = useAdminResource<StockLocation[]>(receiving && restock && can("inventory:view") ? "/locations" : null);
  const activeLocations = locations.data?.filter((location) => location.active) ?? [];

  const mutation = useMutation((body: { status: ReturnTargetStatus; restock: boolean; locationId?: string; note?: string }) =>
    adminApi.post<OrderDetail>(`/returns/${target.returnId}/status`, body),
  );

  async function confirm() {
    const result = await mutation.run({
      status: target.status,
      restock: receiving ? restock : false,
      ...(receiving && restock && locationId ? { locationId } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    if (!result) return;
    toast({ title: `${target.returnNumber} ${doneLabels[target.status]}`, tone: "success" });
    onDone(result);
  }

  const fieldErrors = mutation.fieldErrors;

  return (
    <ConfirmDialog
      open
      onClose={mutation.pending ? () => undefined : onClose}
      onConfirm={confirm}
      title={titles[target.status]}
      description={
        target.status === "rejected"
          ? `Reject ${target.returnNumber}? Rejected items no longer count as returned.`
          : target.status === "received"
            ? `Record that the items for ${target.returnNumber} have arrived back. If the order can move to “Returned”, it will.`
            : target.status === "closed"
              ? `Close ${target.returnNumber}. Closed returns can't be changed.`
              : `Approve ${target.returnNumber} so the customer can send the items back.`
      }
      confirmLabel={titles[target.status]}
      tone={target.status === "rejected" ? "danger" : "primary"}
      pending={mutation.pending}
      error={dialogError(mutation.error, (key) => key === "note" || key === "locationId")}
    >
      <div className="space-y-4">
        {receiving && (
          <>
            <CheckboxInput
              label="Put the returned items back into stock"
              description="Adds a stock movement for every returned product."
              checked={restock}
              onChange={(event) => setRestock(event.target.checked)}
            />
            {restock && locations.data && !locations.error && (
              <SelectInput
                label="Restock location"
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                placeholder="Order's fulfilment location (default)"
                options={activeLocations.map((location) => ({ value: location.id, label: location.name }))}
                error={fieldErrors.locationId}
              />
            )}
          </>
        )}
        <TextArea label="Note" hint="Internal. Appended to the return's notes." rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} error={fieldErrors.note} />
      </div>
    </ConfirmDialog>
  );
}
