"use client";

import { useId, useState, type FormEvent } from "react";
import { SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { AdminButton, AdminDialog, InlineAlert } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { useMutation } from "@/lib/admin/hooks";
import { contactChannelOptions, formAlert } from "./shared";
import type { EnquiryDetail } from "./types";

const KNOWN_FIELDS = ["channel", "outcome", "note"] as const;
const OUTCOME_SUGGESTIONS = [
  "Shared product details",
  "Shared a price estimate",
  "No answer — will try again",
  "Asked to call back later",
  "Customer will visit the store",
  "Not interested",
];

/** Records a call, chat, email or visit against an enquiry. Give it a new `key` each time it opens. */
export function LogContactDialog({
  open,
  onClose,
  enquiryId,
  defaultChannel = "phone",
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  enquiryId: string;
  defaultChannel?: string;
  onSaved: (enquiry: EnquiryDetail) => void;
}) {
  const formId = useId();
  const suggestionsId = useId();
  const [channel, setChannel] = useState(defaultChannel);
  const [outcome, setOutcome] = useState("");
  const [note, setNote] = useState("");
  const mutation = useMutation((body: { channel: string; outcome: string; note?: string }) => adminApi.post<EnquiryDetail>(`/enquiries/${enquiryId}/contacts`, body));
  const errors = mutation.fieldErrors;
  const alert = formAlert(mutation.error, KNOWN_FIELDS);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enquiry = await mutation.run({ channel, outcome: outcome.trim(), note: note.trim() || undefined });
    if (!enquiry) return;
    toast({ title: "Contact logged", tone: "success" });
    onSaved(enquiry);
  }

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title="Log contact"
      description="Record a call, WhatsApp chat, email or store visit. A new enquiry moves to In progress automatically."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={mutation.pending}>
            Save contact
          </AdminButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="grid gap-4">
        <SelectInput label="Channel" required options={contactChannelOptions} value={channel} onChange={(event) => setChannel(event.target.value)} error={errors.channel} />
        <TextInput
          label="Outcome"
          required
          maxLength={200}
          list={suggestionsId}
          placeholder="What happened?"
          value={outcome}
          onChange={(event) => setOutcome(event.target.value)}
          error={errors.outcome}
        />
        <datalist id={suggestionsId}>
          {OUTCOME_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <TextArea label="Note" rows={3} maxLength={1000} placeholder="Optional details for the team" value={note} onChange={(event) => setNote(event.target.value)} error={errors.note} />
        {alert && <InlineAlert>{alert}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}
