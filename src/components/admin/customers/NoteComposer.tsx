"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { TextArea } from "@/components/admin/fields";
import { AdminButton, InlineAlert } from "@/components/admin/ui";
import { LockIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { useMutation } from "@/lib/admin/hooks";
import { formAlert } from "./shared";

export function InternalNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-center gap-2 border border-champagne-soft bg-champagne-mist px-3 py-2 text-[0.75rem] text-champagne-deep">
      <LockIcon size={14} className="shrink-0" />
      {children ?? "Internal only — visible to staff and never shown to the customer."}
    </p>
  );
}

/** Adds an internal note. `onSubmit` should throw on failure. */
export function NoteComposer({ onSubmit, placeholder = "Add an internal note for the team…" }: { onSubmit: (body: string) => Promise<unknown>; placeholder?: string }) {
  const [body, setBody] = useState("");
  const mutation = useMutation(async (text: string) => {
    await onSubmit(text);
    return true;
  });
  const alert = formAlert(mutation.error, ["body"]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    const done = await mutation.run(text);
    if (!done) return;
    setBody("");
    toast({ title: "Internal note added", tone: "success" });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <TextArea label="New internal note" rows={3} maxLength={2000} value={body} placeholder={placeholder} onChange={(event) => setBody(event.target.value)} error={mutation.fieldErrors.body} />
      {alert && <InlineAlert>{alert}</InlineAlert>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.75rem] tabular-nums text-muted">{body.length}/2000</span>
        <AdminButton type="submit" size="sm" variant="primary" loading={mutation.pending} disabled={!body.trim()}>
          Add note
        </AdminButton>
      </div>
    </form>
  );
}
