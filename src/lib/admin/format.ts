const inr0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dateTime = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** ₹1,24,500 — shows paise only when the amount has them. */
export function money(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return Math.round(amount * 100) % 100 === 0 ? inr0.format(amount) : inr2.format(amount);
}

export function number(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return num.format(Number(value));
}

export function weight(grams: number | string | null | undefined) {
  if (grams === null || grams === undefined || grams === "") return "—";
  return `${Number(Number(grams).toFixed(3))} g`;
}

export function percent(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return `${num.format(Number(value))}%`;
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:30` : value);
  return Number.isNaN(parsed.getTime()) ? "—" : date.format(parsed);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : dateTime.format(parsed);
}

/** "partially_paid" → "Partially paid" */
export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  const text = value.replace(/[_:.-]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const tones: Record<string, Tone> = {
  // generic
  active: "success",
  inactive: "neutral",
  disabled: "neutral",
  draft: "neutral",
  blocked: "danger",
  // stock
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
  unavailable: "neutral",
  // orders
  new: "info",
  confirmed: "accent",
  processing: "accent",
  packed: "accent",
  shipped: "info",
  delivered: "success",
  completed: "success",
  cancelled: "neutral",
  returned: "warning",
  refunded: "warning",
  // payments & invoices
  pending: "warning",
  authorized: "info",
  paid: "success",
  failed: "danger",
  issued: "info",
  partially_paid: "warning",
  // purchases & expenses
  pending_approval: "warning",
  approved: "success",
  submitted: "warning",
  rejected: "danger",
  // returns & refunds & enquiries
  requested: "warning",
  received: "info",
  closed: "neutral",
  processed: "success",
  in_progress: "accent",
  responded: "success",
  // marketing
  scheduled: "info",
  running: "success",
  expired: "neutral",
  ended: "neutral",
  exhausted: "warning",
  published: "success",
};

export function toneFor(status: string | null | undefined): Tone {
  return (status && tones[status]) || "neutral";
}

export const toneClasses: Record<Tone, string> = {
  neutral: "border-line bg-cream text-ink-soft",
  info: "border-mist bg-pearl text-steel",
  success: "border-success/25 bg-success/8 text-success",
  warning: "border-warning/25 bg-warning/8 text-warning",
  danger: "border-danger/25 bg-danger/8 text-danger",
  accent: "border-champagne-soft bg-champagne-mist text-champagne-deep",
};

export const metalLabels: Record<string, string> = { gold: "Gold", silver: "Silver" };
export const purityLabels: Record<string, string> = {
  "24k": "24KT",
  "22k": "22KT",
  "18k": "18KT",
  "14k": "14KT",
  "999": "999 Fine Silver",
  "925": "925 Sterling Silver",
};
export const puritiesByMetal: Record<string, string[]> = { gold: ["24k", "22k", "18k", "14k"], silver: ["999", "925"] };

export const todayIst = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
