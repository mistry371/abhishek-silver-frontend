"use client";

import { useAdmin } from "@/components/admin/AdminSession";
import { InvoiceForm } from "@/components/admin/billing/InvoiceForm";
import { PageHeader, PermissionDenied } from "@/components/admin/ui";

export default function NewInvoicePage() {
  const { can } = useAdmin();
  return (
    <>
      <PageHeader title="New invoice" description="Create a manual draft invoice. It gets an invoice number when it is issued." back={{ href: "/admin/billing", label: "Billing" }} />
      {can("billing:create") ? <InvoiceForm /> : <PermissionDenied message="Your role can't create invoices." />}
    </>
  );
}
