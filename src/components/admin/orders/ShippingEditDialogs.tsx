"use client";

import { useState, type FormEvent } from "react";
import { TextInput } from "@/components/admin/fields";
import { AdminButton, AdminDialog, InlineAlert } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { useMutation } from "@/lib/admin/hooks";
import { dialogError } from "./errors";
import type { AddressSnapshot, OrderDetail } from "./types";

export function AddressView({ address }: { address: AddressSnapshot | null | undefined }) {
  if (!address) return <p className="text-[0.8125rem] text-muted">—</p>;
  return (
    <address className="text-[0.8125rem] not-italic leading-relaxed text-ink">
      <span className="block font-medium">{address.fullName}</span>
      <span className="block">{address.line1}</span>
      {address.line2 && <span className="block">{address.line2}</span>}
      {address.landmark && <span className="block text-ink-soft">Landmark: {address.landmark}</span>}
      <span className="block">
        {address.city}, {address.state} {address.postalCode}
      </span>
      <span className="block">{address.country}</span>
      {address.phone && (
        <a href={`tel:${address.phone}`} className="mt-1 block text-champagne-deep hover:underline">
          {address.phone}
        </a>
      )}
    </address>
  );
}

type AddressForm = Record<"fullName" | "phone" | "line1" | "line2" | "landmark" | "city" | "state" | "postalCode" | "country", string>;

const addressFields: { key: keyof AddressForm; label: string; required?: boolean; max: number; wide?: boolean; inputMode?: "tel" | "numeric" }[] = [
  { key: "fullName", label: "Full name", required: true, max: 120 },
  { key: "phone", label: "Mobile number", required: true, max: 20, inputMode: "tel" },
  { key: "line1", label: "Address line 1", required: true, max: 200, wide: true },
  { key: "line2", label: "Address line 2", max: 200, wide: true },
  { key: "landmark", label: "Landmark", max: 200, wide: true },
  { key: "city", label: "City", required: true, max: 80 },
  { key: "state", label: "State", required: true, max: 80 },
  { key: "postalCode", label: "PIN code", required: true, max: 6, inputMode: "numeric" },
  { key: "country", label: "Country", required: true, max: 60 },
];

/** Edits the delivery address (server rejects this after dispatch). */
export function ShippingAddressDialog({ order, onClose, onDone }: { order: OrderDetail; onClose: () => void; onDone: (order: OrderDetail) => void }) {
  const current = order.shippingAddress;
  const [form, setForm] = useState<AddressForm>({
    fullName: current?.fullName ?? "",
    phone: current?.phone ?? "",
    line1: current?.line1 ?? "",
    line2: current?.line2 ?? "",
    landmark: current?.landmark ?? "",
    city: current?.city ?? "",
    state: current?.state ?? "",
    postalCode: current?.postalCode ?? "",
    country: current?.country || "India",
  });
  const mutation = useMutation((shippingAddress: AddressForm) => adminApi.patch<OrderDetail>(`/orders/${order.id}`, { shippingAddress }));

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const trimmed = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()])) as AddressForm;
    const result = await mutation.run(trimmed);
    if (!result) return;
    toast({ title: "Shipping address updated", tone: "success" });
    onDone(result);
  }

  const fieldErrors = mutation.fieldErrors;
  const error = dialogError(mutation.error, (key) => key.startsWith("shippingAddress."));

  return (
    <AdminDialog
      open
      size="lg"
      onClose={mutation.pending ? () => undefined : onClose}
      title="Edit shipping address"
      description="Changes the delivery address on this order only. The customer's saved addresses aren't touched."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={() => submit()} loading={mutation.pending}>
            Save address
          </AdminButton>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {addressFields.map((field) => (
          <TextInput
            key={field.key}
            label={field.label}
            required={field.required}
            maxLength={field.max}
            inputMode={field.inputMode}
            containerClassName={field.wide ? "sm:col-span-2" : undefined}
            value={form[field.key]}
            onChange={(event) => setForm((previous) => ({ ...previous, [field.key]: event.target.value }))}
            error={fieldErrors[`shippingAddress.${field.key}`]}
          />
        ))}
        {error && <InlineAlert className="sm:col-span-2">{error}</InlineAlert>}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </AdminDialog>
  );
}

/** Edits carrier and tracking number at any stage. */
export function TrackingDialog({ order, onClose, onDone }: { order: OrderDetail; onClose: () => void; onDone: (order: OrderDetail) => void }) {
  const [carrier, setCarrier] = useState(order.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? "");
  const mutation = useMutation((body: { carrier: string | null; trackingNumber: string | null }) => adminApi.patch<OrderDetail>(`/orders/${order.id}`, body));

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const result = await mutation.run({ carrier: carrier.trim() || null, trackingNumber: trackingNumber.trim() || null });
    if (!result) return;
    toast({ title: "Shipping details updated", tone: "success" });
    onDone(result);
  }

  const error = dialogError(mutation.error, (key) => key === "carrier" || key === "trackingNumber");

  return (
    <AdminDialog
      open
      onClose={mutation.pending ? () => undefined : onClose}
      title="Shipping details"
      description="Carrier and tracking number shared with the customer."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={() => submit()} loading={mutation.pending}>
            Save
          </AdminButton>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <TextInput label="Carrier" maxLength={80} value={carrier} onChange={(event) => setCarrier(event.target.value)} error={mutation.fieldErrors.carrier} placeholder="e.g. Blue Dart" />
        <TextInput label="Tracking number" maxLength={80} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} error={mutation.fieldErrors.trackingNumber} />
        {error && <InlineAlert>{error}</InlineAlert>}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </AdminDialog>
  );
}
