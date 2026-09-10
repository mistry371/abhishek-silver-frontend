"use client";

import { useId, useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { ErrorSummary } from "@/components/admin/content/DocumentEditor";
import { toDisplayOrder } from "@/components/admin/content/fields";
import type { AdminFaq } from "@/components/admin/content/types";
import { CheckboxInput, NumberInput, TextArea, TextInput } from "@/components/admin/fields";
import { EditIcon, TrashIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, ConfirmDialog, EmptyNote, ErrorState, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi, errorMessage } from "@/lib/admin/client";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import { slugify } from "@/lib/utils";

export default function FaqsPage() {
  const { can } = useAdmin();
  const canManage = can("content:manage");
  const { data, error, reload, setData } = useAdminResource<AdminFaq[]>("/faqs");
  const [dialog, setDialog] = useState<{ open: boolean; record: AdminFaq | null; key: number }>({ open: false, record: null, key: 0 });
  const [deleting, setDeleting] = useState<AdminFaq | null>(null);
  const reorder = useMutation((ids: string[]) => adminApi.post<AdminFaq[]>("/faqs/reorder", { ids }));
  const remove = useMutation(async (id: string) => {
    await adminApi.del(`/faqs/${id}`);
    return true as const;
  });

  const openDialog = (record: AdminFaq | null) => setDialog((current) => ({ open: true, record, key: current.key + 1 }));
  const categories = Array.from(new Set((data ?? []).map((faq) => faq.category))).sort();

  async function move(index: number, delta: number) {
    if (!data) return;
    const target = index + delta;
    if (target < 0 || target >= data.length) return;
    const next = [...data];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setData(next);
    const result = await reorder.run(next.map((faq) => faq.id));
    if (result) {
      setData(result);
    } else {
      toast({ title: "Order not saved", description: "The list has been reloaded. Please try again.", tone: "error" });
      reload();
    }
  }

  return (
    <>
      <PageHeader
        title="FAQs"
        description="Questions and answers on the FAQ page. Use the arrows to change the order customers see."
        back={{ href: "/admin/content", label: "Website content" }}
        actions={
          canManage && (
            <AdminButton variant="primary" onClick={() => openDialog(null)}>
              <PlusIcon size={15} />
              New FAQ
            </AdminButton>
          )
        }
      />

      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <LoadingBlock rows={8} />
      ) : (
        <Panel title={`${data.length} question${data.length === 1 ? "" : "s"}`} description={categories.length ? `Categories: ${categories.join(", ")}` : undefined} flush>
          {data.length === 0 ? (
            <EmptyNote title="No FAQs yet" description="Answer the questions customers ask most often." action={canManage ? <AdminButton onClick={() => openDialog(null)}>New FAQ</AdminButton> : undefined} />
          ) : (
            <ol className="divide-y divide-line" aria-busy={reorder.pending || undefined}>
              {data.map((faq, index) => (
                <li key={faq.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid h-6 min-w-6 shrink-0 place-items-center bg-cream px-1 text-[0.75rem] tabular-nums text-ink-soft">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="text-[0.875rem] font-medium text-ink">{faq.question}</p>
                      <p className="mt-1 line-clamp-2 text-[0.8125rem] text-muted">{faq.answer}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status="category" label={faq.category} tone="accent" />
                        <span className="text-[0.75rem] text-muted">#{faq.slug}</span>
                        {!faq.active && <StatusBadge status="inactive" label="Hidden" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
                    {canManage && (
                      <>
                        <AdminButton size="sm" variant="ghost" className="px-2" disabled={index === 0 || reorder.pending} onClick={() => move(index, -1)} aria-label={`Move “${faq.question}” up`}>
                          <ChevronUpIcon size={15} />
                        </AdminButton>
                        <AdminButton size="sm" variant="ghost" className="px-2" disabled={index === data.length - 1 || reorder.pending} onClick={() => move(index, 1)} aria-label={`Move “${faq.question}” down`}>
                          <ChevronDownIcon size={15} />
                        </AdminButton>
                      </>
                    )}
                    <AdminButton size="sm" variant="ghost" onClick={() => openDialog(faq)}>
                      <EditIcon size={14} />
                      {canManage ? "Edit" : "View"}
                    </AdminButton>
                    {canManage && (
                      <AdminButton size="sm" variant="ghost" className="px-2 hover:text-danger" onClick={() => setDeleting(faq)} aria-label={`Delete “${faq.question}”`}>
                        <TrashIcon size={14} />
                      </AdminButton>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}

      <FaqDialog
        key={dialog.key}
        open={dialog.open}
        record={dialog.record}
        readOnly={!canManage}
        categories={categories}
        nextOrder={(data?.reduce((max, faq) => Math.max(max, faq.displayOrder), 0) ?? 0) + 1}
        onClose={() => setDialog((current) => ({ ...current, open: false }))}
        onSaved={(row) => {
          setData([...(data ?? []).filter((faq) => faq.id !== row.id), row].sort((a, b) => a.displayOrder - b.displayOrder));
          setDialog((current) => ({ ...current, open: false }));
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          remove.clearError();
        }}
        title="Delete FAQ?"
        description={deleting ? `“${deleting.question}” will be removed from the FAQ page. Links to #${deleting.slug} will stop working.` : undefined}
        confirmLabel="Delete"
        tone="danger"
        pending={remove.pending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await remove.run(deleting.id);
          if (!ok) return;
          setData((data ?? []).filter((faq) => faq.id !== deleting.id));
          toast({ title: "FAQ deleted", tone: "success" });
          setDeleting(null);
        }}
      />
    </>
  );
}

function FaqDialog({
  open,
  record,
  readOnly,
  categories,
  nextOrder,
  onClose,
  onSaved,
}: {
  open: boolean;
  record: AdminFaq | null;
  readOnly: boolean;
  categories: string[];
  nextOrder: number;
  onClose: () => void;
  onSaved: (row: AdminFaq) => void;
}) {
  const formId = useId();
  const listId = useId();
  const [draft, setDraft] = useState(() => ({
    slug: record?.slug ?? "",
    slugTouched: Boolean(record),
    category: record?.category ?? "",
    question: record?.question ?? "",
    answer: record?.answer ?? "",
    displayOrder: String(record?.displayOrder ?? nextOrder),
    active: record?.active ?? true,
  }));
  const save = useMutation((body: unknown) => (record ? adminApi.patch<AdminFaq>(`/faqs/${record.id}`, body) : adminApi.post<AdminFaq>("/faqs", body)));
  const errors = save.fieldErrors;
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    const result = await save.run({
      slug: draft.slug.trim(),
      category: draft.category,
      question: draft.question,
      answer: draft.answer,
      displayOrder: toDisplayOrder(draft.displayOrder),
      active: draft.active,
    });
    if (result) {
      toast({ title: record ? "FAQ updated" : "FAQ added", tone: "success" });
      onSaved(result);
    }
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      size="lg"
      title={readOnly ? "FAQ" : record ? "Edit FAQ" : "New FAQ"}
      description={readOnly ? "You can view FAQs but not change them." : undefined}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={save.pending}>
            {readOnly ? "Close" : "Cancel"}
          </AdminButton>
          {!readOnly && (
            <AdminButton type="submit" form={formId} variant="primary" loading={save.pending}>
              {record ? "Save changes" : "Add FAQ"}
            </AdminButton>
          )}
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <ErrorSummary error={save.error} />
        <fieldset disabled={readOnly} className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          <TextInput
            label="Question"
            required
            maxLength={300}
            containerClassName="sm:col-span-2"
            value={draft.question}
            error={errors.question}
            onChange={(event) => set({ question: event.target.value, ...(draft.slugTouched ? {} : { slug: slugify(event.target.value).slice(0, 80).replace(/-+$/, "") }) })}
          />
          <TextArea label="Answer" required rows={6} maxLength={3000} containerClassName="sm:col-span-2" value={draft.answer} error={errors.answer} onChange={(event) => set({ answer: event.target.value })} />
          <TextInput label="Category" required maxLength={60} list={listId} placeholder="Pricing" value={draft.category} error={errors.category} onChange={(event) => set({ category: event.target.value })} />
          <datalist id={listId}>
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <TextInput
            label="Anchor"
            required
            maxLength={160}
            value={draft.slug}
            error={errors.slug}
            hint={record ? "Changing this breaks existing links to the question." : "Used to link straight to this question. Filled in from the question."}
            onChange={(event) => set({ slug: event.target.value.toLowerCase().replace(/\s+/g, "-"), slugTouched: true })}
          />
          <NumberInput label="Display order" min={0} max={1000} step={1} value={draft.displayOrder} error={errors.displayOrder} onChange={(event) => set({ displayOrder: event.target.value })} />
          <div className="flex items-end pb-2">
            <CheckboxInput label="Active" description="Show on the website." checked={draft.active} onChange={(event) => set({ active: event.target.checked })} />
          </div>
        </fieldset>
      </form>
    </AdminDialog>
  );
}
