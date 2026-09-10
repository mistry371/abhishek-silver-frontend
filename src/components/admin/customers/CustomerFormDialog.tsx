"use client";

import { useId, useState, type FormEvent } from "react";
import { CheckboxInput, SelectInput, TextInput } from "@/components/admin/fields";
import { AdminButton, AdminDialog, InlineAlert } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { useMutation } from "@/lib/admin/hooks";
import { customerStatusOptions, formAlert, newCustomerSourceOptions } from "./shared";
import type { CustomerProfile, CustomerRecord } from "./types";

const KNOWN_FIELDS = ["firstName", "lastName", "phone", "email", "status", "marketingOptIn", "source"] as const;

interface CustomerValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  status: string;
  marketingOptIn: boolean;
  source: string;
}

/**
 * Adds a customer (walk-in / staff-created) or edits an existing profile.
 * Give it a new `key` each time it opens so the form starts fresh.
 */
export function CustomerFormDialog({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer?: CustomerProfile;
  onSaved: (record: CustomerRecord) => void;
}) {
  const formId = useId();
  const emailLocked = Boolean(customer?.hasAccount);
  const [values, setValues] = useState<CustomerValues>({
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    status: customer?.status ?? "active",
    marketingOptIn: customer?.marketingOptIn ?? false,
    source: "walk_in",
  });
  const set = <K extends keyof CustomerValues>(key: K, value: CustomerValues[K]) => setValues((current) => ({ ...current, [key]: value }));

  const mutation = useMutation((body: Record<string, unknown>) =>
    customer ? adminApi.patch<CustomerRecord>(`/customers/${customer.id}`, body) : adminApi.post<CustomerRecord>("/customers", body),
  );
  const errors = mutation.fieldErrors;
  const alert = formAlert(mutation.error, KNOWN_FIELDS);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body: Record<string, unknown> = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim() || null,
      status: values.status,
      marketingOptIn: values.marketingOptIn,
    };
    // The sign-in email of an online account can only be changed by the customer.
    if (!emailLocked) body.email = values.email.trim() || null;
    if (!customer) body.source = values.source;
    const record = await mutation.run(body);
    if (!record) return;
    toast({ title: customer ? "Profile updated" : `Customer ${record.customerCode} added`, tone: "success" });
    onSaved(record);
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={customer ? "Edit profile" : "Add customer"}
      description={customer ? `${customer.name} · ${customer.customerCode}` : "For walk-in or phone customers. Add a mobile number or email so they can be found later."}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={mutation.pending}>
            {customer ? "Save changes" : "Add customer"}
          </AdminButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextInput label="First name" required maxLength={60} autoComplete="off" value={values.firstName} onChange={(event) => set("firstName", event.target.value)} error={errors.firstName} />
        <TextInput label="Last name" maxLength={60} autoComplete="off" value={values.lastName} onChange={(event) => set("lastName", event.target.value)} error={errors.lastName} />
        <TextInput
          label="Mobile"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="10-digit mobile number"
          value={values.phone}
          onChange={(event) => set("phone", event.target.value)}
          error={errors.phone}
        />
        <TextInput
          label="Email"
          type="email"
          autoComplete="off"
          value={values.email}
          disabled={emailLocked}
          onChange={(event) => set("email", event.target.value)}
          error={errors.email}
          hint={emailLocked ? "Sign-in email for their online account — the customer changes it from their account." : undefined}
        />
        <SelectInput label="Status" options={customerStatusOptions} value={values.status} onChange={(event) => set("status", event.target.value)} error={errors.status} />
        {!customer && <SelectInput label="Source" options={newCustomerSourceOptions} value={values.source} onChange={(event) => set("source", event.target.value)} error={errors.source} />}
        <CheckboxInput
          className="sm:col-span-2"
          label="Marketing opt-in"
          description="The customer agreed to receive offers and updates."
          checked={values.marketingOptIn}
          onChange={(event) => set("marketingOptIn", event.target.checked)}
        />
        {alert && <InlineAlert className="sm:col-span-2">{alert}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}
