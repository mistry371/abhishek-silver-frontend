import type { AdminApiError } from "@/lib/admin/client";

/**
 * Message for a dialog-level alert. Field errors rendered next to inputs are
 * listed in `shownKeys`; any others (e.g. `_form`, unexpected paths) are
 * appended so the admin never sees only "review the highlighted fields".
 */
export function dialogError(error: AdminApiError | null | undefined, shownKeys: (key: string) => boolean = () => false): string | null {
  if (!error) return null;
  const extra = Object.entries(error.fieldErrors ?? {})
    .filter(([key]) => !shownKeys(key))
    .map(([, message]) => message);
  if (!error.fieldErrors || Object.keys(error.fieldErrors).length === 0) return error.message;
  if (extra.length) return extra.join(" ");
  return error.message;
}
