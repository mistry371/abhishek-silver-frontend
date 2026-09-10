"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { DeleteDialog, RowActions } from "@/components/admin/catalogue/shared";
import { SubcategoryDialog } from "@/components/admin/catalogue/SubcategoryDialog";
import type { Category, Subcategory } from "@/components/admin/catalogue/types";
import { AdminButton, DataTable, FilterBar, FilterSelect, PageHeader, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import { number } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

type SubcategoryRow = Subcategory & { categoryName: string };

const FILTER_KEYS = ["categoryId", "q"] as const;

export default function SubcategoriesPage() {
  const { can } = useAdmin();
  const canManage = can("catalog:manage_taxonomy");
  const { values, setFilters } = useUrlFilters(FILTER_KEYS);
  const resource = useAdminResource<Category[]>("/categories");
  const [editing, setEditing] = useState<Subcategory | "new" | null>(null);
  const [deleting, setDeleting] = useState<SubcategoryRow | null>(null);

  const categories = resource.latest;
  const search = values.q.trim().toLowerCase();
  const rows: SubcategoryRow[] | undefined = categories
    ?.flatMap((category) => category.subcategories.map((subcategory) => ({ ...subcategory, categoryName: category.name })))
    .filter((row) => !values.categoryId || row.categoryId === values.categoryId)
    .filter((row) => !search || row.name.toLowerCase().includes(search) || row.slug.includes(search));
  const filterOptions = (categories ?? [])
    .filter((category) => category.group === "type" || category.subcategories.length > 0)
    .map((category) => ({ value: category.id, label: category.name }));
  const hasTypes = (categories ?? []).some((category) => category.group === "type");
  const hasFilters = Boolean(values.categoryId || values.q);

  const columns: Column<SubcategoryRow>[] = [
    {
      key: "name",
      header: "Subcategory",
      cell: (row) => (
        <div className="min-w-[10rem]">
          <p className="font-medium text-ink">{row.name}</p>
          <p className="mt-0.5 text-[0.75rem] text-muted">/{row.slug}</p>
        </div>
      ),
    },
    { key: "category", header: "Jewellery type", cell: (row) => row.categoryName },
    { key: "active", header: "Status", cell: (row) => <StatusBadge status={row.active ? "active" : "inactive"} /> },
    { key: "order", header: "Order", align: "right", cell: (row) => number(row.displayOrder) },
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
        title="Subcategories"
        description="Finer groupings within each jewellery type."
        actions={
          canManage && (
            <AdminButton variant="primary" onClick={() => setEditing("new")} disabled={!categories || !hasTypes}>
              <PlusIcon size={15} />
              New subcategory
            </AdminButton>
          )
        }
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Search name or slug" />
        <FilterSelect label="Jewellery type" value={values.categoryId} onChange={(categoryId) => setFilters({ categoryId })} options={filterOptions} />
        {hasFilters && (
          <AdminButton variant="ghost" onClick={() => setFilters({ categoryId: "", q: "" })}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={resource.loading}
        error={resource.error}
        onRetry={resource.reload}
        empty={
          hasFilters
            ? { title: "No subcategories match", action: <AdminButton onClick={() => setFilters({ categoryId: "", q: "" })}>Clear filters</AdminButton> }
            : {
                title: "No subcategories yet",
                description: hasTypes ? undefined : "Create a jewellery type category first.",
                action: canManage && hasTypes ? <AdminButton onClick={() => setEditing("new")}>New subcategory</AdminButton> : undefined,
              }
        }
      />

      {editing && categories && (
        <SubcategoryDialog
          key={editing === "new" ? "new" : editing.id}
          categories={categories}
          subcategory={editing === "new" ? undefined : editing}
          defaultCategoryId={editing === "new" ? values.categoryId || undefined : undefined}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            resource.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          path={`/subcategories/${deleting.id}`}
          title={`Delete ${deleting.name}?`}
          description={`Products in this subcategory stay in ${deleting.categoryName} but lose the subcategory.`}
          successMessage="Subcategory deleted"
          onClose={() => setDeleting(null)}
          onDeleted={resource.reload}
        />
      )}
    </>
  );
}
