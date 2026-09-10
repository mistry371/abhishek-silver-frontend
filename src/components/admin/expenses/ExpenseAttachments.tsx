"use client";

import { useRef, useState } from "react";
import { TrashIcon } from "@/components/admin/icons";
import { AdminButton, adminButton, ConfirmDialog, InlineAlert, Panel } from "@/components/admin/ui";
import { EyeIcon, UploadIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { AdminApiError, adminApi, adminFileUrl, errorMessage } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { ATTACHMENT_TYPES, formatBytes, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS, type ExpenseAttachment, type ExpenseDetail } from "./types";

const fileKind = (type: string) => (type === "application/pdf" ? "PDF" : (type.split("/")[1] ?? type).toUpperCase());

export function ExpenseAttachments({
  expense,
  canUpload,
  canRemove,
  onChange,
}: {
  expense: ExpenseDetail;
  canUpload: boolean;
  canRemove: boolean;
  onChange: (expense: ExpenseDetail) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<ExpenseAttachment | null>(null);
  const remove = useMutation((attachmentId: string) => adminApi.del<ExpenseDetail>(`/expenses/${expense.id}/attachments/${attachmentId}`));
  const remaining = MAX_ATTACHMENTS - expense.attachments.length;

  async function upload(files: FileList | null) {
    const selected = Array.from(files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (!selected.length) return;
    if (selected.length > remaining) {
      setUploadError(`You can add ${remaining} more file${remaining === 1 ? "" : "s"} (up to ${MAX_ATTACHMENTS} per expense).`);
      return;
    }
    const wrongType = selected.find((file) => file.type && !ATTACHMENT_TYPES.includes(file.type));
    if (wrongType) {
      setUploadError(`${wrongType.name}: upload a JPG, PNG, WebP or PDF file.`);
      return;
    }
    const tooLarge = selected.find((file) => file.size > MAX_ATTACHMENT_BYTES);
    if (tooLarge) {
      setUploadError(`${tooLarge.name} is larger than 10 MB.`);
      return;
    }

    setUploading(true);
    setUploadError(null);
    let uploaded = 0;
    try {
      for (const file of selected) {
        const form = new FormData();
        form.append("file", file);
        const result = await adminApi.upload<ExpenseDetail>(`/expenses/${expense.id}/attachments`, form);
        onChange(result);
        uploaded += 1;
      }
    } catch (caught) {
      setUploadError(caught instanceof AdminApiError ? (caught.fieldErrors?.file ?? caught.message) : errorMessage(caught));
    } finally {
      setUploading(false);
      if (uploaded) toast({ title: uploaded === 1 ? "Attachment uploaded" : `${uploaded} attachments uploaded`, tone: "success" });
    }
  }

  async function confirmRemove() {
    if (!removing) return;
    const result = await remove.run(removing.id);
    if (result) {
      onChange(result);
      toast({ title: "Attachment removed", tone: "success" });
      setRemoving(null);
    }
  }

  return (
    <>
      <Panel
        title="Receipts & attachments"
        description={`JPG, PNG, WebP or PDF up to 10 MB · ${expense.attachments.length} of ${MAX_ATTACHMENTS} used`}
        actions={
          canUpload && (
            <>
              <AdminButton size="sm" onClick={() => inputRef.current?.click()} loading={uploading} disabled={remaining <= 0}>
                <UploadIcon size={14} />
                Upload
              </AdminButton>
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple hidden onChange={(event) => upload(event.target.files)} />
            </>
          )
        }
        flush
      >
        {uploadError && <InlineAlert className="border-x-0 border-t-0">{uploadError}</InlineAlert>}
        {expense.attachments.length === 0 ? (
          <p className="px-5 py-6 text-[0.8125rem] text-muted">No receipts attached yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {expense.attachments.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[0.8125rem]">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{file.name}</p>
                  <p className="text-[0.75rem] text-muted">
                    {fileKind(file.type)} · {formatBytes(file.size)} · Uploaded {formatDateTime(file.uploadedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a href={adminFileUrl(`/expenses/${expense.id}/attachments/${file.id}`)} target="_blank" rel="noopener noreferrer" className={adminButton("secondary", "sm")}>
                    <EyeIcon size={14} />
                    View
                  </a>
                  {canRemove && (
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => {
                        remove.clearError();
                        setRemoving(file);
                      }}
                    >
                      <TrashIcon size={14} />
                    </AdminButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => {
          if (!remove.pending) setRemoving(null);
        }}
        onConfirm={confirmRemove}
        title="Remove attachment?"
        description={`“${removing?.name ?? ""}” will be removed from this expense and deleted from storage.`}
        confirmLabel="Remove"
        tone="danger"
        pending={remove.pending}
        error={remove.error?.message}
      />
    </>
  );
}
