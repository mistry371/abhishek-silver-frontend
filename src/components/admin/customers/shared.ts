import type { AdminApiError } from "@/lib/admin/client";
import { humanize, purityLabels } from "@/lib/admin/format";

export interface Option {
  value: string;
  label: string;
}

const plainOptions = (values: string[]): Option[] => values.map((value) => ({ value, label: value }));

/* Customers ---------------------------------------------------------- */

export const customerStatusOptions: Option[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "blocked", label: "Blocked" },
];

export const customerSourceOptions: Option[] = [
  { value: "website", label: "Website" },
  { value: "walk_in", label: "Walk-in" },
  { value: "admin", label: "Added by staff" },
];

/** Sources staff can choose when adding a customer (website customers sign up themselves). */
export const newCustomerSourceOptions = customerSourceOptions.filter((option) => option.value !== "website");

/* Enquiries ---------------------------------------------------------- */

export const enquiryStatusOptions: Option[] = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In progress" },
  { value: "responded", label: "Responded" },
  { value: "closed", label: "Closed" },
];

export const enquiryTypeOptions: Option[] = [
  { value: "product", label: "Product enquiry" },
  { value: "custom_jewellery", label: "Custom jewellery" },
  { value: "contact", label: "General enquiry" },
];

export const enquirySourceOptions: Option[] = [
  { value: "website_form", label: "Website form" },
  { value: "product_page", label: "Product page" },
  { value: "custom_jewellery", label: "Custom jewellery form" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "walk_in", label: "Walk-in" },
];

/** Channels staff can log an enquiry from. */
export const manualEnquirySourceOptions = enquirySourceOptions.filter((option) => ["whatsapp", "phone", "walk_in"].includes(option.value));

export const preferredContactOptions: Option[] = [
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
];

export const contactChannelOptions: Option[] = [
  { value: "phone", label: "Phone call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "in_person", label: "In person" },
];

/** Same choices as the storefront custom jewellery form, so captured values stay consistent. */
export const jewelleryTypeOptions = plainOptions(["Ring", "Earrings", "Necklace", "Chain", "Bracelet", "Bangles / Kada", "Pendant", "Mangalsutra", "Bridal set", "Other"]);
export const budgetRangeOptions = plainOptions(["Under ₹25,000", "₹25,000 – ₹50,000", "₹50,000 – ₹1,00,000", "₹1,00,000 – ₹2,50,000", "₹2,50,000 – ₹5,00,000", "Above ₹5,00,000", "Not sure yet"]);
export const metalOptions = plainOptions(["Gold", "Silver", "Not sure"]);
export const purityOptionsByMetal: Record<string, Option[]> = {
  Gold: plainOptions(["22KT", "18KT", "Not sure"]),
  Silver: plainOptions(["925 Sterling", "999 Fine", "Not sure"]),
  "Not sure": plainOptions(["Not sure"]),
};

/* Helpers ------------------------------------------------------------ */

export function labelOf(list: Option[], value: string | null | undefined) {
  if (!value) return "—";
  return list.find((option) => option.value === value)?.label ?? humanize(value);
}

export const purityLabel = (value: string | null | undefined) => (value ? (purityLabels[value] ?? value) : "—");

/** Stored mobiles are 10-digit Indian numbers; links need the country code. */
export function internationalMobile(mobile: string) {
  const digits = mobile.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

export const telHref = (mobile: string) => `tel:+${internationalMobile(mobile)}`;
export const whatsappHref = (mobile: string) => `https://wa.me/${internationalMobile(mobile)}`;

/**
 * Message for a form-level alert: the API message when there are no field
 * errors, or any field errors that the form doesn't show next to a field.
 */
export function formAlert(error: AdminApiError | null | undefined, knownFields: readonly string[]): string | null {
  if (!error) return null;
  const fieldErrors = error.fieldErrors ?? {};
  const keys = Object.keys(fieldErrors);
  if (!keys.length) return error.message;
  const other = keys.filter((key) => !knownFields.includes(key)).map((key) => fieldErrors[key]);
  return other.length ? other.join(" ") : null;
}

export function fileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
