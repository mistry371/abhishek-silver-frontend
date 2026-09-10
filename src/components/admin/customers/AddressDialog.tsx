"use client";

import { useId, useState, type FormEvent } from "react";
import { CheckboxInput, TextInput } from "@/components/admin/fields";
import { AdminButton, AdminDialog, InlineAlert } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { useMutation } from "@/lib/admin/hooks";
import { formAlert } from "./shared";
import type { CustomerAddress } from "./types";

const KNOWN_FIELDS = ["label", "fullName", "phone", "line1", "line2", "landmark", "city", "state", "postalCode", "country", "isDefaultShipping", "isDefaultBilling"] as const;

interface AddressValues {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

/** Adds an address to a customer. Give it a new `key` each time it opens. */
export function AddressDialog({
  open,
  onClose,
  customerId,
  defaults,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customerId: string;
  defaults: { fullName: string; phone: string };
  onSaved: (addresses: CustomerAddress[]) => void;
}) {
  const formId = useId();
  const [values, setValues] = useState<AddressValues>({
    label: "",
    fullName: defaults.fullName,
    phone: defaults.phone,
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    isDefaultShipping: false,
    isDefaultBilling: false,
  });
  const set = <K extends keyof AddressValues>(key: K, value: AddressValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const mutation = useMutation((body: Record<string, unknown>) => adminApi.post<CustomerAddress[]>(`/customers/${customerId}/addresses`, body));
  const errors = mutation.fieldErrors;
  const alert = formAlert(mutation.error, KNOWN_FIELDS);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const addresses = await mutation.run({
      label: values.label.trim() || undefined,
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      line1: values.line1.trim(),
      line2: values.line2.trim() || undefined,
      landmark: values.landmark.trim() || undefined,
      city: values.city.trim(),
      state: values.state.trim(),
      postalCode: values.postalCode.trim(),
      country: values.country.trim() || "India",
      isDefaultShipping: values.isDefaultShipping,
      isDefaultBilling: values.isDefaultBilling,
    });
    if (!addresses) return;
    toast({ title: "Address added", tone: "success" });
    onSaved(addresses);
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Add address"
      description="The first address becomes the default for shipping and billing."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={mutation.pending}>
            Save address
          </AdminButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Full name" required maxLength={120} value={values.fullName} onChange={(event) => set("fullName", event.target.value)} error={errors.fullName} />
        <TextInput label="Mobile" required type="tel" inputMode="tel" value={values.phone} onChange={(event) => set("phone", event.target.value)} error={errors.phone} />
        <TextInput label="Address line 1" required maxLength={200} containerClassName="sm:col-span-2" value={values.line1} onChange={(event) => set("line1", event.target.value)} error={errors.line1} />
        <TextInput label="Address line 2" maxLength={200} containerClassName="sm:col-span-2" value={values.line2} onChange={(event) => set("line2", event.target.value)} error={errors.line2} />
        <TextInput label="Landmark" maxLength={200} value={values.landmark} onChange={(event) => set("landmark", event.target.value)} error={errors.landmark} />
        <TextInput label="Label" maxLength={40} placeholder="Home, Office…" value={values.label} onChange={(event) => set("label", event.target.value)} error={errors.label} />
        <TextInput label="City" required maxLength={80} value={values.city} onChange={(event) => set("city", event.target.value)} error={errors.city} />
        <TextInput label="State" required maxLength={80} value={values.state} onChange={(event) => set("state", event.target.value)} error={errors.state} />
        <TextInput label="PIN code" required inputMode="numeric" maxLength={6} value={values.postalCode} onChange={(event) => set("postalCode", event.target.value)} error={errors.postalCode} />
        <TextInput label="Country" maxLength={60} value={values.country} onChange={(event) => set("country", event.target.value)} error={errors.country} />
        <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:gap-6">
          <CheckboxInput label="Default shipping address" checked={values.isDefaultShipping} onChange={(event) => set("isDefaultShipping", event.target.checked)} />
          <CheckboxInput label="Default billing address" checked={values.isDefaultBilling} onChange={(event) => set("isDefaultBilling", event.target.checked)} />
        </div>
        {alert && <InlineAlert className="sm:col-span-2">{alert}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}
