import { humanize } from "@/lib/admin/format";

/**
 * EXPENSE MANAGEMENT — requested expansion (not in the original project document).
 * Shapes mirror `abhishek-silver-backend/src/modules/admin/expenses.ts`.
 */

export const PAYMENT_METHODS = ["cash", "upi", "bank_transfer", "card", "cheque", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  card: "Card",
  cheque: "Cheque",
  other: "Other",
};

export const paymentMethodOptions = PAYMENT_METHODS.map((value) => ({ value, label: paymentMethodLabels[value] }));

export function methodLabel(value: string | null | undefined) {
  return value && value in paymentMethodLabels ? paymentMethodLabels[value as PaymentMethod] : humanize(value);
}

export const EXPENSE_STATUSES = ["draft", "submitted", "approved", "rejected", "paid"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];
export const statusOptions = EXPENSE_STATUSES.map((value) => ({ value, label: humanize(value) }));

export const FREQUENCIES = ["weekly", "monthly", "quarterly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];
export const frequencyOptions = FREQUENCIES.map((value) => ({ value, label: humanize(value) }));

export interface ExpenseSettings {
  approvalRequired: boolean;
  taxFieldsEnabled: boolean;
  paymentSources: string[];
}

export interface ExpenseCategory {
  id: string;
  name: string;
  parentId: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  parentName: string | null;
  expenseCount: number;
}

export interface RecurringExpense {
  id: string;
  title: string;
  categoryId: string;
  amount: number;
  frequency: Frequency;
  nextDueDate: string;
  payee: string;
  paymentMethod: PaymentMethod;
  paymentSource: string | null;
  active: boolean;
  notes: string | null;
  lastCreatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  categoryName?: string;
}

export interface ExpenseListItem {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  categoryId: string;
  categoryName: string;
  payee: string;
  vendorName: string | null;
  description: string;
  paymentMethod: PaymentMethod;
  amount: number;
  taxAmount: number | null;
  totalAmount: number;
  status: ExpenseStatus;
  attachmentCount: number;
  recurring: boolean;
  createdByName: string;
  createdAt: string;
}

export interface ExpenseAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface ExpenseEvent {
  id: string;
  expenseId: string;
  action: string;
  note: string | null;
  actorName: string;
  createdAt: string;
}

export interface ExpenseDetail {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  categoryId: string;
  amount: number;
  taxAmount: number | null;
  gstRate: number | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentSource: string | null;
  payee: string;
  vendorId: string | null;
  referenceNumber: string | null;
  description: string;
  notes: string | null;
  attachments: ExpenseAttachment[];
  status: ExpenseStatus;
  recurringId: string | null;
  submittedAt: string | null;
  decision: "approved" | "rejected" | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  paidAt: string | null;
  paidByName: string | null;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  categoryName: string;
  vendorName: string | null;
  recurringTitle: string | null;
  events: ExpenseEvent[];
}

export interface ExpenseSummary {
  today: number;
  thisMonth: number;
  period: { from: string; to: string; total: number; count: number };
  topCategories: { categoryId: string; name: string; total: number; count: number }[];
  pendingApprovals: { count: number; items: { id: string; expenseNumber: string; payee: string; totalAmount: number; expenseDate: string; createdByName: string }[] };
  recent: { id: string; expenseNumber: string; payee: string; totalAmount: number; status: ExpenseStatus; expenseDate: string }[];
  recurring: {
    active: number;
    monthlyEquivalent: number;
    dueWithin30Days: { id: string; title: string; amount: number; nextDueDate: string }[];
  };
}

export interface VendorOption {
  id: string;
  code: string;
  name: string;
  status: "active" | "inactive";
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Top-level categories alphabetically, each followed by its subcategories. */
export function sortCategories(categories: ExpenseCategory[]) {
  const byName = (a: ExpenseCategory, b: ExpenseCategory) => a.name.localeCompare(b.name);
  const ids = new Set(categories.map((c) => c.id));
  const parents = categories.filter((c) => !c.parentId || !ids.has(c.parentId)).sort(byName);
  return parents.flatMap((parent) => [parent, ...categories.filter((c) => c.parentId === parent.id).sort(byName)]);
}

export function categoryLabel(category: Pick<ExpenseCategory, "name" | "parentName">) {
  return category.parentName ? `${category.parentName} / ${category.name}` : category.name;
}

/** Select options labelled "Parent / Child". `keepId` keeps an inactive current value selectable. */
export function categoryOptions(categories: ExpenseCategory[] | undefined, { activeOnly = true, keepId }: { activeOnly?: boolean; keepId?: string } = {}) {
  return sortCategories(categories ?? [])
    .filter((category) => !activeOnly || category.active || category.id === keepId)
    .map((category) => ({ value: category.id, label: `${categoryLabel(category)}${category.active ? "" : " (inactive)"}` }));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Same rule as the backend: advances "YYYY-MM-DD", clamping month-ends. */
export function advanceDate(date: string, frequency: Frequency) {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  if (frequency === "weekly") return new Date(Date.UTC(year, month - 1, day + 7)).toISOString().slice(0, 10);
  const months = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const lastDay = new Date(Date.UTC(year, month - 1 + months + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1 + months, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

export const monthStartOf = (isoDate: string) => `${isoDate.slice(0, 8)}01`;

export const ATTACHMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
