"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { ContactLinks } from "@/components/admin/customers/ContactLinks";
import { LogContactDialog } from "@/components/admin/customers/LogContactDialog";
import { InternalNotice, NoteComposer } from "@/components/admin/customers/NoteComposer";
import {
  contactChannelOptions,
  enquirySourceOptions,
  enquiryStatusOptions,
  enquiryTypeOptions,
  fileSize,
  formAlert,
  labelOf,
  preferredContactOptions,
  purityLabel,
  telHref,
} from "@/components/admin/customers/shared";
import type { Assignee, EnquiryDetail } from "@/components/admin/customers/types";
import { SelectInput } from "@/components/admin/fields";
import { AdminButton, ErrorState, InlineAlert, KeyValue, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";

const BACK = { href: "/admin/enquiries", label: "Enquiries" };
const PATCH_FIELDS = ["status", "assignedToAdminId", "customerId"] as const;

type EnquiryPatch = { status?: string; assignedToAdminId?: string | null; customerId?: string | null };

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { admin, can } = useAdmin();
  const canManage = can("enquiries:manage");
  const canCustomers = can("customers:view");
  const resource = useAdminResource<EnquiryDetail>(`/enquiries/${id}`);
  const assignees = useAdminResource<Assignee[]>(canManage ? "/enquiries/assignees" : null);
  const [contactDialog, setContactDialog] = useState({ open: false, key: 0 });
  const update = useMutation((patch: EnquiryPatch) => adminApi.patch<EnquiryDetail>(`/enquiries/${id}`, patch));
  const data = resource.latest?.id === id ? resource.latest : undefined;

  if (!data) {
    return (
      <>
        <PageHeader back={BACK} title="Enquiry" />
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : <LoadingBlock rows={8} />}
      </>
    );
  }

  async function applyPatch(patch: EnquiryPatch, successTitle: string) {
    const next = await update.run(patch);
    if (!next) return;
    resource.setData(next);
    toast({ title: successTitle, tone: "success" });
  }

  const updateAlert = formAlert(update.error, PATCH_FIELDS);
  const team = assignees.latest ?? [];
  const assigneeOptions = team.map((member) => ({ value: member.id, label: member.id === admin.id ? `${member.name} (you)` : member.name }));
  if (data.assignedTo && !team.some((member) => member.id === data.assignedTo?.id)) {
    assigneeOptions.push({ value: data.assignedTo.id, label: `${data.assignedTo.name ?? "Former team member"} (inactive)` });
  }
  const email = data.email || null;

  return (
    <>
      <PageHeader
        back={BACK}
        title={data.reference}
        description={`${data.name} · received ${formatDateTime(data.createdAt)}`}
        meta={
          <>
            <StatusBadge status={data.status} />
            <StatusBadge status="type" label={labelOf(enquiryTypeOptions, data.type)} tone="accent" />
            <StatusBadge status="source" label={labelOf(enquirySourceOptions, data.source)} tone="neutral" />
          </>
        }
        actions={<ContactLinks phone={data.mobile} email={email} />}
      />

      {resource.error && (
        <InlineAlert className="mb-4">
          {resource.error.message}{" "}
          <button type="button" className="underline" onClick={resource.reload}>
            Retry
          </button>
        </InlineAlert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title={data.subject || "Message"}>
            <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-ink">{data.message}</p>
          </Panel>

          <Panel title="Enquiry details">
            <KeyValue
              items={[
                { label: "Name", value: data.name },
                {
                  label: "Mobile",
                  value: (
                    <a href={telHref(data.mobile)} className="hover:underline">
                      {data.mobile}
                    </a>
                  ),
                },
                {
                  label: "Email",
                  value: email ? (
                    <a href={`mailto:${email}`} className="hover:underline">
                      {email}
                    </a>
                  ) : null,
                },
                { label: "Preferred contact", value: data.preferredContact ? labelOf(preferredContactOptions, data.preferredContact) : null },
                { label: "Type", value: labelOf(enquiryTypeOptions, data.type) },
                { label: "Source", value: labelOf(enquirySourceOptions, data.source) },
                {
                  label: "Product",
                  hidden: !data.product,
                  value: data.product ? (
                    can("products:view") ? (
                      <Link href={`/admin/products/${data.product.id}`} className="hover:underline">
                        {data.product.name} <span className="text-muted">· {data.product.sku}</span>
                      </Link>
                    ) : (
                      <>
                        {data.product.name} <span className="text-muted">· {data.product.sku}</span>
                      </>
                    )
                  ) : null,
                },
                { label: "Jewellery type", value: data.jewelleryType, hidden: !data.jewelleryType },
                { label: "Budget", value: data.budgetRange, hidden: !data.budgetRange },
                { label: "Preferred metal", value: data.preferredMetal, hidden: !data.preferredMetal },
                { label: "Preferred purity", value: purityLabel(data.preferredPurity), hidden: !data.preferredPurity },
                { label: "Received", value: formatDateTime(data.createdAt) },
                { label: "Last updated", value: formatDateTime(data.updatedAt) },
              ]}
            />
            {data.attachments.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Attachments</p>
                <ul className="mt-2 space-y-1.5">
                  {data.attachments.map((file) => (
                    <li key={file.id} className="flex items-center justify-between gap-3 text-[0.8125rem]">
                      <span className="min-w-0 truncate text-ink">{file.name}</span>
                      <span className="shrink-0 text-muted">{fileSize(file.size)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel
            title="Contact history"
            description="Calls, chats, emails and visits with this enquirer."
            flush
            actions={
              canManage && (
                <AdminButton size="sm" onClick={() => setContactDialog((current) => ({ open: true, key: current.key + 1 }))}>
                  <PlusIcon size={14} />
                  Log contact
                </AdminButton>
              )
            }
          >
            {data.contactHistory.length === 0 ? (
              <p className="px-5 py-5 text-[0.8125rem] text-muted">No contact logged yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.contactHistory.map((entry) => (
                  <li key={entry.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <StatusBadge status={entry.channel} label={labelOf(contactChannelOptions, entry.channel)} tone="info" />
                        <span className="text-[0.875rem] font-medium text-ink">{entry.outcome}</span>
                      </span>
                      <span className="text-[0.75rem] text-muted">
                        {entry.authorName} · {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    {entry.note && <p className="mt-1.5 whitespace-pre-wrap break-words text-[0.8125rem] text-ink-soft">{entry.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Internal notes" description="Context for the team while handling this enquiry.">
            <div className="space-y-5">
              <InternalNotice />
              {canManage && (
                <NoteComposer
                  onSubmit={async (body) => {
                    resource.setData(await adminApi.post<EnquiryDetail>(`/enquiries/${id}/notes`, { body }));
                  }}
                />
              )}
              {data.notes.length === 0 ? (
                <p className="text-[0.8125rem] text-muted">No internal notes yet.</p>
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {data.notes.map((note) => (
                    <li key={note.id} className="py-3.5">
                      <p className="whitespace-pre-wrap break-words text-[0.875rem] text-ink">{note.body}</p>
                      <p className="mt-1 text-[0.75rem] text-muted">
                        {note.authorName} · {formatDateTime(note.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </div>

        <div className="order-first space-y-6 lg:order-none">
          <Panel title="Handling">
            {canManage ? (
              <div className="space-y-4">
                <SelectInput
                  label="Status"
                  options={enquiryStatusOptions}
                  value={data.status}
                  disabled={update.pending}
                  onChange={(event) => applyPatch({ status: event.target.value }, `Marked as ${labelOf(enquiryStatusOptions, event.target.value).toLowerCase()}`)}
                  error={update.fieldErrors.status}
                />
                <SelectInput
                  label="Assigned to"
                  placeholder="Unassigned"
                  options={assigneeOptions}
                  value={data.assignedToAdminId ?? ""}
                  disabled={update.pending || (assignees.loading && !assignees.latest)}
                  onChange={(event) => applyPatch({ assignedToAdminId: event.target.value || null }, event.target.value ? "Enquiry assigned" : "Enquiry unassigned")}
                  error={update.fieldErrors.assignedToAdminId}
                  hint={assignees.error ? `Team list unavailable: ${assignees.error.message}` : undefined}
                />
                {data.assignedToAdminId !== admin.id && (
                  <AdminButton size="sm" variant="link" disabled={update.pending} onClick={() => applyPatch({ assignedToAdminId: admin.id }, "Assigned to you")}>
                    Assign to me
                  </AdminButton>
                )}
                {updateAlert && <InlineAlert>{updateAlert}</InlineAlert>}
              </div>
            ) : (
              <KeyValue
                columns={1}
                items={[
                  { label: "Status", value: <StatusBadge status={data.status} /> },
                  { label: "Assigned to", value: data.assignedTo?.name ?? "Unassigned" },
                ]}
              />
            )}
          </Panel>

          <Panel title="Customer">
            {!canCustomers ? (
              <p className="text-[0.8125rem] text-muted">You don&apos;t have access to customer records.</p>
            ) : data.customer ? (
              <div className="space-y-3">
                <div>
                  <Link href={`/admin/customers/${data.customer.id}`} className="text-[0.9375rem] font-medium text-ink hover:underline">
                    {data.customer.name}
                  </Link>
                  <p className="text-[0.8125rem] text-muted">{data.customer.customerCode}</p>
                </div>
                <StatusBadge status="customer" label={data.customer.linked ? "Linked to this enquiry" : "Possible match"} tone={data.customer.linked ? "success" : "warning"} />
                {!data.customer.linked && (
                  <>
                    <p className="text-[0.75rem] text-muted">Matched by mobile number or email. Link it so the enquiry shows on the customer&apos;s profile.</p>
                    {canManage && (
                      <AdminButton size="sm" variant="primary" loading={update.pending} onClick={() => applyPatch({ customerId: data.customer?.id ?? null }, "Linked to customer")}>
                        Link to this customer
                      </AdminButton>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-[0.8125rem] text-muted">No customer record matches this mobile number or email.</p>
            )}
          </Panel>
        </div>
      </div>

      {canManage && (
        <LogContactDialog
          key={contactDialog.key}
          open={contactDialog.open}
          enquiryId={data.id}
          defaultChannel={data.preferredContact ?? (data.source === "whatsapp" ? "whatsapp" : "phone")}
          onClose={() => setContactDialog((current) => ({ ...current, open: false }))}
          onSaved={(next) => {
            setContactDialog((current) => ({ ...current, open: false }));
            resource.setData(next);
          }}
        />
      )}
    </>
  );
}
