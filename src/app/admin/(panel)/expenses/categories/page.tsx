"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { FormErrorAlert } from "@/components/admin/expenses/ExpenseForm";
import { useExpenseCategories } from "@/components/admin/expenses/hooks";
import { sortCategories, type ExpenseCategory } from "@/components/admin/expenses/types";
import { CheckboxInput, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { EditIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, DataTable, InlineAlert, PageHeader, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { number } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

export default function ExpenseCategoriesPage() {
  const { can } = useAdmin();
  const canManage = can("expenses:manage_categories");
  const categories = useExpenseCategories();
  const [editing, setEditing] = useState<ExpenseCategory | "new" | null>(null);
  const rows = categories.latest ? sortCategories(categories.latest) : undefined;

  const columns: Column<ExpenseCategory>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => (
        <span className={cn("block min-w-[8rem]", row.parentId ? "pl-5 text-ink-soft" : "font-medium")}>
          {row.parentId && (
            <span className="mr-1 text-muted" aria-hidden="true">
              ↳
            </span>
          )}
          {row.name}
        </span>
      ),
    },
    { key: "parent", header: "Parent", cell: (row) => row.parentName ?? <span className="text-muted">—</span> },
    { key: "description", header: "Description", priority: "low", cell: (row) => <span className="line-clamp-2 max-w-[20rem] text-ink-soft">{row.description ?? "—"}</span> },
    {
      key: "expenses",
      header: "Expenses",
      align: "right",
      cell: (row) =>
        row.expenseCount > 0 ? (
          <Link href={`/admin/expenses?categoryId=${row.id}#expense-directory`} className="hover:underline">
            {number(row.expenseCount)}
          </Link>
        ) : (
          "0"
        ),
    },
    { key: "active", header: "Status", cell: (row) => <StatusBadge status={row.active ? "active" : "inactive"} /> },
    ...(canManage
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right" as const,
            cell: (row: ExpenseCategory) => (
              <AdminButton size="sm" variant="ghost" onClick={() => setEditing(row)} aria-label={`Edit ${row.name}`}>
                <EditIcon size={14} />
                Edit
              </AdminButton>
            ),
          },
        ]
      : []),
  ];

  const newButton = (
    <AdminButton variant="primary" onClick={() => setEditing("new")}>
      <PlusIcon size={15} />
      New category
    </AdminButton>
  );

  return (
    <>
      <PageHeader
        title="Expense categories"
        description="Group expenses for reporting. Categories can be nested one level, shown as “Parent / Child”."
        back={{ href: "/admin/expenses", label: "Expenses" }}
        actions={canManage ? newButton : undefined}
      />
      {!canManage && (
        <InlineAlert tone="info" className="mb-4">
          You can view categories. Changing them needs the “Manage expense categories and recurring expenses” permission.
        </InlineAlert>
      )}
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={categories.loading}
        error={categories.error}
        onRetry={categories.reload}
        empty={{
          title: "No categories yet",
          description: "Add categories such as Rent, Utilities or Salaries before recording expenses.",
          action: canManage ? newButton : undefined,
        }}
      />
      <CategoryDialog
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        open={editing !== null}
        category={editing === "new" ? null : editing}
        categories={categories.latest ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          categories.reload();
        }}
      />
    </>
  );
}

function CategoryDialog({
  open,
  category,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  category: ExpenseCategory | null;
  categories: ExpenseCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState(category?.parentId ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [active, setActive] = useState(category?.active ?? true);
  const save = useMutation((body: Record<string, unknown>) =>
    category ? adminApi.patch<ExpenseCategory>(`/expense-categories/${category.id}`, body) : adminApi.post<ExpenseCategory>("/expense-categories", body),
  );

  const hasChildren = Boolean(category && categories.some((item) => item.parentId === category.id));
  const parentOptions = sortCategories(categories)
    .filter((item) => !item.parentId && item.id !== category?.id)
    .map((item) => ({ value: item.id, label: item.active ? item.name : `${item.name} (inactive)` }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await save.run({ name, parentId: parentId || null, description: description.trim() || null, active });
    if (result) {
      toast({ title: category ? "Category updated" : `Category “${result.name}” created`, tone: "success" });
      onSaved();
    }
  }

  const close = () => {
    if (!save.pending) onClose();
  };

  return (
    <AdminDialog
      open={open}
      onClose={close}
      title={category ? "Edit category" : "New category"}
      footer={
        <>
          <AdminButton variant="ghost" onClick={close} disabled={save.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={save.pending}>
            {category ? "Save changes" : "Create category"}
          </AdminButton>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormErrorAlert error={save.error} visibleFields={["name", "parentId", "description", "active"]} />
        <TextInput label="Name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} error={save.fieldErrors.name} />
        <SelectInput
          label="Parent category"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          options={parentOptions}
          placeholder="None (top-level)"
          disabled={hasChildren}
          hint={hasChildren ? "This category has subcategories, so it stays top-level." : "Optional. Only top-level categories can be parents."}
          error={save.fieldErrors.parentId}
        />
        <TextArea label="Description" maxLength={300} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} error={save.fieldErrors.description} />
        <CheckboxInput label="Active" description="Inactive categories can't be chosen for new expenses." checked={active} onChange={(event) => setActive(event.target.checked)} />
      </form>
    </AdminDialog>
  );
}
