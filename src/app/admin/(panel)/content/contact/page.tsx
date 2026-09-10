"use client";

import { FormSection, TextInput } from "@/components/admin/fields";
import { ContentDocumentPage } from "@/components/admin/content/DocumentEditor";
import { errorAt, scopeErrors } from "@/components/admin/content/errors";
import { ImageField } from "@/components/admin/content/fields";
import { ListEditor, StringListEditor } from "@/components/admin/content/ListEditor";
import type { ContactDoc } from "@/components/admin/content/types";
import { InlineAlert } from "@/components/admin/ui";

const emptyContact = (): ContactDoc => ({
  storeId: "main-store",
  storeName: "",
  addressLines: [""],
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  mapQuery: "",
  phones: [],
  whatsappNumber: "",
  email: "",
  hours: [],
});

/** "+91 99985 55281" / "099985 55281" / "9998555281" → "tel:+919998555281" */
function telHref(display: string) {
  const digits = display.replace(/\D/g, "");
  if (!digits) return "";
  if (display.trim().startsWith("+")) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `tel:+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `tel:+${digits}`;
  return `tel:+${digits}`;
}

export default function ContactContentPage() {
  return (
    <ContentDocumentPage<ContactDoc>
      path="/content/contact"
      title="Contact details"
      description="Store address, phone numbers, WhatsApp, email, opening hours and store photo."
      emptyValue={emptyContact}
      notice={
        <InlineAlert tone="info">
          These details appear on the website&apos;s Contact page, in the footer, on WhatsApp buttons and in the map. Double-check every number before saving — customers use them to reach the store.
        </InlineAlert>
      }
    >
      {({ value, set, errors }) => (
        <>
          <FormSection title="Store & address">
            <TextInput label="Store name" required maxLength={120} containerClassName="sm:col-span-2" value={value.storeName} error={errors.storeName} onChange={(event) => set("storeName", event.target.value)} />
            <StringListEditor
              label="Address lines"
              description="Building, street and landmark. 1 to 4 lines."
              items={value.addressLines}
              multiline={false}
              min={1}
              max={4}
              maxLength={160}
              itemLabel="Address line"
              addLabel="Add line"
              errors={scopeErrors(errors, "addressLines")}
              onChange={(addressLines) => set("addressLines", addressLines)}
            />
            <TextInput label="City" required maxLength={80} value={value.city} error={errors.city} onChange={(event) => set("city", event.target.value)} />
            <TextInput label="State" required maxLength={80} value={value.state} error={errors.state} onChange={(event) => set("state", event.target.value)} />
            <TextInput label="PIN code" required inputMode="numeric" maxLength={12} value={value.postalCode} error={errors.postalCode} onChange={(event) => set("postalCode", event.target.value)} />
            <TextInput label="Country" required maxLength={60} value={value.country} error={errors.country} onChange={(event) => set("country", event.target.value)} />
            <TextInput
              label="Map search text"
              required
              maxLength={300}
              containerClassName="sm:col-span-2"
              hint="What Google Maps should search for — usually the store name with its full address."
              value={value.mapQuery}
              error={errors.mapQuery}
              onChange={(event) => set("mapQuery", event.target.value)}
            />
          </FormSection>

          <FormSection title="Phone, WhatsApp & email">
            <ListEditor
              label="Phone numbers"
              description="Up to 4. The call link is built from the number automatically."
              items={value.phones}
              max={4}
              addLabel="Add phone number"
              error={errors.phones}
              emptyText="No phone numbers added."
              onChange={(phones) => set("phones", phones)}
              createItem={() => ({ display: "", href: "" })}
              itemTitle={(phone, index) => phone.display || `Phone ${index + 1}`}
              renderItem={(phone, index, update) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput
                    label="Number as shown"
                    required
                    type="tel"
                    maxLength={30}
                    placeholder="+91 98765 43210"
                    value={phone.display}
                    error={errors[`phones.${index}.display`]}
                    onChange={(event) => update({ display: event.target.value, href: telHref(event.target.value) })}
                  />
                  <TextInput
                    label="Call link"
                    required
                    maxLength={20}
                    placeholder="tel:+919876543210"
                    hint="Updated automatically when the number changes."
                    value={phone.href}
                    error={errors[`phones.${index}.href`] ? "Use tel: followed by the number with country code, e.g. tel:+919876543210." : undefined}
                    onChange={(event) => update({ ...phone, href: event.target.value.trim() })}
                  />
                </div>
              )}
            />
            <TextInput
              label="WhatsApp number"
              required
              inputMode="numeric"
              maxLength={15}
              placeholder="919876543210"
              hint="Digits only, including the country code (91 for India). No + or spaces."
              value={value.whatsappNumber}
              error={errors.whatsappNumber}
              onChange={(event) => set("whatsappNumber", event.target.value.replace(/\D/g, ""))}
            />
            <TextInput label="Email" type="email" maxLength={200} hint="Leave empty to hide email on the website." value={value.email} error={errors.email} onChange={(event) => set("email", event.target.value.trim())} />
          </FormSection>

          <FormSection title="Opening hours">
            <ListEditor
              items={value.hours}
              max={10}
              addLabel="Add hours row"
              error={errors.hours}
              emptyText="No opening hours added."
              onChange={(hours) => set("hours", hours)}
              createItem={() => ({ label: "", value: "" })}
              itemTitle={(row, index) => row.label || `Row ${index + 1}`}
              renderItem={(row, index, update) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextInput label="Days" required maxLength={60} placeholder="Monday – Saturday" value={row.label} error={errors[`hours.${index}.label`]} onChange={(event) => update({ ...row, label: event.target.value })} />
                  <TextInput label="Hours" required maxLength={120} placeholder="11:00 AM – 9:00 PM" value={row.value} error={errors[`hours.${index}.value`]} onChange={(event) => update({ ...row, value: event.target.value })} />
                </div>
              )}
            />
          </FormSection>

          <FormSection title="Store photo">
            <ImageField label="Store image" required value={value.image} error={errorAt(errors, "image")} onChange={(image) => set("image", image)} />
          </FormSection>
        </>
      )}
    </ContentDocumentPage>
  );
}
