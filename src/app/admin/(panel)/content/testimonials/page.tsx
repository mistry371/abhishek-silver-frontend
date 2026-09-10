"use client";

import { useId, useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { ErrorSummary } from "@/components/admin/content/DocumentEditor";
import { errorAt } from "@/components/admin/content/errors";
import { ImageField, toDisplayOrder } from "@/components/admin/content/fields";
import type { AdminTestimonial } from "@/components/admin/content/types";
import { CheckboxInput, NumberInput, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { EditIcon, TrashIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, ConfirmDialog, DataTable, InlineAlert, PageHeader, StatusBadge } from "@/components/admin/ui";
import { PlusIcon, StarIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi, errorMessage, type ImageAsset } from "@/lib/admin/client";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";

const byOrder = (a: AdminTestimonial, b: AdminTestimonial) => a.displayOrder - b.displayOrder;

export default function TestimonialsPage() {
  const { can } = useAdmin();
  const canManage = can("content:manage");
  const { data, error, reload, setData } = useAdminResource<AdminTestimonial[]>("/testimonials");
  const [dialog, setDialog] = useState<{ open: boolean; record: AdminTestimonial | null; key: number }>({ open: false, record: null, key: 0 });
  const [deleting, setDeleting] = useState<AdminTestimonial | null>(null);
  const remove = useMutation(async (id: string) => {
    await adminApi.del(`/testimonials/${id}`);
    return true as const;
  });

  const openDialog = (record: AdminTestimonial | null) => setDialog((current) => ({ open: true, record, key: current.key + 1 }));
  const activeSamples = data?.filter((item) => item.isSample && item.active).length ?? 0;

  return (
    <>
      <PageHeader
        title="Testimonials"
        description="Customer quotes shown on the homepage. Only publish genuine reviews shared with the customer's permission."
        back={{ href: "/admin/content", label: "Website content" }}
        actions={
          canManage && (
            <AdminButton variant="primary" onClick={() => openDialog(null)}>
              <PlusIcon size={15} />
              New testimonial
            </AdminButton>
          )
        }
      />

      {activeSamples > 0 && (
        <InlineAlert tone="warning" className="mb-4">
          {activeSamples === 1 ? "1 active testimonial is" : `${activeSamples} active testimonials are`} sample placeholder copy. They stay labelled as samples on the website — replace them with real customer reviews when available.
        </InlineAlert>
      )}

      <DataTable<AdminTestimonial>
        rows={data}
        error={error}
        onRetry={reload}
        getRowKey={(row) => row.id}
        empty={{ title: "No testimonials yet", description: "Add reviews from real customers to build trust.", action: canManage ? <AdminButton onClick={() => openDialog(null)}>New testimonial</AdminButton> : undefined }}
        columns={[
          {
            key: "name",
            header: "Customer",
            cell: (row) => (
              <div className="min-w-[9rem]">
                <p className="font-medium">{row.name}</p>
                {row.location && <p className="text-[0.75rem] text-muted">{row.location}</p>}
                {row.isSample && <StatusBadge status="sample" label="Sample (placeholder)" tone="warning" className="mt-1" />}
              </div>
            ),
          },
          { key: "quote", header: "Quote", cell: (row) => <p className="line-clamp-2 min-w-[14rem] max-w-md text-ink-soft">“{row.quote}”</p> },
          {
            key: "rating",
            header: "Rating",
            cell: (row) =>
              row.rating ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <StarIcon size={13} className="text-champagne-deep" />
                  {row.rating}
                </span>
              ) : (
                <span className="text-muted">—</span>
              ),
          },
          { key: "product", header: "Product", priority: "low", cell: (row) => row.productName ?? <span className="text-muted">—</span> },
          { key: "order", header: "Order", align: "right", priority: "low", cell: (row) => row.displayOrder },
          { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.active ? "active" : "inactive"} /> },
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (row) => (
              <div className="flex justify-end gap-1">
                <AdminButton size="sm" variant="ghost" onClick={() => openDialog(row)} aria-label={`${canManage ? "Edit" : "View"} testimonial from ${row.name}`}>
                  <EditIcon size={14} />
                  {canManage ? "Edit" : "View"}
                </AdminButton>
                {canManage && (
                  <AdminButton size="sm" variant="ghost" className="hover:text-danger" onClick={() => setDeleting(row)} aria-label={`Delete testimonial from ${row.name}`}>
                    <TrashIcon size={14} />
                  </AdminButton>
                )}
              </div>
            ),
          },
        ]}
      />

      <TestimonialDialog
        key={dialog.key}
        open={dialog.open}
        record={dialog.record}
        readOnly={!canManage}
        nextOrder={(data?.reduce((max, item) => Math.max(max, item.displayOrder), 0) ?? 0) + 1}
        onClose={() => setDialog((current) => ({ ...current, open: false }))}
        onSaved={(row) => {
          setData([...(data ?? []).filter((item) => item.id !== row.id), row].sort(byOrder));
          setDialog((current) => ({ ...current, open: false }));
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          remove.clearError();
        }}
        title="Delete testimonial?"
        description={deleting ? `The quote from “${deleting.name}” will be removed from the website. This can't be undone.` : undefined}
        confirmLabel="Delete"
        tone="danger"
        pending={remove.pending}
        error={remove.error ? errorMessage(remove.error) : null}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await remove.run(deleting.id);
          if (!ok) return;
          setData((data ?? []).filter((item) => item.id !== deleting.id));
          toast({ title: "Testimonial deleted", tone: "success" });
          setDeleting(null);
        }}
      />
    </>
  );
}

function TestimonialDialog({
  open,
  record,
  readOnly,
  nextOrder,
  onClose,
  onSaved,
}: {
  open: boolean;
  record: AdminTestimonial | null;
  readOnly: boolean;
  nextOrder: number;
  onClose: () => void;
  onSaved: (row: AdminTestimonial) => void;
}) {
  const formId = useId();
  const [draft, setDraft] = useState(() => ({
    name: record?.name ?? "",
    location: record?.location ?? "",
    quote: record?.quote ?? "",
    rating: record?.rating ? String(record.rating) : "",
    image: (record?.image ?? undefined) as ImageAsset | undefined,
    productName: record?.productName ?? "",
    isSample: record?.isSample ?? false,
    displayOrder: String(record?.displayOrder ?? nextOrder),
    active: record?.active ?? true,
  }));
  const save = useMutation((body: unknown) => (record ? adminApi.patch<AdminTestimonial>(`/testimonials/${record.id}`, body) : adminApi.post<AdminTestimonial>("/testimonials", body)));
  const errors = save.fieldErrors;
  const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    const result = await save.run({
      name: draft.name,
      location: draft.location.trim() || null,
      quote: draft.quote,
      rating: draft.rating ? Number(draft.rating) : null,
      image: draft.image?.url ? draft.image : null,
      productName: draft.productName.trim() || null,
      isSample: draft.isSample,
      displayOrder: toDisplayOrder(draft.displayOrder),
      active: draft.active,
    });
    if (result) {
      toast({ title: record ? "Testimonial updated" : "Testimonial added", tone: "success" });
      onSaved(result);
    }
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      size="lg"
      title={readOnly ? "Testimonial" : record ? "Edit testimonial" : "New testimonial"}
      description={readOnly ? "You can view testimonials but not change them." : undefined}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={save.pending}>
            {readOnly ? "Close" : "Cancel"}
          </AdminButton>
          {!readOnly && (
            <AdminButton type="submit" form={formId} variant="primary" loading={save.pending}>
              {record ? "Save changes" : "Add testimonial"}
            </AdminButton>
          )}
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate>
        <ErrorSummary error={save.error} />
        <fieldset disabled={readOnly} className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
          <TextInput label="Customer name" required maxLength={80} value={draft.name} error={errors.name} hint="Use how the customer agreed to be named, e.g. “Priya S.”" onChange={(event) => set({ name: event.target.value })} />
          <TextInput label="Location" maxLength={80} placeholder="Surat" value={draft.location} error={errors.location} onChange={(event) => set({ location: event.target.value })} />
          <TextArea label="Quote" required rows={4} maxLength={800} containerClassName="sm:col-span-2" value={draft.quote} error={errors.quote} onChange={(event) => set({ quote: event.target.value })} />
          <SelectInput
            label="Rating"
            value={draft.rating}
            error={errors.rating}
            placeholder="No rating"
            options={[5, 4, 3, 2, 1].map((stars) => ({ value: String(stars), label: `${stars} star${stars === 1 ? "" : "s"}` }))}
            onChange={(event) => set({ rating: event.target.value })}
          />
          <TextInput label="Product name" maxLength={120} value={draft.productName} error={errors.productName} hint="Optional — the piece the customer bought." onChange={(event) => set({ productName: event.target.value })} />
          <ImageField label="Photo" hint="Optional. Only with the customer's permission." value={draft.image} error={errorAt(errors, "image")} onChange={(image) => set({ image })} />
          <NumberInput label="Display order" min={0} max={1000} step={1} value={draft.displayOrder} error={errors.displayOrder} onChange={(event) => set({ displayOrder: event.target.value })} />
          <div className="flex items-end pb-2">
            <CheckboxInput label="Active" description="Show on the website." checked={draft.active} onChange={(event) => set({ active: event.target.checked })} />
          </div>
          <div className="border border-warning/30 bg-warning/5 p-3 sm:col-span-2">
            <CheckboxInput
              label="Sample (placeholder) testimonial"
              description="Placeholder copy is labelled as a sample on the website so it's never mistaken for a real review."
              checked={draft.isSample}
              onChange={(event) => set({ isSample: event.target.checked })}
            />
            {record?.isSample && !draft.isSample && (
              <p className="mt-2 text-[0.75rem] text-warning">Only untick this if the quote is a genuine review from a real customer, shared with their permission.</p>
            )}
          </div>
        </fieldset>
      </form>
    </AdminDialog>
  );
}
