"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { ExpenseAttachments } from "@/components/admin/expenses/ExpenseAttachments";
import { ExpenseForm } from "@/components/admin/expenses/ExpenseForm";
import { useExpenseCategories, useExpenseSettings } from "@/components/admin/expenses/hooks";
import { categoryLabel, methodLabel, type ExpenseDetail } from "@/components/admin/expenses/types";
import { TextArea, TextInput } from "@/components/admin/fields";
import { EditIcon, TrashIcon } from "@/components/admin/icons";
import { AdminButton, ConfirmDialog, ErrorState, InlineAlert, KeyValue, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDate, formatDateTime, humanize, money, percent } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";

type DialogKind = "submit" | "approve" | "reject" | "paid" | "delete";
type TransitionAction = "submit" | "approve" | "reject" | "mark-paid";

const back = { href: "/admin/expenses", label: "Expenses" };

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { admin, can } = useAdmin();
  const settings = useExpenseSettings();
  const categories = useExpenseCategories();
  const resource = useAdminResource<ExpenseDetail>(`/expenses/${id}`);
  const expense = resource.latest;

  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<{ kind: DialogKind; open: boolean }>({ kind: "submit", open: false });
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const transition = useMutation((action: TransitionAction, body: Record<string, unknown>) => adminApi.post<ExpenseDetail>(`/expenses/${id}/${action}`, body));
  const removal = useMutation(async () => {
    await adminApi.del(`/expenses/${id}`);
    return true;
  });

  if (resource.error && !expense) {
    return (
      <>
        <PageHeader title="Expense" back={back} />
        <ErrorState error={resource.error} onRetry={resource.error.status === 404 ? undefined : resource.reload} />
      </>
    );
  }
  if (!expense) {
    return (
      <>
        <PageHeader title="Expense" back={back} />
        <LoadingBlock rows={8} />
      </>
    );
  }

  const canApprove = can("expenses:approve");
  const canModify = can("expenses:create") && (expense.createdById === admin.id || canApprove);
  const editable = expense.status === "draft" || expense.status === "rejected";
  const pending = transition.pending || removal.pending;
  const category = categories.latest?.find((item) => item.id === expense.categoryId);

  if (editing) {
    return (
      <>
        <PageHeader title={`Edit ${expense.expenseNumber}`} back={back} meta={<StatusBadge status={expense.status} />} />
        <ExpenseForm
          expense={expense}
          onSaved={(updated) => {
            resource.setData(updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </>
    );
  }

  function open(kind: DialogKind) {
    transition.clearError();
    removal.clearError();
    setNote("");
    setPaidAt("");
    setLocalError(null);
    setDialog({ kind, open: true });
  }

  function close() {
    if (!pending) setDialog((current) => ({ ...current, open: false }));
  }

  async function runTransition(action: TransitionAction, body: Record<string, unknown>, success: (result: ExpenseDetail) => string) {
    const result = await transition.run(action, body);
    if (!result) return;
    resource.setData(result);
    setDialog((current) => ({ ...current, open: false }));
    toast({ title: success(result), tone: "success" });
  }

  async function confirm() {
    if (!expense) return;
    switch (dialog.kind) {
      case "submit":
        await runTransition("submit", {}, (result) => (result.status === "approved" ? "Expense approved (approvals are off in Settings)" : "Submitted for approval"));
        return;
      case "approve":
        await runTransition("approve", note.trim() ? { note: note.trim() } : {}, () => "Expense approved");
        return;
      case "reject":
        if (!note.trim()) {
          setLocalError("Enter a reason for rejecting this expense.");
          return;
        }
        await runTransition("reject", { note: note.trim() }, () => "Expense rejected");
        return;
      case "paid": {
        let body: Record<string, unknown> = {};
        if (paidAt) {
          const iso = `${paidAt.slice(0, 16)}:00+05:30`;
          const time = new Date(iso).getTime();
          if (Number.isNaN(time)) {
            setLocalError("Enter a valid payment date and time.");
            return;
          }
          if (time > Date.now()) {
            setLocalError("The payment time can't be in the future.");
            return;
          }
          body = { paidAt: iso };
        }
        setLocalError(null);
        await runTransition("mark-paid", body, () => "Marked as paid");
        return;
      }
      case "delete": {
        const deleted = await removal.run();
        if (deleted) {
          toast({ title: `${expense.expenseNumber} deleted`, tone: "success" });
          router.push("/admin/expenses");
        }
        return;
      }
    }
  }

  const noReceipt = expense.attachments.length === 0 ? " No receipt is attached yet." : "";
  const dialogs: Record<DialogKind, { title: string; description: string; confirmLabel: string }> = {
    submit: {
      title: `Submit ${expense.expenseNumber}?`,
      confirmLabel: settings.approvalRequired === false ? "Submit & approve" : "Submit",
      description:
        (settings.approvalRequired === false
          ? "Approvals are turned off in Settings → Expenses, so this expense is approved as soon as it's submitted."
          : settings.approvalRequired === true
            ? "It goes to an approver and can't be edited unless it's rejected."
            : "Depending on Settings → Expenses it goes to an approver or is approved automatically. It can't be edited afterwards unless it's rejected.") + noReceipt,
    },
    approve: {
      title: `Approve ${expense.expenseNumber}?`,
      confirmLabel: "Approve",
      description: `${money(expense.totalAmount)} to ${expense.payee}. Approved expenses count towards expense totals and can then be marked as paid.${noReceipt}`,
    },
    reject: {
      title: `Reject ${expense.expenseNumber}?`,
      confirmLabel: "Reject",
      description: "The creator can edit the expense and submit it again. A reason is required.",
    },
    paid: {
      title: `Mark ${expense.expenseNumber} as paid?`,
      confirmLabel: "Mark paid",
      description: `Records ${money(expense.totalAmount)} to ${expense.payee} as paid${expense.paymentSource ? ` from ${expense.paymentSource}` : ""} by ${methodLabel(expense.paymentMethod)}. This can't be undone.`,
    },
    delete: {
      title: `Delete ${expense.expenseNumber}?`,
      confirmLabel: "Delete draft",
      description: "This draft and its attachments will be permanently deleted. This can't be undone.",
    },
  };
  const config = dialogs[dialog.kind];

  const actions = (
    <>
      {editable && canModify && (
        <AdminButton onClick={() => setEditing(true)}>
          <EditIcon size={15} />
          Edit
        </AdminButton>
      )}
      {expense.status === "draft" && canModify && (
        <>
          <AdminButton variant="danger" onClick={() => open("delete")}>
            <TrashIcon size={15} />
            Delete
          </AdminButton>
          <AdminButton variant="primary" onClick={() => open("submit")}>
            Submit
          </AdminButton>
        </>
      )}
      {expense.status === "submitted" && canApprove && (
        <>
          <AdminButton variant="danger" onClick={() => open("reject")}>
            Reject
          </AdminButton>
          <AdminButton variant="primary" onClick={() => open("approve")}>
            Approve
          </AdminButton>
        </>
      )}
      {expense.status === "approved" && canApprove && (
        <AdminButton variant="primary" onClick={() => open("paid")}>
          Mark paid
        </AdminButton>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        title={expense.expenseNumber}
        description={expense.description}
        back={back}
        actions={actions}
        meta={
          <>
            <StatusBadge status={expense.status} />
            <span className="text-[0.8125rem] text-muted">
              {formatDate(expense.expenseDate)} · {money(expense.totalAmount)}
            </span>
            {expense.recurringId && <StatusBadge status="recurring" label="From recurring" tone="info" />}
          </>
        }
      />

      <div className="mb-6 space-y-3">
        {expense.status === "rejected" && (
          <InlineAlert tone="danger">
            Rejected by {expense.decidedByName ?? "an approver"} on {formatDateTime(expense.decidedAt)}
            {expense.decisionNote ? `: “${expense.decisionNote}”` : "."}
            {canModify && " Edit the expense to revise it, then submit it again."}
          </InlineAlert>
        )}
        {expense.status === "draft" && canModify && <InlineAlert tone="info">This is a draft. Attach the receipt below, then submit it.</InlineAlert>}
        {expense.status === "submitted" && !canApprove && <InlineAlert tone="warning">Waiting for an approver to review this expense.</InlineAlert>}
        {expense.status === "approved" && !canApprove && <InlineAlert tone="info">Approved. An approver will mark it as paid once the payment is made.</InlineAlert>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Details">
            <KeyValue
              items={[
                { label: "Expense date", value: formatDate(expense.expenseDate) },
                { label: "Category", value: category ? categoryLabel(category) : expense.categoryName },
                { label: "Description", value: expense.description },
                { label: "Reference number", value: expense.referenceNumber },
                { label: "Payee", value: expense.payee },
                { label: "Vendor", value: expense.vendorName, hidden: !expense.vendorId },
                { label: "Payment method", value: methodLabel(expense.paymentMethod) },
                { label: "Payment source", value: expense.paymentSource },
                { label: "Amount", value: money(expense.amount) },
                { label: "Tax amount", value: money(expense.taxAmount), hidden: expense.taxAmount === null },
                { label: "GST rate", value: percent(expense.gstRate), hidden: expense.gstRate === null },
                { label: "Total", value: <span className="font-medium">{money(expense.totalAmount)}</span> },
                {
                  label: "Recurring source",
                  value: (
                    <Link href="/admin/expenses/recurring" className="text-champagne-deep hover:underline">
                      {expense.recurringTitle ?? "Recurring template"}
                    </Link>
                  ),
                  hidden: !expense.recurringId,
                },
                { label: "Notes", value: <span className="whitespace-pre-line">{expense.notes}</span>, hidden: !expense.notes },
              ]}
            />
          </Panel>

          <ExpenseAttachments
            expense={expense}
            canUpload={can("expenses:create")}
            canRemove={editable && canModify}
            onChange={(updated) => resource.setData(updated)}
          />
        </div>

        <div className="space-y-6">
          <Panel title="Approval & payment">
            <KeyValue
              columns={1}
              items={[
                { label: "Status", value: <StatusBadge status={expense.status} /> },
                { label: "Created by", value: `${expense.createdByName} · ${formatDateTime(expense.createdAt)}` },
                { label: "Submitted", value: formatDateTime(expense.submittedAt), hidden: !expense.submittedAt },
                {
                  label: expense.decision === "rejected" ? "Rejected by" : "Approved by",
                  value: `${expense.decidedByName ?? "—"} · ${formatDateTime(expense.decidedAt)}`,
                  hidden: !expense.decision,
                },
                { label: "Decision note", value: expense.decisionNote, hidden: !expense.decisionNote },
                { label: "Paid", value: `${formatDateTime(expense.paidAt)}${expense.paidByName ? ` · recorded by ${expense.paidByName}` : ""}`, hidden: !expense.paidAt },
              ]}
            />
            {expense.status === "draft" && settings.approvalRequired === false && (
              <p className="mt-4 text-[0.75rem] text-muted">Approvals are off in Settings → Expenses: submitting approves the expense immediately.</p>
            )}
          </Panel>

          <Panel title="Activity">
            {expense.events.length === 0 ? (
              <p className="text-[0.8125rem] text-muted">No activity recorded yet.</p>
            ) : (
              <ol className="space-y-4 border-l border-line pl-4">
                {expense.events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-champagne" aria-hidden="true" />
                    <p className="text-[0.8125rem] text-ink">
                      <span className="font-medium">{humanize(event.action)}</span> · {event.actorName}
                    </p>
                    {event.note && <p className="break-words text-[0.8125rem] text-ink-soft">{event.note}</p>}
                    <p className="text-[0.75rem] text-muted">{formatDateTime(event.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={dialog.open}
        onClose={close}
        onConfirm={confirm}
        title={config.title}
        description={config.description}
        confirmLabel={config.confirmLabel}
        tone={dialog.kind === "delete" || dialog.kind === "reject" ? "danger" : "primary"}
        pending={pending}
        error={localError ?? transition.error?.message ?? removal.error?.message ?? null}
        confirmDisabled={dialog.kind === "reject" && !note.trim()}
      >
        {(dialog.kind === "approve" || dialog.kind === "reject") && (
          <TextArea
            label={dialog.kind === "reject" ? "Reason for rejection" : "Note (optional)"}
            required={dialog.kind === "reject"}
            maxLength={500}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            error={transition.fieldErrors.note}
          />
        )}
        {dialog.kind === "paid" && (
          <TextInput
            label="Paid on (optional)"
            type="datetime-local"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            hint="Leave blank to record the current time. Times are in IST."
            error={transition.fieldErrors.paidAt}
          />
        )}
      </ConfirmDialog>
    </>
  );
}
