"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminSession";
import { PurchaseForm } from "@/components/admin/inventory/PurchaseForm";
import { PageHeader, PermissionDenied } from "@/components/admin/ui";

const back = { href: "/admin/purchases", label: "Purchases" };

export default function NewPurchasePage() {
  const { can } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!can("purchases:create")) {
    return (
      <>
        <PageHeader title="New purchase" back={back} />
        <PermissionDenied message="Your role can't record purchases. Ask a Super Admin for the purchases:create permission." />
      </>
    );
  }

  return (
    <>
      <PageHeader title="New purchase" back={back} description="Record a vendor invoice as a draft, then submit it for approval. Stock is only added when an approver approves it." />
      <PurchaseForm initialVendorId={searchParams.get("vendorId") ?? undefined} onSaved={(purchase) => router.push(`/admin/purchases/${purchase.id}`)} />
    </>
  );
}
