"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { CollectionDialog } from "@/components/admin/catalogue/CollectionDialog";
import { DeleteDialog, RowActions, Thumb } from "@/components/admin/catalogue/shared";
import type { Collection } from "@/components/admin/catalogue/types";
import { ImportAction } from "@/components/admin/ImportDialog";
import { AdminButton, DataTable, PageHeader, StatusBadge, type Column } from "@/components/admin/ui";
import { number } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

export default function CollectionsPage() {
  const { can } = useAdmin();
  const canManage = can("catalog:manage_taxonomy");
  const resource = useAdminResource<Collection[]>("/collections");
  const [editing, setEditing] = useState<Collection | "new" | null>(null);
  const [deleting, setDeleting] = useState<Collection | null>(null);

  const columns: Column<Collection>[] = [
    { key: "image", header: <span className="sr-only">Image</span>, cell: (row) => <Thumb image={row.image} />, className: "w-14" },
    {
      key: "name",
      header: "Collection",
      cell: (row) => (
        <div className="min-w-[10rem]">
          {row.eyebrow && <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">{row.eyebrow}</p>}
          <p className="font-medium text-ink">{row.name}</p>
          <p className="mt-0.5 text-[0.75rem] text-muted">/{row.slug}</p>
        </div>
      ),
    },
    {
      key: "products",
      header: "Products",
      align: "right",
      cell: (row) =>
        can("products:view") && row.productCount > 0 ? (
          <Link href={`/admin/products?collectionId=${row.id}`} className="hover:underline">
            {number(row.productCount)}
          </Link>
        ) : (
          number(row.productCount)
        ),
    },
    { key: "active", header: "Status", cell: (row) => <StatusBadge status={row.active ? "active" : "inactive"} /> },
    { key: "order", header: "Order", align: "right", priority: "low", cell: (row) => number(row.displayOrder) },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (canManage ? <RowActions label={row.name} onEdit={() => setEditing(row)} onDelete={() => setDeleting(row)} /> : null),
    },
  ];

  return (
    <>
      <PageHeader
        title="Collections"
        description="Curated edits shown as collection pages on the website. Assign products to collections from the product form."
        actions={
          <>
            <ImportAction entity="collections" onImported={resource.reload} />
            {canManage && (
              <AdminButton variant="primary" onClick={() => setEditing("new")}>
                <PlusIcon size={15} />
                New collection
              </AdminButton>
            )}
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={resource.latest}
        getRowKey={(row) => row.id}
        loading={resource.loading}
        error={resource.error}
        onRetry={resource.reload}
        empty={{ title: "No collections yet", action: canManage ? <AdminButton onClick={() => setEditing("new")}>New collection</AdminButton> : undefined }}
      />

      {editing && (
        <CollectionDialog
          key={editing === "new" ? "new" : editing.id}
          collection={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            resource.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          path={`/collections/${deleting.id}`}
          title={`Delete ${deleting.name}?`}
          description={
            deleting.productCount > 0
              ? `${deleting.productCount} product${deleting.productCount === 1 ? " is" : "s are"} in this collection. The products are kept but removed from the collection, and its page is removed from the website.`
              : "The collection page is removed from the website."
          }
          successMessage="Collection deleted"
          onClose={() => setDeleting(null)}
          onDeleted={resource.reload}
        />
      )}
    </>
  );
}
