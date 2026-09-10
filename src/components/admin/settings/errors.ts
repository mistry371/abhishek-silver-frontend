import type { AdminApiError } from "@/lib/admin/client";

/**
 * Message for a form-level alert. Field errors already shown next to inputs are
 * listed in `shownKeys` (a key ending in "." matches every nested path, e.g.
 * "paymentSources."). Any others — `_form`, guards like "At least one active
 * Super Admin is required." — are surfaced so the admin always sees why.
 */
export function formErrorMessage(error: AdminApiError | null | undefined, shownKeys: readonly string[] = []): string | null {
  if (!error) return null;
  const fieldErrors = error.fieldErrors ?? {};
  const keys = Object.keys(fieldErrors);
  if (!keys.length) return error.message;
  const isShown = (key: string) => shownKeys.some((shown) => (shown.endsWith(".") ? key.startsWith(shown) : key === shown));
  const extra = keys.filter((key) => !isShown(key)).map((key) => fieldErrors[key]);
  return extra.length ? extra.join(" ") : error.message;
}
