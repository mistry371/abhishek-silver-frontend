"use client";

import { useAdmin } from "@/components/admin/AdminSession";
import type { Paginated } from "@/lib/admin/client";
import { useAdminResource } from "@/lib/admin/hooks";
import type { ExpenseCategory, ExpenseSettings, VendorOption } from "./types";

/**
 * Settings → Expenses, readable by anyone with `expenses:view`. On error tax
 * fields are hidden and payment source becomes free text.
 */
export function useExpenseSettings() {
  const resource = useAdminResource<ExpenseSettings>("/expenses/settings");
  const settings = resource.latest ?? null;
  return {
    /** True once we know whether settings are available (loaded or failed). */
    ready: resource.latest !== undefined || resource.error !== undefined,
    /** Whether the real settings were loaded. */
    known: settings !== null,
    taxFieldsEnabled: settings?.taxFieldsEnabled ?? false,
    approvalRequired: settings ? settings.approvalRequired : null,
    paymentSources: settings?.paymentSources?.length ? settings.paymentSources : null,
  };
}

export function useExpenseCategories() {
  return useAdminResource<ExpenseCategory[]>("/expense-categories");
}

/** Vendor picker (optional). Without `vendors:view` or on error the payee stays free text. */
export function useVendorOptions() {
  const { can } = useAdmin();
  const allowed = can("vendors:view");
  const resource = useAdminResource<Paginated<VendorOption>>(allowed ? "/vendors" : null, { pageSize: 100 });
  return {
    ready: !allowed || resource.latest !== undefined || resource.error !== undefined,
    vendors: resource.latest?.items ?? null,
  };
}
