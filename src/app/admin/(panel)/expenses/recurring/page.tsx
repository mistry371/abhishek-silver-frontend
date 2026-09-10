"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { FormErrorAlert, PaymentSourceField } from "@/components/admin/expenses/ExpenseForm";
import { useExpenseCategories, useExpenseSettings } from "@/components/admin/expenses/hooks";
import {
  advanceDate,
  categoryLabel,
  categoryOptions,
  frequencyOptions,
  methodLabel,
  paymentMethodOptions,
  type ExpenseCategory,
  type ExpenseDetail,
  type Frequency,
  type PaymentMethod,
  type RecurringExpense,
} from "@/components/admin/expenses/types";
import { CheckboxInput, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { EditIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, ConfirmDialog, DataTable, InlineAlert, PageHeader, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDate, formatDateTime, humanize, money, todayIst } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";

export default function RecurringExpensesPage() {
  const router = useRouter();
  const { can } = useAdmin();
  const canManage = can("expenses:manage_categories");
  const canCreate = can("expenses:create");
  const [today] = useState(() => todayIst());
  const recurring = useAdminResource<RecurringExpense[]>("/recurring-expenses");
  const categories = useExpenseCategories();
  const settings = useExpenseSettings();
  const [editing, setEditing] = useState<RecurringExpense | "new" | null>(null);
  const [drafting, setDrafting] = useState<RecurringExpense | null>(null);
  const createDraft = useMutation((templateId: string) => adminApi.post<ExpenseDetail>(`/recurring-expenses/${templateId}/create-draft`));

  const categoryById = new Map((categories.latest ?? []).map((category) => [category.id, category]));

  async function confirmDraft() {
    if (!drafting) return;
    const result = await createDraft.run(drafting.id);
    if (result) {
      toast({ title: `Draft ${result.expenseNumber} created`, description: "Check the amount, attach the bill and submit it.", tone: "success" });
      setDrafting(null);
      router.push(`/admin/expenses/${result.id}`);
    }
  }

  const columns: Column<RecurringExpense>[] = [
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <div className="min-w-[9rem]">
          <span className="block font-medium">{row.title}</span>
          {row.notes && <span className="block max-w-[16rem] truncate text-[0.75rem] text-muted">{row.notes}</span>}
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      priority: "low",
      cell: (row) => {
        const category = categoryById.get(row.categoryId);
        return category ? categoryLabel(category) : (row.categoryName ?? "—");
      },
    },
    { key: "amount", header: "Amount", align: "right", cell: (row) => money(row.amount) },
    { key: "frequency", header: "Frequency", cell: (row) => humanize(row.frequency) },
    {
      key: "nextDue",
      header: "Next due",
      cell: (row) => (
        <div className="whitespace-nowrap">
          <span className="block">{formatDate(row.nextDueDate)}</span>
          {row.active && row.nextDueDate < today && <StatusBadge status="overdue" label="Overdue" tone="danger" className="mt-1" />}
          {row.active && row.nextDueDate === today && <StatusBadge status="due" label="Due today" tone="warning" className="mt-1" />}
        </div>
      ),
    },
    { key: "payee", header: "Payee", cell: (row) => row.payee },
    { key: "method", header: "Method", priority: "low", cell: (row) => <span className="whitespace-nowrap">{methodLabel(row.paymentMethod)}</span> },
    { key: "active", header: "Status", cell: (row) => <StatusBadge status={row.active ? "active" : "inactive"} /> },
    { key: "lastCreated", header: "Last draft", priority: "low", cell: (row) => <span className="whitespace-nowrap">{row.lastCreatedAt ? formatDateTime(row.lastCreatedAt) : "Never"}</span> },
    ...(canManage || canCreate
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right" as const,
            cell: (row: RecurringExpense) => (
              <div className="flex justify-end gap-1">
                {canManage && (
                  <AdminButton size="sm" variant="ghost" onClick={() => setEditing(row)} aria-label={`Edit ${row.title}`}>
                    <EditIcon size={14} />
                    Edit
                  </AdminButton>
                )}
                {canCreate && (
                  <AdminButton
                    size="sm"
                    disabled={!row.active}
                    title={row.active ? undefined : "Activate this template to create drafts"}
                    onClick={() => {
                      createDraft.clearError();
                      setDrafting(row);
                    }}
                  >
                    Create draft now
                  </AdminButton>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  const newButton = (
    <AdminButton variant="primary" onClick={() => setEditing("new")}>
      <PlusIcon size={15} />
      New recurring expense
    </AdminButton>
  );

  return (
    <>
      <PageHeader
        title="Recurring expenses"
        description="Templates for bills that repeat, such as rent, salaries or subscriptions."
        back={{ href: "/admin/expenses", label: "Expenses" }}
        actions={canManage ? newButton : undefined}
      />

      <InlineAlert tone="info" className="mb-4">
        <strong className="font-medium">Recurring expenses are never posted automatically.</strong> When a bill is due, use “Create draft now”: it creates a draft expense for the
        due date and moves the next due date forward. The draft still has to be checked and submitted
        {settings.approvalRequired === false ? "" : " (and approved when approvals are on)"} like any other expense.
      </InlineAlert>

      <DataTable
        columns={columns}
        rows={recurring.latest}
        getRowKey={(row) => row.id}
        loading={recurring.loading}
        error={recurring.error}
        onRetry={recurring.reload}
        empty={{
          title: "No recurring expenses",
          description: canManage ? "Add a template for bills that repeat every week, month, quarter or year." : "Templates for repeating bills will appear here.",
          action: canManage ? newButton : undefined,
        }}
      />

      <RecurringDialog
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        open={editing !== null}
        template={editing === "new" ? null : editing}
        categories={categories.latest}
        paymentSources={settings.paymentSources}
        today={today}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          recurring.reload();
        }}
      />

      <ConfirmDialog
        open={drafting !== null}
        onClose={() => {
          if (!createDraft.pending) setDrafting(null);
        }}
        onConfirm={confirmDraft}
        title={drafting ? `Create a draft for “${drafting.title}”?` : "Create draft"}
        description={
          drafting
            ? `Creates a draft expense dated ${formatDate(drafting.nextDueDate)} for ${money(drafting.amount)} to ${drafting.payee}. The next due date moves to ${formatDate(advanceDate(drafting.nextDueDate, drafting.frequency))}. Nothing is submitted or paid.`
            : undefined
        }
        confirmLabel="Create draft"
        pending={createDraft.pending}
        error={createDraft.error?.message}
      />
    </>
  );
}

interface TemplateForm {
  title: string;
  categoryId: string;
  amount: string;
  frequency: Frequency;
  nextDueDate: string;
  payee: string;
  paymentMethod: PaymentMethod;
  paymentSource: string;
  active: boolean;
  notes: string;
}

const VISIBLE_FIELDS = ["title", "categoryId", "amount", "frequency", "nextDueDate", "payee", "paymentMethod", "paymentSource", "active", "notes"];

function RecurringDialog({
  open,
  template,
  categories,
  paymentSources,
  today,
  onClose,
  onSaved,
}: {
  open: boolean;
  template: RecurringExpense | null;
  categories: ExpenseCategory[] | undefined;
  paymentSources: string[] | null;
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const formId = useId();
  const [form, setForm] = useState<TemplateForm>(() => ({
    title: template?.title ?? "",
    categoryId: template?.categoryId ?? "",
    amount: template ? String(template.amount) : "",
    frequency: template?.frequency ?? "monthly",
    nextDueDate: template?.nextDueDate ?? today,
    payee: template?.payee ?? "",
    paymentMethod: template?.paymentMethod ?? "bank_transfer",
    paymentSource: template?.paymentSource ?? "",
    active: template?.active ?? true,
    notes: template?.notes ?? "",
  }));
  const set = <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = useMutation((body: Record<string, unknown>) =>
    template ? adminApi.patch<RecurringExpense>(`/recurring-expenses/${template.id}`, body) : adminApi.post<RecurringExpense>("/recurring-expenses", body),
  );
  const errors = save.fieldErrors;
  const categoryChoices = categoryOptions(categories, { keepId: template?.categoryId });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await save.run({
      title: form.title,
      categoryId: form.categoryId,
      amount: toNumberOrNull(form.amount),
      frequency: form.frequency,
      nextDueDate: form.nextDueDate,
      payee: form.payee,
      paymentMethod: form.paymentMethod,
      paymentSource: form.paymentSource.trim() || null,
      active: form.active,
      notes: form.notes.trim() || null,
    });
    if (result) {
      toast({ title: template ? "Recurring expense updated" : `“${result.title}” added`, tone: "success" });
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
      size="lg"
      title={template ? "Edit recurring expense" : "New recurring expense"}
      description="Saving a template never creates or posts an expense."
      footer={
        <>
          <AdminButton variant="ghost" onClick={close} disabled={save.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={save.pending}>
            {template ? "Save changes" : "Add recurring expense"}
          </AdminButton>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 empty:hidden">
          <FormErrorAlert error={save.error} visibleFields={VISIBLE_FIELDS} />
        </div>
        <TextInput label="Title" required maxLength={120} value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="e.g. Shop rent" error={errors.title} containerClassName="sm:col-span-2" />
        <SelectInput
          label="Category"
          required
          value={form.categoryId}
          onChange={(event) => set("categoryId", event.target.value)}
          options={categoryChoices}
          placeholder={categories ? (categoryChoices.length ? "Choose a category" : "No active categories yet") : "Loading categories…"}
          error={errors.categoryId}
        />
        <NumberInput label="Amount (₹)" required min={0} step="0.01" value={form.amount} onChange={(event) => set("amount", event.target.value)} error={errors.amount} />
        <SelectInput label="Frequency" required value={form.frequency} onChange={(event) => set("frequency", event.target.value as Frequency)} options={frequencyOptions} error={errors.frequency} />
        <TextInput label="Next due date" type="date" required value={form.nextDueDate} onChange={(event) => set("nextDueDate", event.target.value)} error={errors.nextDueDate} />
        <TextInput label="Payee" required maxLength={160} value={form.payee} onChange={(event) => set("payee", event.target.value)} error={errors.payee} />
        <SelectInput
          label="Payment method"
          required
          value={form.paymentMethod}
          onChange={(event) => set("paymentMethod", event.target.value as PaymentMethod)}
          options={paymentMethodOptions}
          error={errors.paymentMethod}
        />
        <PaymentSourceField value={form.paymentSource} onChange={(value) => set("paymentSource", value)} sources={paymentSources} error={errors.paymentSource} />
        <div className="flex items-end pb-2">
          <CheckboxInput label="Active" description="Inactive templates can't create drafts." checked={form.active} onChange={(event) => set("active", event.target.checked)} />
        </div>
        <TextArea label="Notes" maxLength={1000} rows={3} value={form.notes} onChange={(event) => set("notes", event.target.value)} error={errors.notes} containerClassName="sm:col-span-2" />
      </form>
    </AdminDialog>
  );
}
