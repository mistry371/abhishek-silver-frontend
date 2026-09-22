"use client";

import { useAdmin } from "@/components/admin/AdminSession";
import { ParentProductForm } from "@/components/admin/catalogue/ParentProductForm";
import { PageHeader, PermissionDenied } from "@/components/admin/ui";

export default function NewParentProductPage() {
  const { can } = useAdmin();
  return (
    <>
      <PageHeader
        title="New parent product"
        back={{ href: "/admin/parent-products", label: "Parent products" }}
        description="Group products that are the same design in different metals or purities. Each product keeps its own SKU, weight, stock and price."
      />
      {can("products:create") ? <ParentProductForm /> : <PermissionDenied message="Your role can't create parent products." />}
    </>
  );
}
