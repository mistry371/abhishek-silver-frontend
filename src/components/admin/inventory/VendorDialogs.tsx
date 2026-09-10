"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { AdminButton, AdminDialog, AdminLinkButton, ErrorState, InlineAlert, KeyValue, LoadingBlock, StatusBadge } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { AdminApiError, adminApi, errorMessage } from "@/lib/admin/client";
import { formatDate, formatDateTime, money } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";
import { vendorStatusOptions } from "./options";
import type { Vendor, VendorDetail } from "./types";

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const toForm = (vendor: Vendor | null) => ({
  name: vendor?.name ?? "",
  contactPerson: vendor?.contactPerson ?? "",
  mobile: vendor?.mobile ?? "",
  email: vendor?.email ?? "",
  gstin: vendor?.gstin ?? "",
  address: vendor?.address ?? "",
  status: vendor?.status ?? "active",
  notes: vendor?.notes ?? "",
});

type VendorForm = ReturnType<typeof toForm>;

/** Create (vendor = null) or edit a vendor. Mount with a `key` so state resets per vendor. */
export function VendorFormDialog({ open, vendor, onClose, onSaved }: { open: boolean; vendor: Vendor | null; onClose: () => void; onSaved: (vendor: Vendor) => void }) {
  const [form, setForm] = useState<VendorForm>(() => toForm(vendor));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof VendorForm) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Enter the vendor name.";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.gstin.trim() && !GSTIN.test(form.gstin.trim().toUpperCase())) next.gstin = "Enter a valid 15-character GSTIN.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim() || null,
      mobile: form.mobile.trim() || null,
      email: form.email.trim() || null,
      gstin: form.gstin.trim().toUpperCase() || null,
      address: form.address.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
    };
    setSaving(true);
    try {
      const saved = vendor ? await adminApi.patch<Vendor>(`/vendors/${vendor.id}`, payload) : await adminApi.post<Vendor>("/vendors", payload);
      toast({ title: vendor ? "Vendor updated" : "Vendor added", description: `${saved.code} · ${saved.name}`, tone: "success" });
      onSaved(saved);
    } catch (caught) {
      if (caught instanceof AdminApiError) {
        setErrors(caught.fieldErrors ?? {});
        setFormError(caught.message);
      } else {
        setFormError(errorMessage(caught));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      open={open}
      onClose={() => !saving && onClose()}
      size="lg"
      title={vendor ? `Edit ${vendor.name}` : "New vendor"}
      description={vendor ? vendor.code : "Vendor details are confidential and only visible to staff with vendor access."}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form="vendor-form" variant="primary" loading={saving}>
            {vendor ? "Save changes" : "Add vendor"}
          </AdminButton>
        </>
      }
    >
      <form id="vendor-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {formError && <InlineAlert className="sm:col-span-2">{formError}</InlineAlert>}
        <TextInput label="Vendor name" required maxLength={160} value={form.name} onChange={set("name")} error={errors.name} containerClassName="sm:col-span-2" />
        <TextInput label="Contact person" maxLength={120} value={form.contactPerson} onChange={set("contactPerson")} error={errors.contactPerson} />
        <TextInput label="Mobile" type="tel" inputMode="tel" maxLength={20} value={form.mobile} onChange={set("mobile")} error={errors.mobile} placeholder="10-digit mobile" />
        <TextInput label="Email" type="email" maxLength={160} value={form.email} onChange={set("email")} error={errors.email} />
        <TextInput label="GSTIN" maxLength={15} value={form.gstin} onChange={set("gstin")} error={errors.gstin} className="uppercase" placeholder="22AAAAA0000A1Z5" />
        <TextArea label="Address" rows={2} maxLength={500} value={form.address} onChange={set("address")} error={errors.address} containerClassName="sm:col-span-2" />
        <SelectInput label="Status" value={form.status} onChange={set("status")} options={vendorStatusOptions} error={errors.status} hint="Inactive vendors can't be used on new purchases." />
        <TextArea label="Notes" rows={3} maxLength={2000} value={form.notes} onChange={set("notes")} error={errors.notes} containerClassName="sm:col-span-2" />
      </form>
    </AdminDialog>
  );
}

/** Vendor details with recent purchases (`GET /vendors/:id`). */
export function VendorDetailDialog({ vendorId, onClose, onEdit }: { vendorId: string | null; onClose: () => void; onEdit?: (vendor: Vendor) => void }) {
  const { can } = useAdmin();
  const resource = useAdminResource<VendorDetail>(vendorId ? `/vendors/${vendorId}` : null);
  const vendor = resource.data;

  return (
    <AdminDialog
      open={Boolean(vendorId)}
      onClose={onClose}
      size="lg"
      title={vendor?.name ?? "Vendor"}
      description={vendor ? vendor.code : undefined}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose}>
            Close
          </AdminButton>
          {vendor && vendor.status === "active" && can("purchases:create") && (
            <AdminLinkButton href={`/admin/purchases/new?vendorId=${vendor.id}`}>New purchase</AdminLinkButton>
          )}
          {vendor && onEdit && can("vendors:manage") && (
            <AdminButton variant="primary" onClick={() => onEdit(vendor)}>
              Edit vendor
            </AdminButton>
          )}
        </>
      }
    >
      {resource.error && <ErrorState error={resource.error} onRetry={resource.reload} />}
      {!vendor && !resource.error && <LoadingBlock rows={4} />}
      {vendor && (
        <div className="space-y-6">
          <KeyValue
            items={[
              { label: "Status", value: <StatusBadge status={vendor.status} /> },
              { label: "Contact person", value: vendor.contactPerson ?? "—" },
              { label: "Mobile", value: vendor.mobile ?? "—" },
              { label: "Email", value: vendor.email ?? "—" },
              { label: "GSTIN", value: vendor.gstin ?? "—" },
              { label: "Added", value: formatDate(vendor.createdAt) },
              { label: "Address", value: vendor.address ? <span className="whitespace-pre-line">{vendor.address}</span> : "—" },
              { label: "Last updated", value: formatDateTime(vendor.updatedAt) },
              { label: "Notes", value: vendor.notes ? <span className="whitespace-pre-line">{vendor.notes}</span> : "—" },
            ]}
          />
          {vendor.purchases !== null && (
            <div>
              <h3 className="mb-2 text-[0.8125rem] font-medium text-ink">Recent purchases</h3>
              {vendor.purchases.length === 0 ? (
                <p className="border border-dashed border-line px-4 py-5 text-center text-[0.8125rem] text-muted">No purchases from this vendor yet.</p>
              ) : (
                <ul className="divide-y divide-line border border-line">
                  {vendor.purchases.map((purchase) => (
                    <li key={purchase.id}>
                      <Link href={`/admin/purchases/${purchase.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[0.8125rem] hover:bg-cream/50">
                        <span>
                          <span className="font-medium text-ink">{purchase.purchaseNumber}</span>
                          <span className="ml-2 text-muted">{formatDate(purchase.purchaseDate)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <StatusBadge status={purchase.status} />
                          <span className="tabular-nums">{money(purchase.total)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </AdminDialog>
  );
}
