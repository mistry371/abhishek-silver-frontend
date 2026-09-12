"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { CategoryDialog } from "@/components/admin/catalogue/CategoryDialog";
import { DeleteDialog, RowActions, Thumb } from "@/components/admin/catalogue/shared";
import { SubcategoryDialog } from "@/components/admin/catalogue/SubcategoryDialog";
import type { Category, CategoryGroup, Subcategory } from "@/components/admin/catalogue/types";
import { CATEGORY_GROUP_OPTIONS, describeListingRule, groupLabels } from "@/components/admin/catalogue/utils";
import { ImportAction } from "@/components/admin/ImportDialog";
import { AdminButton, DataTable, ErrorState, PageHeader, Panel, StatusBadge, Tabs, type Column } from "@/components/admin/ui";
import { number } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

type GroupTab = "all" | CategoryGroup;

export default function CategoriesPage() {
  const { can } = useAdmin();
  const canManage = can("catalog:manage_taxonomy");
  const resource = useAdminResource<Category[]>("/categories");
  const [tab, setTab] = useState<GroupTab>("all");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [subEditing, setSubEditing] = useState<{ categoryId: string; subcategory?: Subcategory } | null>(null);
  const [subDeleting, setSubDeleting] = useState<Subcategory | null>(null);

  const categories = resource.latest;
  const rows = tab === "all" ? categories : categories?.filter((category) => category.group === tab);
  const typeCategories = (categories ?? []).filter((category) => category.group === "type");

  const columns: Column<Category>[] = [
    { key: "image", header: <span className="sr-only">Image</span>, cell: (row) => <Thumb image={row.image} />, className: "w-14" },
    {
      key: "name",
      header: "Category",
      cell: (row) => (
        <div className="min-w-[10rem]">
          <p className="font-medium text-ink">{row.name}</p>
          <p className="mt-0.5 text-[0.75rem] text-muted">/{row.slug}</p>
        </div>
      ),
    },
    { key: "group", header: "Group", cell: (row) => <span className="whitespace-nowrap">{groupLabels[row.group] ?? row.group}</span> },
    {
      key: "contents",
      header: "Lists",
      priority: "low",
      cell: (row) =>
        row.group === "type" ? (
          <span className="text-muted">
            {row.subcategories.length} subcategor{row.subcategories.length === 1 ? "y" : "ies"}
          </span>
        ) : (
          <span className="text-muted">{describeListingRule(row.listingRule)}</span>
        ),
    },
    { key: "products", header: "Products", align: "right", cell: (row) => (row.group === "type" ? number(row.productCount) : "—") },
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
        title="Categories"
        description="Jewellery types organise products. Metal, audience and service categories are landing pages that list products by a rule."
        actions={
          <>
            <ImportAction entity={["categories", "category"]} onImported={resource.reload} />
            {canManage && (
              <AdminButton variant="primary" onClick={() => setEditing("new")}>
                <PlusIcon size={15} />
                New category
              </AdminButton>
            )}
          </>
        }
      />

      {!categories && resource.error ? (
        <ErrorState error={resource.error} onRetry={resource.reload} />
      ) : (
        <>
          <Tabs
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "all" as GroupTab, label: "All", count: categories?.length },
              ...CATEGORY_GROUP_OPTIONS.map((option) => ({ value: option.value as GroupTab, label: option.label, count: categories?.filter((category) => category.group === option.value).length })),
            ]}
          />
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id}
            loading={resource.loading}
            error={resource.error}
            onRetry={resource.reload}
            empty={{
              title: tab === "all" ? "No categories yet" : `No ${groupLabels[tab].toLowerCase()} categories`,
              action: canManage ? <AdminButton onClick={() => setEditing("new")}>New category</AdminButton> : undefined,
            }}
          />

          {categories && (tab === "all" || tab === "type") && (
            <section className="mt-10">
              <div className="mb-4">
                <h2 className="font-serif text-[1.375rem] text-ink">Subcategories</h2>
                <p className="mt-1 text-[0.8125rem] text-muted">Each jewellery type can be split into subcategories, e.g. Rings → Bands.</p>
              </div>
              {typeCategories.length === 0 ? (
                <p className="border border-line bg-porcelain px-5 py-6 text-[0.8125rem] text-muted">Create a jewellery type category to add subcategories.</p>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {typeCategories.map((category) => (
                    <Panel
                      key={category.id}
                      flush
                      title={category.name}
                      description={`${category.subcategories.length} subcategor${category.subcategories.length === 1 ? "y" : "ies"}`}
                      actions={
                        canManage && (
                          <AdminButton size="sm" onClick={() => setSubEditing({ categoryId: category.id })}>
                            <PlusIcon size={14} />
                            Add
                          </AdminButton>
                        )
                      }
                    >
                      {category.subcategories.length === 0 ? (
                        <p className="px-5 py-5 text-[0.8125rem] text-muted">No subcategories yet.</p>
                      ) : (
                        <ul className="divide-y divide-line">
                          {category.subcategories.map((subcategory) => (
                            <li key={subcategory.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[0.8125rem]">
                              <span className="min-w-0">
                                <span className="block truncate text-ink">{subcategory.name}</span>
                                <span className="block truncate text-[0.75rem] text-muted">
                                  /{subcategory.slug} · Order {subcategory.displayOrder}
                                </span>
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                {!subcategory.active && <StatusBadge status="inactive" />}
                                {canManage && (
                                  <RowActions label={subcategory.name} onEdit={() => setSubEditing({ categoryId: category.id, subcategory })} onDelete={() => setSubDeleting(subcategory)} />
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {editing && (
        <CategoryDialog
          key={editing === "new" ? "new" : editing.id}
          category={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            resource.reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          path={`/categories/${deleting.id}`}
          title={`Delete ${deleting.name}?`}
          description={
            deleting.group === "type"
              ? "Its subcategories are deleted too. A category that still has products can't be deleted — move them to another category first."
              : "This landing page will be removed from the website."
          }
          successMessage="Category deleted"
          onClose={() => setDeleting(null)}
          onDeleted={resource.reload}
        />
      )}
      {subEditing && categories && (
        <SubcategoryDialog
          key={subEditing.subcategory?.id ?? `new-${subEditing.categoryId}`}
          categories={categories}
          subcategory={subEditing.subcategory}
          defaultCategoryId={subEditing.categoryId}
          onClose={() => setSubEditing(null)}
          onSaved={() => {
            setSubEditing(null);
            resource.reload();
          }}
        />
      )}
      {subDeleting && (
        <DeleteDialog
          path={`/subcategories/${subDeleting.id}`}
          title={`Delete ${subDeleting.name}?`}
          description="Products in this subcategory stay in their jewellery type but lose the subcategory."
          successMessage="Subcategory deleted"
          onClose={() => setSubDeleting(null)}
          onDeleted={resource.reload}
        />
      )}
    </>
  );
}
