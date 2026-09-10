"use client";

import { InventoryTable } from "@/components/admin/inventory/InventoryTable";
import { AdminLinkButton, PageHeader } from "@/components/admin/ui";

export default function OutOfStockPage() {
  return (
    <>
      <PageHeader
        title="Out of stock"
        description="Products with no units left at any location."
        back={{ href: "/admin/inventory", label: "Inventory" }}
        actions={<AdminLinkButton href="/admin/inventory/low-stock">Low stock</AdminLinkButton>}
      />
      <InventoryTable fixedStatus="out_of_stock" empty={{ title: "Nothing is out of stock", description: "Products appear here when their total stock reaches zero." }} />
    </>
  );
}
