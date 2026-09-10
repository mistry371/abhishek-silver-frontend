"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import { useAdmin } from "../AdminSession";
import { SaveIcon } from "../icons";
import { AdminButton, ErrorState, InlineAlert, LoadingBlock, PageHeader } from "../ui";
import { describePath, type FieldErrors } from "./errors";
import type { ContentRow } from "./types";

export interface DocumentContext<T> {
  value: T;
  setValue: (next: T) => void;
  set: <K extends keyof T>(key: K, next: T[K]) => void;
  errors: FieldErrors;
  readOnly: boolean;
}

interface DocumentPageProps<T> {
  /** Proxy path used for both GET and PUT, e.g. `/content/homepage`. */
  path: string;
  title: string;
  description?: ReactNode;
  back?: { href: string; label: string };
  /** Starting value when nothing has been saved yet. */
  emptyValue: () => T;
  /** Fill gaps in older saved documents (missing arrays etc.). */
  normalize?: (value: T) => T;
  /** Shape the request body (e.g. drop derived fields). */
  prepare?: (value: T) => unknown;
  notice?: ReactNode;
  /** Headline badges next to the title. */
  meta?: (value: T | null) => ReactNode;
  children: (context: DocumentContext<T>) => ReactNode;
}

/**
 * Loads a whole CMS document, edits it locally and saves it back with PUT.
 * The form is keyed by `updatedAt` so a successful save re-initialises it
 * from the server's normalised value without effects.
 */
export function ContentDocumentPage<T>(props: DocumentPageProps<T>) {
  const { admin } = useAdmin();
  const { data, error, reload, setData } = useAdminResource<ContentRow<T>>(props.path);
  const back = props.back ?? { href: "/admin/content", label: "Website content" };

  if (error || !data) {
    return (
      <>
        <PageHeader title={props.title} description={props.description} back={back} />
        {error ? <ErrorState error={error} onRetry={reload} /> : <LoadingBlock rows={8} />}
      </>
    );
  }

  return (
    <DocumentForm
      key={data.updatedAt ?? "unsaved"}
      {...props}
      back={back}
      row={data}
      onSaved={(value) => setData({ ...data, value, updatedAt: new Date().toISOString(), updatedByName: admin.name })}
    />
  );
}

function DocumentForm<T>({
  path,
  title,
  description,
  back,
  emptyValue,
  normalize,
  prepare,
  notice,
  meta,
  children,
  row,
  onSaved,
}: DocumentPageProps<T> & { back: { href: string; label: string }; row: ContentRow<T>; onSaved: (value: T) => void }) {
  const { can } = useAdmin();
  const readOnly = !can("content:manage");
  const [initial] = useState<T>(() => {
    const base = row.value ?? emptyValue();
    return normalize ? normalize(base) : base;
  });
  const [value, setValueState] = useState<T>(initial);
  const [dirty, setDirty] = useState(false);
  const save = useMutation((body: unknown) => adminApi.put<{ key: string; value: T }>(path, body));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setValue = (next: T) => {
    setValueState(next);
    setDirty(true);
  };
  const set = <K extends keyof T>(key: K, next: T[K]) => {
    setValueState((current) => ({ ...current, [key]: next }));
    setDirty(true);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    const result = await save.run(prepare ? prepare(value) : value);
    if (result) {
      toast({ title: `${title} saved`, description: "The website will show the update shortly.", tone: "success" });
      onSaved(result.value);
    } else {
      toast({ title: "Changes not saved", description: "Please review the highlighted fields.", tone: "error" });
    }
  }

  const errors = save.fieldErrors;

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={title}
        description={description}
        back={back}
        meta={
          <>
            {meta?.(value)}
            <span className="text-[0.75rem] text-muted">
              {row.updatedAt ? `Last updated ${formatDateTime(row.updatedAt)}${row.updatedByName ? ` by ${row.updatedByName}` : ""}` : "Not saved yet"}
            </span>
          </>
        }
        actions={
          !readOnly && (
            <AdminButton type="submit" variant="primary" loading={save.pending}>
              <SaveIcon size={15} />
              Save changes
            </AdminButton>
          )
        }
      />

      <div className="space-y-6">
        {readOnly && <InlineAlert tone="info">You can view this content but not change it. Ask a Super Admin for the “Manage content” permission.</InlineAlert>}
        {!row.value && <InlineAlert tone="warning">Nothing has been saved for this section yet. Fill in the form and save to publish it.</InlineAlert>}
        {notice}
        <ErrorSummary error={save.error} />

        <fieldset disabled={readOnly} className="min-w-0 space-y-6">
          {children({ value, setValue, set, errors, readOnly })}
        </fieldset>
      </div>

      {!readOnly && (
        <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border border-line bg-porcelain/95 px-4 py-3 backdrop-blur">
          <span className="text-[0.8125rem] text-muted" aria-live="polite">
            {dirty ? "You have unsaved changes." : "No unsaved changes."}
          </span>
          <div className="flex gap-2">
            <AdminButton
              variant="ghost"
              disabled={!dirty || save.pending}
              onClick={() => {
                setValueState(initial);
                setDirty(false);
                save.clearError();
              }}
            >
              Discard
            </AdminButton>
            <AdminButton type="submit" variant="primary" loading={save.pending}>
              <SaveIcon size={15} />
              Save changes
            </AdminButton>
          </div>
        </div>
      )}
    </form>
  );
}

/** Top-of-form error with every field problem listed (some fields may be collapsed or off-screen). */
export function ErrorSummary({ error }: { error: AdminApiError | null | undefined }) {
  if (!error) return null;
  const entries = Object.entries(error.fieldErrors ?? {});
  return (
    <InlineAlert>
      <p className="font-medium">{error.message}</p>
      {entries.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {entries.slice(0, 12).map(([path, message]) => (
            <li key={path}>
              {describePath(path) && <span className="font-medium">{describePath(path)}: </span>}
              {message}
            </li>
          ))}
          {entries.length > 12 && <li>…and {entries.length - 12} more.</li>}
        </ul>
      )}
    </InlineAlert>
  );
}
