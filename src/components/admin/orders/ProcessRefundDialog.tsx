"use client";

import { useState } from "react";
import { SelectInput, TextInput } from "@/components/admin/fields";
import { ConfirmDialog, InlineAlert } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { money } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { dialogError } from "./errors";
import { refundMethodLabels, type OrderDetail, type Refund } from "./types";

export type ProcessRefundTarget = Pick<Refund, "id" | "refundNumber" | "amount" | "method" | "reference">;

/**
 * Marks a pending refund processed or failed. Render only while a target is
 * set so the form starts fresh each time.
 */
export function ProcessRefundDialog({ refund, onClose, onDone }: { refund: ProcessRefundTarget; onClose: () => void; onDone: (order: OrderDetail) => void }) {
  const [outcome, setOutcome] = useState<"processed" | "failed">("processed");
  const [reference, setReference] = useState(refund.reference ?? "");
  const gateway = refund.method === "original_payment";

  const mutation = useMutation((body: { outcome: "processed" | "failed"; reference?: string }) => adminApi.post<OrderDetail>(`/refunds/${refund.id}/process`, body));

  async function confirm() {
    const result = await mutation.run({ outcome, ...(reference.trim() ? { reference: reference.trim() } : {}) });
    if (!result) return;
    toast({ title: outcome === "processed" ? `${refund.refundNumber} processed` : `${refund.refundNumber} marked as failed`, tone: "success" });
    onDone(result);
  }

  return (
    <ConfirmDialog
      open
      onClose={mutation.pending ? () => undefined : onClose}
      onConfirm={confirm}
      title={`Process ${refund.refundNumber}`}
      description={`${money(refund.amount)} by ${refundMethodLabels[refund.method] ?? refund.method}. This can't be undone.`}
      confirmLabel={outcome === "processed" ? (gateway ? "Refund via gateway" : "Mark processed") : "Mark failed"}
      tone={outcome === "failed" ? "danger" : "primary"}
      pending={mutation.pending}
      error={dialogError(mutation.error, (key) => key === "outcome" || key === "reference")}
    >
      <div className="space-y-4">
        <SelectInput
          label="Outcome"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value as "processed" | "failed")}
          options={[
            { value: "processed", label: "Processed — money sent to the customer" },
            { value: "failed", label: "Failed" },
          ]}
          error={mutation.fieldErrors.outcome}
        />
        {gateway && outcome === "processed" && (
          <InlineAlert tone="warning">The payment gateway will be asked to refund {money(refund.amount)} now. Its refund id is saved as the reference.</InlineAlert>
        )}
        <TextInput
          label="Reference"
          hint={gateway ? "Optional — replaced by the gateway refund id on success." : "UTR, cheque or receipt number."}
          maxLength={120}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          error={mutation.fieldErrors.reference}
        />
      </div>
    </ConfirmDialog>
  );
}
