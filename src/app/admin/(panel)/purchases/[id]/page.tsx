"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CheckboxInput, TextArea } from "@/components/admin/fields";
import { historyLabel, metalPurity } from "@/components/admin/inventory/options";
import { PurchaseForm } from "@/components/admin/inventory/PurchaseForm";
import type { PurchaseDetail, PurchaseItem } from "@/components/admin/inventory/types";
import { AdminButton, AdminDialog, ConfirmDialog, DataTable, ErrorState, InlineAlert, KeyValue, LoadingBlock, PageHeader, Panel, StatusBadge, type Column } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { AdminApiError, adminApi, errorMessage } from "@/lib/admin/client";
import { formatDate, formatDateTime, money, number, weight } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

const back = { href: "/admin/purchases", label: "Purchases" };

type DialogKind = "submit" | "approve" | "cancel" | null;

const itemColumns: Column<PurchaseItem>[] = [
  { key: "position", header: "#", cell: (item) => <span className="text-muted">{item.position + 1}</span> },
  {
    key: "item",
    header: "Item",
    cell: (item) => (
      <span className="block min-w-[12rem]">
        <span className="block font-medium">{item.description}</span>
        {item.productId ? (
          <Link href={`/admin/products/${item.productId}`} className="block text-[0.75rem] text-champagne-deep hover:underline">
            {item.productName ?? "Linked product"}
            {item.productSku && ` · ${item.productSku}`}
          </Link>
        ) : (
          <StatusBadge status="unlinked" label="Not linked to a product" tone="warning" className="mt-1" />
        )}
        {item.sku && <span className="block text-[0.75rem] text-muted">Invoice SKU: {item.sku}</span>}
      </span>
    ),
  },
  { key: "metal", header: "Metal / purity", cell: (item) => <span className="whitespace-nowrap">{metalPurity(item.metal, item.purity)}</span> },
  { key: "quantity", header: "Qty", align: "right", cell: (item) => number(item.quantity) },
  { key: "gross", header: "Gross", align: "right", priority: "low", cell: (item) => <span className="whitespace-nowrap">{weight(item.grossWeight)}</span> },
  { key: "net", header: "Net", align: "right", cell: (item) => <span className="whitespace-nowrap">{weight(item.netWeight)}</span> },
  { key: "rate", header: "Rate / g", align: "right", cell: (item) => <span className="whitespace-nowrap">{money(item.ratePerGram)}</span> },
  { key: "making", header: "Making", align: "right", priority: "low", cell: (item) => money(item.makingCharges) },
  { key: "other", header: "Other", align: "right", priority: "low", cell: (item) => money(item.otherCharges) },
  { key: "lineTotal", header: "Line total", align: "right", cell: (item) => <span className="whitespace-nowrap font-medium">{money(item.lineTotal)}</span> },
];

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const resource = useAdminResource<PurchaseDetail>(`/purchases/${id}`);
  const purchase = resource.latest && resource.latest.id === id ? resource.latest : undefined;

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [updateCost, setUpdateCost] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!purchase) {
    return (
      <>
        <PageHeader title="Purchase" back={back} />
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : <LoadingBlock rows={8} />}
      </>
    );
  }

  const editable = purchase.status === "draft" && can("purchases:create");
  const canApprove = purchase.status === "pending_approval" && can("purchases:approve");
  const canCancel = (purchase.status === "draft" || purchase.status === "pending_approval") && can("purchases:approve");
  const canReopen = purchase.status === "pending_approval" && (can("purchases:create") || can("purchases:approve"));
  const unlinked = purchase.items.filter((item) => !item.productId);

  function open(kind: DialogKind) {
    setActionError(null);
    setReasonError(undefined);
    if (kind === "approve") setUpdateCost(false);
    if (kind === "cancel") setCancelReason("");
    setDialog(kind);
  }

  async function runAction(path: string, body: unknown, success: { title: string; description?: string }) {
    setPending(true);
    setActionError(null);
    try {
      const result = await adminApi.post<PurchaseDetail>(path, body);
      resource.setData(result);
      setDialog(null);
      toast({ ...success, tone: "success" });
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 409) {
        setDialog(null);
        toast({ title: "This purchase changed", description: caught.message, tone: "error" });
        resource.reload();
      } else if (caught instanceof AdminApiError && caught.fieldErrors?.reason) {
        setReasonError(caught.fieldErrors.reason);
      } else {
        setActionError(errorMessage(caught));
        // e.g. "Only draft purchases can be submitted" — someone else acted first.
        if (caught instanceof AdminApiError && caught.status === 422 && !caught.fieldErrors) resource.reload();
      }
    } finally {
      setPending(false);
    }
  }

  const statusNote = (() => {
    if (purchase.status === "approved")
      return (
        <InlineAlert tone="success">
          Approved by {purchase.approvedByName ?? "an approver"} on {formatDateTime(purchase.approvedAt)}. {number(purchase.totalQuantity)} units were added to {purchase.locationName}.
        </InlineAlert>
      );
    if (purchase.status === "cancelled")
      return (
        <InlineAlert tone="info">
          Cancelled by {purchase.cancelledByName ?? "an admin"} on {formatDateTime(purchase.cancelledAt)}.{purchase.cancelReason && <> Reason: {purchase.cancelReason}</>}
        </InlineAlert>
      );
    if (purchase.status === "pending_approval")
      return (
        <InlineAlert tone="warning">
          Submitted {purchase.submittedAt ? `on ${formatDateTime(purchase.submittedAt)}` : ""} and awaiting approval.{" "}
          {canApprove ? "Review the lines below before approving — approval adds stock immediately." : "An admin with approval rights will review it."}
        </InlineAlert>
      );
    if (purchase.status === "draft" && !editable) return <InlineAlert tone="info">This purchase is a draft. You don&apos;t have permission to edit it.</InlineAlert>;
    return null;
  })();

  return (
    <>
      <PageHeader
        title={purchase.purchaseNumber}
        back={back}
        meta={
          <>
            <StatusBadge status={purchase.status} />
            <span className="text-[0.8125rem] text-muted">
              {purchase.vendor.name} · {formatDate(purchase.purchaseDate)}
            </span>
          </>
        }
        actions={
          <>
            {canCancel && (
              <AdminButton variant="danger" onClick={() => open("cancel")}>
                Cancel purchase
              </AdminButton>
            )}
            {canReopen && (
              <AdminButton
                loading={pending && dialog === null}
                onClick={() => runAction(`/purchases/${purchase.id}/reopen`, {}, { title: "Returned to draft", description: `${purchase.purchaseNumber} can be edited again` })}
              >
                Return to draft
              </AdminButton>
            )}
            {canApprove && (
              <AdminButton variant="primary" onClick={() => open("approve")}>
                Approve
              </AdminButton>
            )}
          </>
        }
      />

      <div className="space-y-6">
        {statusNote}
        {resource.error && (
          <InlineAlert>
            {resource.error.message}{" "}
            <button type="button" className="underline" onClick={resource.reload}>
              Retry
            </button>
          </InlineAlert>
        )}
        {purchase.status === "pending_approval" && unlinked.length > 0 && (
          <InlineAlert tone="danger">
            {unlinked.length === 1 ? "1 line isn't" : `${unlinked.length} lines aren't`} linked to a product ({unlinked.map((item) => item.description).join(", ")}). It can&apos;t be approved until every line is linked — use &ldquo;Return to draft&rdquo; to link them, then submit again.
          </InlineAlert>
        )}

        {editable ? (
          <PurchaseForm
            key={purchase.id}
            purchase={purchase}
            onSaved={resource.setData}
            onStale={resource.reload}
            extraActions={({ dirty, saving }) => (
              <AdminButton onClick={() => open("submit")} disabled={dirty || saving} title={dirty ? "Save your changes before submitting" : undefined}>
                Submit for approval
              </AdminButton>
            )}
          />
        ) : (
          <>
            <Panel title="Details">
              <KeyValue
                columns={3}
                items={[
                  { label: "Vendor", value: purchase.vendor.name },
                  { label: "Vendor code", value: purchase.vendor.code },
                  { label: "Vendor GSTIN", value: purchase.vendor.gstin ?? "—" },
                  { label: "Vendor invoice ref", value: purchase.vendorInvoiceRef ?? "—" },
                  { label: "Purchase date", value: formatDate(purchase.purchaseDate) },
                  { label: "Receiving location", value: purchase.locationName },
                  { label: "Created by", value: `${purchase.createdByName} · ${formatDateTime(purchase.createdAt)}` },
                  { label: "Submitted", value: formatDateTime(purchase.submittedAt), hidden: !purchase.submittedAt },
                  { label: "Approved by", value: `${purchase.approvedByName ?? "—"} · ${formatDateTime(purchase.approvedAt)}`, hidden: !purchase.approvedAt },
                  { label: "Cancelled by", value: `${purchase.cancelledByName ?? "—"} · ${formatDateTime(purchase.cancelledAt)}`, hidden: !purchase.cancelledAt },
                  { label: "Cancel reason", value: purchase.cancelReason, hidden: !purchase.cancelReason },
                  { label: "Notes", value: purchase.notes ? <span className="whitespace-pre-line">{purchase.notes}</span> : "—" },
                ]}
              />
            </Panel>
            <section>
              <h2 className="mb-3 text-[0.9375rem] font-medium text-ink">Line items</h2>
              <DataTable columns={itemColumns} rows={purchase.items} getRowKey={(item) => item.id} loading={resource.loading} empty={{ title: "No line items" }} />
            </section>
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Saved totals" description={editable ? "Calculated by the server at the last save." : "Calculated by the server."}>
            <KeyValue
              items={[
                { label: "Total quantity", value: number(purchase.totalQuantity) },
                { label: "Gross weight", value: weight(purchase.totalGrossWeight) },
                { label: "Net weight", value: weight(purchase.totalNetWeight) },
                { label: "Subtotal", value: money(purchase.subtotal) },
                { label: "Tax", value: money(purchase.taxAmount) },
                { label: "Total", value: <span className="font-serif text-[1.375rem] tabular-nums">{money(purchase.total)}</span> },
              ]}
            />
          </Panel>
          <Panel title="History">
            {purchase.history.length === 0 ? (
              <p className="text-[0.8125rem] text-muted">No history recorded.</p>
            ) : (
              <ol className="space-y-3">
                {purchase.history.map((entry, index) => (
                  <li key={`${entry.action}-${entry.createdAt}-${index}`} className="border-l-2 border-line pl-3">
                    <p className="text-[0.8125rem] text-ink">
                      <span className="font-medium">{historyLabel(entry.action)}</span> · {entry.actorName}
                    </p>
                    <p className="text-[0.75rem] text-muted">{formatDateTime(entry.createdAt)}</p>
                    {entry.reason && <p className="mt-0.5 text-[0.8125rem] text-ink-soft">{entry.reason}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={dialog === "submit"}
        onClose={() => !pending && setDialog(null)}
        onConfirm={() => runAction(`/purchases/${purchase.id}/submit`, {}, { title: "Submitted for approval", description: purchase.purchaseNumber })}
        pending={pending}
        error={actionError}
        title="Submit for approval?"
        confirmLabel="Submit for approval"
        description="Approvers will be notified. The purchase can't be edited after it is submitted."
      >
        <SummaryLines purchase={purchase} />
        {unlinked.length > 0 && (
          <InlineAlert tone="warning" className="mt-3">
            {unlinked.length === 1 ? "1 line isn't" : `${unlinked.length} lines aren't`} linked to a product. Approval will be blocked until every line is linked — link them before submitting.
          </InlineAlert>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "approve"}
        onClose={() => !pending && setDialog(null)}
        onConfirm={() => runAction(`/purchases/${purchase.id}/approve`, { updateProductCost: updateCost }, { title: "Purchase approved", description: `${number(purchase.totalQuantity)} units added to ${purchase.locationName}` })}
        pending={pending}
        error={actionError}
        title={`Approve ${purchase.purchaseNumber}?`}
        confirmLabel="Approve and add stock"
        confirmDisabled={unlinked.length > 0}
      >
        <InlineAlert tone="warning">
          Approving immediately adds <strong>{number(purchase.totalQuantity)} units</strong> to <strong>{purchase.locationName}</strong>. Approved purchases can&apos;t be cancelled — corrections must be recorded as stock reductions.
        </InlineAlert>
        <div className="mt-4">
          <SummaryLines purchase={purchase} />
        </div>
        {unlinked.length > 0 && <InlineAlert className="mt-3">Every line must be linked to a product before approval.</InlineAlert>}
        <CheckboxInput
          className="mt-4"
          label="Update product purchase cost"
          description="Sets each linked product's purchase price to its line total ÷ quantity, and assigns this vendor to products that have none."
          checked={updateCost}
          onChange={(event) => setUpdateCost(event.target.checked)}
          disabled={pending}
        />
      </ConfirmDialog>

      <AdminDialog
        open={dialog === "cancel"}
        onClose={() => !pending && setDialog(null)}
        title={`Cancel ${purchase.purchaseNumber}?`}
        description="The purchase stays on record as cancelled and can't be reopened. No stock is changed."
        footer={
          <>
            <AdminButton variant="ghost" onClick={() => setDialog(null)} disabled={pending}>
              Keep purchase
            </AdminButton>
            <AdminButton
              variant="danger"
              loading={pending}
              onClick={() => {
                if (!cancelReason.trim()) {
                  setReasonError("Enter a reason for cancelling.");
                  return;
                }
                runAction(`/purchases/${purchase.id}/cancel`, { reason: cancelReason.trim() }, { title: "Purchase cancelled", description: purchase.purchaseNumber });
              }}
            >
              Cancel purchase
            </AdminButton>
          </>
        }
      >
        <TextArea
          label="Reason"
          required
          rows={3}
          maxLength={500}
          value={cancelReason}
          onChange={(event) => {
            setCancelReason(event.target.value);
            if (reasonError) setReasonError(undefined);
          }}
          error={reasonError}
          placeholder="e.g. Vendor invoice was issued in error"
        />
        {actionError && <InlineAlert className="mt-4">{actionError}</InlineAlert>}
      </AdminDialog>
    </>
  );
}

function SummaryLines({ purchase }: { purchase: PurchaseDetail }): ReactNode {
  return (
    <div className="border border-line">
      <ul className="max-h-48 divide-y divide-line overflow-y-auto text-[0.8125rem]">
        {purchase.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0 truncate">{item.productName ?? item.description}</span>
            <span className="shrink-0 tabular-nums text-muted">× {number(item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-line bg-cream/50 px-3 py-2 text-[0.8125rem]">
        <span>{purchase.vendor.name}</span>
        <span className="font-medium tabular-nums">{money(purchase.total)}</span>
      </div>
    </div>
  );
}
