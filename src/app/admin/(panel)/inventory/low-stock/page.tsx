"use client";

import { InventoryTable } from "@/components/admin/inventory/InventoryTable";
import { AdminLinkButton, PageHeader } from "@/components/admin/ui";

export default function LowStockPage() {
  return (
    <>
      <PageHeader
        title="Low stock"
        description="Products that still have stock but are at or below their low-stock alert level."
        back={{ href: "/admin/inventory", label: "Inventory" }}
        actions={<AdminLinkButton href="/admin/inventory/out-of-stock">Out of stock</AdminLinkButton>}
      />
      <InventoryTable fixedStatus="low_stock" empty={{ title: "Nothing is running low", description: "Products appear here when their total stock reaches the alert level." }} />
    </>
  );
}
