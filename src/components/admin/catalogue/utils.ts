import { AdminApiError } from "@/lib/admin/client";
import { humanize, metalLabels, purityLabels, puritiesByMetal } from "@/lib/admin/format";
import type { CategoryGroup, CustomizationKey, FlagKey, Gender, ListingRule, MakingType, SizingType } from "./types";

export type Option = { value: string; label: string };

export const PRODUCT_STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "disabled", label: "Disabled" },
];

export const PARENT_STATUS_OPTIONS: Option[] = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
];

export const STOCK_FILTER_OPTIONS: Option[] = [
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

export const METAL_OPTIONS: Option[] = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
];

export const GENDERS: Gender[] = ["women", "men", "kids", "unisex"];
export const genderLabels: Record<Gender, string> = { women: "Women", men: "Men", kids: "Kids", unisex: "Unisex" };
export const GENDER_OPTIONS: Option[] = GENDERS.map((value) => ({ value, label: genderLabels[value] }));

export const FLAG_KEYS: FlagKey[] = ["featured", "bestSeller", "trending", "newArrival", "limited"];
export const flagLabels: Record<FlagKey, string> = {
  featured: "Featured",
  bestSeller: "Best seller",
  trending: "Trending",
  newArrival: "New arrival",
  limited: "Limited edition",
};

export const MAKING_TYPE_OPTIONS: { value: MakingType; label: string }[] = [
  { value: "per_gram", label: "Per gram (₹/g)" },
  { value: "percentage", label: "Percentage of metal value" },
  { value: "fixed", label: "Fixed amount (₹)" },
];

export const SIZING_OPTIONS: { value: SizingType; label: string }[] = [
  { value: "ring", label: "Ring size" },
  { value: "bangle", label: "Bangle size (inches)" },
  { value: "chain", label: "Chain length (inches)" },
  { value: "bracelet", label: "Bracelet length (inches)" },
];

export const CUSTOMIZATION_OPTIONS: { value: CustomizationKey; label: string; description: string }[] = [
  { value: "engraving", label: "Engraving", description: "Customer enters up to 12 characters." },
  { value: "initial", label: "Initial", description: "Customer picks a letter A–Z." },
  { value: "note", label: "Special request", description: "Free-text note the team confirms before processing." },
];

export const CATEGORY_GROUP_OPTIONS: { value: CategoryGroup; label: string }[] = [
  { value: "type", label: "Jewellery type" },
  { value: "metal", label: "Metal" },
  { value: "audience", label: "Audience" },
  { value: "service", label: "Service" },
];
export const groupLabels: Record<CategoryGroup, string> = { type: "Jewellery type", metal: "Metal", audience: "Audience", service: "Service" };

export function purityOptions(metal: string): Option[] {
  const codes = metal ? (puritiesByMetal[metal] ?? []) : Object.keys(purityLabels);
  return codes.map((code) => ({ value: code, label: purityLabels[code] ?? code }));
}

export function describeListingRule(rule: ListingRule | null) {
  if (!rule) return "—";
  const parts = [
    rule.metal ? (metalLabels[rule.metal] ?? rule.metal) : null,
    rule.genders?.length ? rule.genders.map((gender) => genderLabels[gender] ?? gender).join(", ") : null,
    rule.customizable ? "Personalisable" : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

/** "Rose Gold Ring!" → "rose-gold-ring" (matches the API's slug rule). */
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

export const text = (value: number | string | null | undefined) => (value === null || value === undefined ? "" : String(value));

export function parseSizes(value: string) {
  return value
    .split(",")
    .map((size) => size.trim())
    .filter(Boolean);
}

export function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

const istDateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });

/** ISO timestamp → "YYYY-MM-DD" in IST. */
export function istDateOf(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : istDateFormat.format(parsed);
}

/** "YYYY-MM-DD" → end of that day in IST, as an ISO timestamp with offset. */
export const endOfIstDay = (date: string) => `${date}T23:59:59+05:30`;

export function asApiError(error: unknown) {
  return error instanceof AdminApiError ? error : new AdminApiError(500, {});
}

/** Field error for a key, including nested errors such as `discount.value`. */
export function fieldError(errors: Record<string, string> | undefined, ...keys: string[]) {
  if (!errors) return undefined;
  for (const key of keys) {
    if (errors[key]) return errors[key];
    const nested = Object.keys(errors).find((name) => name.startsWith(`${key}.`));
    if (nested) return errors[nested];
  }
  return undefined;
}

/** Errors whose field isn't shown in the form (so they can be listed in the summary). */
export function unmappedErrors(errors: Record<string, string> | undefined, known: readonly string[]) {
  if (!errors) return [];
  return Object.entries(errors)
    .filter(([key]) => !known.includes(key.split(".")[0] ?? key))
    .map(([key, message]) => (key === "_form" ? message : `${humanize(key.split(".").join(" "))}: ${message}`));
}

export function changedKeys<T extends Record<string, unknown>>(next: T, previous: T): (keyof T & string)[] {
  return (Object.keys(next) as (keyof T & string)[]).filter((key) => JSON.stringify(next[key]) !== JSON.stringify(previous[key]));
}

export function pick<T extends Record<string, unknown>>(source: T, keys: readonly (keyof T)[]) {
  return Object.fromEntries(keys.map((key) => [key, source[key]])) as Partial<T>;
}
