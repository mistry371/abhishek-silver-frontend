"use client";

import { useAdmin } from "@/components/admin/AdminSession";
import { ProductForm } from "@/components/admin/catalogue/ProductForm";
import { PageHeader, PermissionDenied } from "@/components/admin/ui";

export default function NewProductPage() {
  const { can } = useAdmin();
  return (
    <>
      <PageHeader title="New product" back={{ href: "/admin/products", label: "Products" }} description="Prices are calculated by the server from the live metal rate, making charges and GST." />
      {can("products:create") ? <ProductForm /> : <PermissionDenied message="Your role can't create products." />}
    </>
  );
}
