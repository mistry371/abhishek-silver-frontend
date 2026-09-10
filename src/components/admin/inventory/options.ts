import { humanize, metalLabels, purityLabels, puritiesByMetal } from "@/lib/admin/format";

export const metalOptions = Object.entries(metalLabels).map(([value, label]) => ({ value, label }));

export function purityOptions(metal?: string) {
  const codes = metal && puritiesByMetal[metal] ? puritiesByMetal[metal] : Object.keys(purityLabels);
  return codes.map((value) => ({ value, label: purityLabels[value] ?? value }));
}

export const stockStatusOptions = [
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

export const productStatusOptions = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "disabled", label: "Disabled" },
];

export const movementTypeOptions = ["opening", "purchase", "sale", "return", "add", "reduce", "adjustment", "transfer"].map((value) => ({ value, label: humanize(value) }));

export const referenceTypeOptions = ["purchase", "order", "sale", "return", "manual", "seed"].map((value) => ({ value, label: humanize(value) }));

export const vendorStatusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const purchaseStatusOptions = [
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "cancelled", label: "Cancelled" },
];

export function metalPurity(metal: string | null | undefined, purity: string | null | undefined) {
  const parts = [metal ? (metalLabels[metal] ?? humanize(metal)) : null, purity ? (purityLabels[purity] ?? purity) : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

/** "purchase.approve" → "Approved", falling back to a humanized action. */
const historyLabels: Record<string, string> = {
  "purchase.create": "Created draft",
  "purchase.update": "Edited draft",
  "purchase.submit": "Submitted for approval",
  "purchase.approve": "Approved — stock added",
  "purchase.cancel": "Cancelled",
};

export const historyLabel = (action: string) => historyLabels[action] ?? humanize(action);
