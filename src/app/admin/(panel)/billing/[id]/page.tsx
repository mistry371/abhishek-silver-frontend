"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminSession";
import { InvoiceForm } from "@/components/admin/billing/InvoiceForm";
import type { InvoiceDetail } from "@/components/admin/billing/types";
import { ErrorState, InlineAlert, LoadingBlock, PageHeader, PermissionDenied, StatusBadge } from "@/components/admin/ui";
import { useAdminResource } from "@/lib/admin/hooks";

export default function EditInvoiceDraftPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const { data: invoice, error, reload } = useAdminResource<InvoiceDetail>(`/invoices/${id}`);

  const header = (
    <PageHeader
      title="Edit draft invoice"
      description="Only manual drafts can be edited. Totals are recalculated by the server when you save."
      back={{ href: `/admin/invoices/${id}`, label: "Invoice" }}
      meta={invoice && <StatusBadge status={invoice.status} />}
    />
  );

  if (error) {
    return (
      <>
        {header}
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }
  if (!invoice) {
    return (
      <>
        {header}
        <LoadingBlock rows={8} />
      </>
    );
  }
  if (invoice.status !== "draft" || invoice.source !== "manual") {
    return (
      <>
        {header}
        <InlineAlert tone="info">
          {invoice.status !== "draft" ? `This invoice is ${invoice.status.replace(/_/g, " ")}, so it is locked and can't be edited.` : "Only manual drafts can be edited here."}{" "}
          <Link href={`/admin/invoices/${invoice.id}`} className="font-medium underline">
            View invoice {invoice.invoiceNumber ?? ""}
          </Link>
        </InlineAlert>
      </>
    );
  }
  if (!can("billing:create")) {
    return (
      <>
        {header}
        <PermissionDenied message="Your role can't edit invoices." />
      </>
    );
  }

  return (
    <>
      {header}
      <InvoiceForm key={`${invoice.id}:${invoice.updatedAt}`} invoice={invoice} />
    </>
  );
}
