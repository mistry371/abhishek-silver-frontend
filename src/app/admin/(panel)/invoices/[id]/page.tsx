"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { TotalsList } from "@/components/admin/billing/TotalsList";
import { methodLabel, paymentMethodOptions, round2, sourceLabel, type InvoiceDetail, type PaymentMethod } from "@/components/admin/billing/types";
import { NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { EditIcon, PrintIcon, WalletIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, AdminLinkButton, ConfirmDialog, ErrorState, InlineAlert, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDate, formatDateTime, humanize, metalLabels, money, percent, purityLabels, weight } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";

type DialogName = "issue" | "payment" | "cancel";

interface DialogProps {
  open: boolean;
  invoice: InvoiceDetail;
  onClose: () => void;
  onDone: (invoice: InvoiceDetail) => void;
}

const th = "whitespace-nowrap px-3 py-2 font-medium";
const td = "px-3 py-2.5";

/** Value for `<input type="datetime-local">` in the browser's time zone. */
function toLocalInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const { data: invoice, error, reload, setData } = useAdminResource<InvoiceDetail>(`/invoices/${id}`);
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [paymentDefaults, setPaymentDefaults] = useState({ amount: "", receivedAt: "" });
  const back = { href: "/admin/invoices", label: "Invoices" };

  if (error) {
    return (
      <>
        <PageHeader title="Invoice" back={back} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }
  if (!invoice) {
    return (
      <>
        <PageHeader title="Invoice" back={back} />
        <LoadingBlock rows={8} />
      </>
    );
  }

  const isDraft = invoice.status === "draft";
  const isManualDraft = isDraft && invoice.source === "manual";
  const canTakePayment = (invoice.status === "issued" || invoice.status === "partially_paid") && invoice.balanceDue > 0;

  const openDialog = (name: DialogName) => {
    setDialogKey((value) => value + 1);
    setDialog(name);
  };
  const openPayment = () => {
    setPaymentDefaults({ amount: String(invoice.balanceDue), receivedAt: toLocalInputValue(new Date()) });
    openDialog("payment");
  };
  const closeDialog = () => setDialog(null);
  const finish = (message: string) => (updated: InvoiceDetail) => {
    setData(updated);
    setDialog(null);
    toast({ title: message, tone: "success" });
  };

  const { seller, customer } = invoice;

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={invoice.invoiceNumber ?? "Draft invoice"}
          description={`${sourceLabel(invoice.source)} invoice for ${customer.name}`}
          back={back}
          meta={
            <>
              <StatusBadge status={invoice.status} />
              {invoice.order && (
                <Link href={`/admin/orders/${invoice.order.id}`} className="text-[0.8125rem] text-champagne-deep hover:underline">
                  Order {invoice.order.orderNumber}
                </Link>
              )}
              {invoice.sale && (
                <Link href={`/admin/sales/${invoice.sale.id}`} className="text-[0.8125rem] text-champagne-deep hover:underline">
                  Sale {invoice.sale.saleNumber}
                </Link>
              )}
            </>
          }
          actions={
            <>
              <AdminButton onClick={() => window.print()}>
                <PrintIcon size={15} />
                Print
              </AdminButton>
              {isManualDraft && can("billing:create") && (
                <AdminLinkButton href={`/admin/billing/${invoice.id}`}>
                  <EditIcon size={15} />
                  Edit draft
                </AdminLinkButton>
              )}
              {isDraft && can("billing:issue") && (
                <AdminButton variant="primary" onClick={() => openDialog("issue")}>
                  Issue invoice
                </AdminButton>
              )}
              {canTakePayment && can("billing:record_payment") && (
                <AdminButton variant="primary" onClick={openPayment}>
                  <WalletIcon size={15} />
                  Record payment
                </AdminButton>
              )}
              {invoice.status !== "cancelled" && can("billing:cancel") && (
                <AdminButton variant="danger" onClick={() => openDialog("cancel")}>
                  Cancel invoice
                </AdminButton>
              )}
            </>
          }
        />
      </div>

      <div className="space-y-6">
        <article className="border border-line bg-porcelain px-5 py-6 text-[0.8125rem] text-ink sm:px-8 sm:py-8 print:border-0 print:bg-transparent print:p-0">
          {isDraft && (
            <InlineAlert tone="warning" className="mb-6">
              Draft: not a valid tax invoice until it is issued.
            </InlineAlert>
          )}
          {invoice.status === "cancelled" && (
            <InlineAlert className="mb-6">
              Cancelled{invoice.cancelReason ? `: ${invoice.cancelReason}` : "."}
            </InlineAlert>
          )}

          <header className="flex flex-col gap-6 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-serif text-[1.5rem] leading-tight">{seller.name || "—"}</p>
              {seller.address && <p className="mt-1 max-w-sm whitespace-pre-line text-ink-soft">{seller.address}</p>}
              <div className="mt-2 space-y-0.5 text-ink-soft">
                {seller.phone && <p>Phone: {seller.phone}</p>}
                {seller.email && <p>Email: {seller.email}</p>}
                {seller.gstin && (
                  <p>
                    GSTIN: <span className="font-medium text-ink">{seller.gstin}</span>
                    {seller.stateCode ? ` · State code ${seller.stateCode}` : ""}
                  </p>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-muted">{isDraft ? "Draft invoice" : "Tax invoice"}</p>
              <p className="mt-1 font-serif text-[1.5rem] leading-tight">{invoice.invoiceNumber ?? "Draft"}</p>
              <dl className="mt-3 grid grid-cols-[auto_auto] justify-start gap-x-4 gap-y-1 sm:justify-end">
                <dt className="text-muted">Status</dt>
                <dd>
                  <StatusBadge status={invoice.status} />
                </dd>
                <dt className="text-muted">Invoice date</dt>
                <dd>{formatDate(invoice.issuedAt)}</dd>
                <dt className="text-muted">Due date</dt>
                <dd>{formatDate(invoice.dueDate)}</dd>
                {invoice.order && (
                  <>
                    <dt className="text-muted">Order</dt>
                    <dd>{invoice.order.orderNumber}</dd>
                  </>
                )}
                {invoice.sale && (
                  <>
                    <dt className="text-muted">Sale</dt>
                    <dd>{invoice.sale.saleNumber}</dd>
                  </>
                )}
              </dl>
            </div>
          </header>

          <section className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-muted">Bill to</p>
              <p className="mt-1 text-[0.9375rem] font-medium">
                {invoice.customerId ? (
                  <Link href={`/admin/customers/${invoice.customerId}`} className="hover:underline print:no-underline">
                    {customer.name}
                  </Link>
                ) : (
                  customer.name
                )}
              </p>
              {customer.address && <p className="mt-0.5 max-w-sm whitespace-pre-line text-ink-soft">{customer.address}</p>}
              <div className="mt-1 space-y-0.5 text-ink-soft">
                {customer.mobile && <p>Mobile: {customer.mobile}</p>}
                {customer.email && <p>Email: {customer.email}</p>}
                {customer.gstin && (
                  <p>
                    GSTIN: <span className="font-medium text-ink">{customer.gstin}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="text-ink-soft sm:text-right">
              <p>Source: {sourceLabel(invoice.source)}</p>
              <p>Prepared by: {invoice.createdByName}</p>
              <p>Created: {formatDate(invoice.createdAt)}</p>
            </div>
          </section>

          <div className="overflow-x-auto py-6 print:overflow-visible">
            <table className="w-full min-w-[64rem] border-collapse text-left text-[0.75rem] print:min-w-0">
              <thead>
                <tr className="border-y border-line bg-cream/60 text-[0.625rem] uppercase tracking-[0.1em] text-muted print:bg-transparent">
                  <th scope="col" className={th}>#</th>
                  <th scope="col" className={th}>Description</th>
                  <th scope="col" className={th}>SKU</th>
                  <th scope="col" className={th}>Size</th>
                  <th scope="col" className={th}>Metal / purity</th>
                  <th scope="col" className={`${th} text-right`}>Qty</th>
                  <th scope="col" className={`${th} text-right`}>Net wt</th>
                  <th scope="col" className={`${th} text-right`}>Unit price</th>
                  <th scope="col" className={`${th} text-right`}>Discount</th>
                  <th scope="col" className={`${th} text-right`}>Taxable</th>
                  <th scope="col" className={`${th} text-right`}>GST %</th>
                  <th scope="col" className={`${th} text-right`}>GST</th>
                  <th scope="col" className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-3 py-6 text-center text-muted">
                      No items.
                    </td>
                  </tr>
                )}
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="break-inside-avoid border-b border-line align-top">
                    <td className={`${td} text-muted`}>{index + 1}</td>
                    <td className={`${td} min-w-[12rem] font-medium`}>{item.description}</td>
                    <td className={`${td} whitespace-nowrap`}>{item.sku ?? "—"}</td>
                    <td className={td}>{item.size ?? "—"}</td>
                    <td className={`${td} whitespace-nowrap`}>{item.metal || item.purity ? [item.metal ? (metalLabels[item.metal] ?? item.metal) : null, item.purity ? (purityLabels[item.purity] ?? item.purity) : null].filter(Boolean).join(" · ") : "—"}</td>
                    <td className={`${td} text-right tabular-nums`}>{item.quantity}</td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{weight(item.netWeight)}</td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(item.unitPrice)}</td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{item.discount ? money(item.discount) : "—"}</td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(item.taxableValue)}</td>
                    <td className={`${td} text-right tabular-nums`}>{percent(item.gstRate)}</td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{money(item.gstAmount)}</td>
                    <td className={`${td} whitespace-nowrap text-right font-medium tabular-nums`}>{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 max-w-md">
              {invoice.notes && (
                <>
                  <p className="text-[0.6875rem] uppercase tracking-[0.16em] text-muted">Notes</p>
                  <p className="mt-1 whitespace-pre-line text-ink-soft">{invoice.notes}</p>
                </>
              )}
            </div>
            <TotalsList
              className="w-full break-inside-avoid sm:max-w-xs"
              rows={[
                { label: "Subtotal", value: money(invoice.subtotal) },
                { label: "Discount", value: invoice.discount ? `− ${money(invoice.discount)}` : money(0) },
                { label: "Taxable value", value: money(invoice.taxableValue) },
                { label: "GST", value: money(invoice.gst) },
                { label: "Grand total", value: money(invoice.grandTotal), strong: true },
                { label: "Amount paid", value: money(invoice.amountPaid), hidden: isDraft },
                { label: "Balance due", value: money(invoice.balanceDue), tone: invoice.balanceDue > 0 ? "danger" : "success", hidden: isDraft || invoice.status === "cancelled" },
              ]}
            />
          </div>

          {seller.footerNote && <p className="mt-8 whitespace-pre-line border-t border-line pt-4 text-center text-[0.75rem] text-muted">{seller.footerNote}</p>}
        </article>

        <div className="grid items-start gap-6 xl:grid-cols-2">
          <Panel title="Payments" flush className="break-inside-avoid">
            {invoice.payments.length === 0 ? (
              <p className="px-5 py-6 text-[0.8125rem] text-muted">No payments recorded.</p>
            ) : (
              <ul className="divide-y divide-line">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex items-start justify-between gap-3 px-5 py-3 text-[0.8125rem]">
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {methodLabel(payment.method)}
                        {payment.reference ? <span className="font-normal text-muted"> · {payment.reference}</span> : null}
                      </span>
                      <span className="block text-muted">
                        {formatDateTime(payment.receivedAt)} · recorded by {payment.recordedByName}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums">{money(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="History" flush className="print:hidden">
            {invoice.events.length === 0 ? (
              <p className="px-5 py-6 text-[0.8125rem] text-muted">No history yet.</p>
            ) : (
              <ol className="divide-y divide-line">
                {invoice.events.map((event) => (
                  <li key={event.id} className="px-5 py-3 text-[0.8125rem]">
                    <p>
                      <span className="font-medium">{humanize(event.action)}</span>
                      {event.note ? <span className="text-ink-soft"> · {event.note}</span> : null}
                    </p>
                    <p className="text-muted">
                      {event.actorName} · {formatDateTime(event.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>

      <IssueDialog key={`issue-${dialogKey}`} open={dialog === "issue"} invoice={invoice} onClose={closeDialog} onDone={(updated) => finish(`Invoice ${updated.invoiceNumber ?? ""} issued`)(updated)} />
      <PaymentDialog key={`payment-${dialogKey}`} open={dialog === "payment"} invoice={invoice} defaults={paymentDefaults} onClose={closeDialog} onDone={finish("Payment recorded")} />
      <CancelDialog key={`cancel-${dialogKey}`} open={dialog === "cancel"} invoice={invoice} onClose={closeDialog} onDone={finish("Invoice cancelled")} />
    </>
  );
}

function IssueDialog({ open, invoice, onClose, onDone }: DialogProps) {
  const issue = useMutation(() => adminApi.post<InvoiceDetail>(`/invoices/${invoice.id}/issue`));
  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title="Issue this invoice?"
      confirmLabel="Issue invoice"
      pending={issue.pending}
      error={issue.error?.message}
      description="Issuing locks the invoice so it can no longer be edited, and assigns the next invoice number. The totals below become final."
      onConfirm={async () => {
        const updated = await issue.run();
        if (updated) onDone(updated);
      }}
    >
      <TotalsList
        rows={[
          { label: "Customer", value: invoice.customer.name },
          { label: "Items", value: invoice.items.length },
          { label: "Grand total", value: money(invoice.grandTotal), strong: true },
        ]}
      />
    </ConfirmDialog>
  );
}

function PaymentDialog({ open, invoice, defaults, onClose, onDone }: DialogProps & { defaults: { amount: string; receivedAt: string } }) {
  const formId = useId();
  const [amount, setAmount] = useState(defaults.amount);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [receivedAt, setReceivedAt] = useState(defaults.receivedAt);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const record = useMutation((body: { amount: number; method: PaymentMethod; reference: string | null; receivedAt?: string }) => adminApi.post<InvoiceDetail>(`/invoices/${invoice.id}/payments`, body));
  const errors: Record<string, string> = { ...record.fieldErrors, ...clientErrors };
  const generalError = record.error && !Object.keys(record.fieldErrors).length ? record.error.message : null;

  async function submit() {
    const found: Record<string, string> = {};
    const value = toNumberOrNull(amount);
    if (value === null || value <= 0) found.amount = "Enter an amount above zero.";
    else if (round2(value) > invoice.balanceDue) found.amount = `The balance due is ${money(invoice.balanceDue)}.`;
    let receivedIso: string | undefined;
    if (receivedAt) {
      const parsed = new Date(receivedAt);
      if (Number.isNaN(parsed.getTime())) found.receivedAt = "Enter a valid date and time.";
      else receivedIso = parsed.toISOString();
    }
    setClientErrors(found);
    if (Object.keys(found).length || value === null) return;
    const updated = await record.run({ amount: round2(value), method, reference: reference.trim() || null, receivedAt: receivedIso });
    if (updated) onDone(updated);
  }

  return (
    <AdminDialog
      open={open}
      onClose={() => {
        if (!record.pending) onClose();
      }}
      title="Record payment"
      description={`${invoice.invoiceNumber ?? "Invoice"} · balance due ${money(invoice.balanceDue)}`}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={record.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={record.pending}>
            Record payment
          </AdminButton>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <NumberInput label="Amount (₹)" required min={0.01} max={invoice.balanceDue} value={amount} onChange={(event) => setAmount(event.target.value)} error={errors.amount} hint={`Up to ${money(invoice.balanceDue)}.`} />
        <SelectInput label="Method" required value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} options={paymentMethodOptions} error={errors.method} />
        <TextInput label="Reference" maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} error={errors.reference} hint="UPI transaction ID, cheque number…" />
        <TextInput label="Received at" type="datetime-local" value={receivedAt} onChange={(event) => setReceivedAt(event.target.value)} error={errors.receivedAt} />
        <p className="text-[0.75rem] text-muted sm:col-span-2">Recorded payments can&apos;t be edited or deleted. The invoice status updates automatically.</p>
        {generalError && <InlineAlert className="sm:col-span-2">{generalError}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}

function CancelDialog({ open, invoice, onClose, onDone }: DialogProps) {
  const [reason, setReason] = useState("");
  const cancel = useMutation((value: string) => adminApi.post<InvoiceDetail>(`/invoices/${invoice.id}/cancel`, { reason: value }));
  const reasonError = cancel.fieldErrors.reason;
  const generalError = cancel.error && !reasonError ? cancel.error.message : null;
  const likelyBlocked =
    invoice.status === "draft"
      ? null
      : invoice.source !== "manual"
        ? "Invoices for online orders and in-store sales are normally cancelled through the order or sale (returns and refunds)."
        : invoice.amountPaid > 0
          ? "Invoices with recorded payments can't be cancelled."
          : null;

  async function submit() {
    const updated = await cancel.run(reason.trim());
    if (updated) onDone(updated);
  }

  return (
    <AdminDialog
      open={open}
      onClose={() => {
        if (!cancel.pending) onClose();
      }}
      title="Cancel this invoice?"
      description={invoice.invoiceNumber ?? "Draft invoice"}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={cancel.pending}>
            Keep invoice
          </AdminButton>
          <AdminButton variant="danger" onClick={() => void submit()} loading={cancel.pending} disabled={!reason.trim()}>
            Cancel invoice
          </AdminButton>
        </>
      }
    >
      <p className="text-[0.875rem] text-ink-soft">A cancelled invoice stays on record, but its balance is cleared and it can&apos;t be reopened.</p>
      {likelyBlocked && (
        <InlineAlert tone="warning" className="mt-4">
          {likelyBlocked}
        </InlineAlert>
      )}
      <TextArea label="Reason" required rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} error={reasonError} containerClassName="mt-4" />
      {generalError && <InlineAlert className="mt-4">{generalError}</InlineAlert>}
    </AdminDialog>
  );
}
