"use client";

import { useId, useState, type DragEvent, type ReactNode } from "react";
import { DownloadIcon } from "@/components/admin/icons";
import { adminButton, AdminButton, AdminDialog, ErrorState, InlineAlert, LoadingBlock, StatusBadge } from "@/components/admin/ui";
import { UploadIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi, adminFileUrl, AdminApiError, errorMessage } from "@/lib/admin/client";
import { number } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* API shapes                                                          */
/* ------------------------------------------------------------------ */

export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  example?: string | null;
  hint?: string | null;
}

export interface ImportDefinition {
  entity: string;
  label: string;
  description: string;
  /** Permission the admin needs to run this import. */
  permission: string;
  /** Most rows the API accepts in one file. */
  rowLimit: number;
  columns: ImportColumn[];
}

export interface ImportRowError {
  row: number;
  column?: string | null;
  message: string;
}

export interface ImportSampleRow {
  row: number;
  action: "create" | "update" | "skip";
  summary: string;
}

export interface ImportResult {
  entity: string;
  mode: "preview" | "commit";
  fileName: string;
  totalRows: number;
  valid: number;
  invalid: number;
  created: number;
  updated: number;
  skipped: number;
  errors?: ImportRowError[] | null;
  sample?: ImportSampleRow[] | null;
}

export interface ImportListResponse {
  items: ImportDefinition[];
}

/** The API filters this list to the imports the signed-in admin may use. */
export function useImportDefinitions(enabled = true) {
  return useAdminResource<ImportListResponse>(enabled ? "/imports" : null);
}

const compact = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Tolerates singular/plural and snake_case vs camelCase entity names. */
function sameEntity(candidate: string, wanted: string) {
  const a = compact(candidate);
  const b = compact(wanted);
  return a === b || `${a}s` === b || a === `${b}s`;
}

/** First definition matching any of the given names, in preference order. */
export function findImport(items: ImportDefinition[] | undefined, entity: string | string[]) {
  if (!items?.length) return undefined;
  for (const wanted of Array.isArray(entity) ? entity : [entity]) {
    const match = items.find((item) => sameEntity(item.entity, wanted));
    if (match) return match;
  }
  return undefined;
}

export const importTemplateUrl = (entity: string, format: "xlsx" | "csv") =>
  adminFileUrl(`/imports/${encodeURIComponent(entity)}/template`, { format });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_LISTED_PROBLEMS = 50;
const MAX_LISTED_SAMPLE = 10;

const ACTION_LABELS: Record<ImportSampleRow["action"], string> = { create: "Will be added", update: "Will be updated", skip: "No change" };
const ACTION_TONES = { create: "success", update: "info", skip: "neutral" } as const;

const rows = (count: number) => `${number(count)} ${count === 1 ? "row" : "rows"}`;

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function outcome(result: ImportResult) {
  const parts: string[] = [];
  if (result.created) parts.push(`${rows(result.created)} added`);
  if (result.updated) parts.push(`${rows(result.updated)} updated`);
  if (result.skipped) parts.push(`${rows(result.skipped)} left unchanged`);
  return parts.length ? parts.join(", ") : "Nothing needed changing.";
}

function isRowError(value: unknown): value is ImportRowError {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.message === "string" && (typeof candidate.row === "number" || typeof candidate.row === "string");
}

/** Row problems returned alongside a 422 when a commit is rejected. */
function rowErrorsFrom(error: unknown) {
  if (!(error instanceof AdminApiError)) return null;
  const raw = error.details?.errors;
  if (!Array.isArray(raw)) return null;
  const list = raw.filter(isRowError).map((item) => ({ ...item, row: Number(item.row) }));
  return list.length ? list : null;
}

/* ------------------------------------------------------------------ */
/* Toolbar button                                                      */
/* ------------------------------------------------------------------ */

/**
 * "Import" button for a list page. The API only lists imports this admin may
 * use, so the button stays hidden for everyone else and while the endpoint is
 * unavailable.
 */
export function ImportAction({
  entity,
  title,
  label = "Import",
  variant = "secondary",
  size = "md",
  onImported,
}: {
  entity: string | string[];
  title?: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  onImported?: () => void;
}) {
  const { latest } = useImportDefinitions();
  const [dialog, setDialog] = useState({ open: false, key: 0 });
  const definition = findImport(latest?.items, entity);

  if (!definition) return null;

  return (
    <>
      <AdminButton variant={variant} size={size} onClick={() => setDialog((current) => ({ open: true, key: current.key + 1 }))}>
        <UploadIcon size={15} />
        {label}
      </AdminButton>
      <ImportDialog
        key={dialog.key}
        entity={definition.entity}
        definition={definition}
        title={title ?? `Import ${definition.label.toLowerCase()}`}
        open={dialog.open}
        onClose={() => setDialog((current) => ({ ...current, open: false }))}
        onImported={onImported}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

export function ImportDialog({
  entity,
  title,
  open,
  onClose,
  onImported,
  definition: given,
}: {
  entity: string | string[];
  title: string;
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
  /** Pass the definition you already have to skip a second lookup. */
  definition?: ImportDefinition;
}) {
  const list = useImportDefinitions(open && !given);
  const definition = given ?? findImport(list.latest?.items, entity);

  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [finished, setFinished] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [rejected, setRejected] = useState<ImportRowError[] | null>(null);

  const step = finished ? "done" : preview ? "check" : "choose";
  const problems = rejected ?? preview?.errors ?? [];

  function pick(chosen: File | null | undefined) {
    if (!chosen) return;
    const name = chosen.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv")) {
      setFileError("Please choose an Excel file (.xlsx) or a CSV file (.csv).");
      return;
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setFileError(`That file is ${fileSize(chosen.size)}. Please upload a file under 5 MB.`);
      return;
    }
    if (chosen.size === 0) {
      setFileError("That file is empty. Please choose the file with your rows in it.");
      return;
    }
    setFileError(null);
    setFailure(null);
    setRejected(null);
    setPreview(null);
    setFile(chosen);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0]);
  }

  async function send(mode: "preview" | "commit") {
    if (!file || !definition) return;
    setBusy(mode);
    setFailure(null);
    setRejected(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const result = await adminApi.upload<ImportResult>(`/imports/${encodeURIComponent(definition.entity)}`, form, { mode });
      if (mode === "preview") {
        setPreview(result);
      } else {
        setFinished(result);
        toast({ title: `${definition.label} imported`, description: outcome(result), tone: "success" });
        onImported?.();
      }
    } catch (caught) {
      setRejected(rowErrorsFrom(caught));
      setFailure(errorMessage(caught));
    } finally {
      setBusy(null);
    }
  }

  const working = busy !== null;
  const readyCount = preview?.valid ?? 0;
  // A file with problems is never imported, so ask for a corrected file instead.
  const blocked = (preview?.invalid ?? 0) > 0 || (rejected?.length ?? 0) > 0 || readyCount === 0;

  const footer =
    step === "done" ? (
      <AdminButton variant="primary" onClick={onClose}>
        Done
      </AdminButton>
    ) : step === "check" ? (
      <>
        <AdminButton
          variant="ghost"
          disabled={working}
          onClick={() => {
            setPreview(null);
            setRejected(null);
            setFailure(null);
          }}
        >
          Choose another file
        </AdminButton>
        <AdminButton variant="primary" loading={busy === "commit"} disabled={blocked || working} onClick={() => send("commit")}>
          {blocked ? "Import" : `Import ${rows(readyCount)}`}
        </AdminButton>
      </>
    ) : (
      <>
        <AdminButton variant="ghost" onClick={onClose} disabled={working}>
          Cancel
        </AdminButton>
        <AdminButton variant="primary" loading={busy === "preview"} disabled={!file || !definition || working} onClick={() => send("preview")}>
          Check file
        </AdminButton>
      </>
    );

  return (
    <AdminDialog open={open} onClose={onClose} title={title} size="lg" footer={footer}>
      {!definition ? (
        list.error ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.latest ? (
          <InlineAlert tone="warning">This import isn’t available. Ask a Super Admin to check your role, or try the Bulk import page.</InlineAlert>
        ) : (
          <LoadingBlock rows={4} />
        )
      ) : step === "done" && finished ? (
        <div className="space-y-4">
          <InlineAlert tone="success">
            <p className="font-medium">Your file was imported.</p>
            <p className="mt-1">{outcome(finished)}</p>
          </InlineAlert>
          <CountGrid
            items={[
              { label: "Rows in your file", value: finished.totalRows },
              { label: "Added", value: finished.created, tone: finished.created ? "success" : undefined },
              { label: "Updated", value: finished.updated, tone: finished.updated ? "info" : undefined },
              { label: "Left unchanged", value: finished.skipped },
            ]}
          />
          <p className="text-[0.8125rem] text-muted">
            {finished.fileName ? (
              <>
                <span className="text-ink-soft">{finished.fileName}</span> is done.{" "}
              </>
            ) : null}
            You can close this window — the list behind it is already up to date.
          </p>
        </div>
      ) : step === "check" && preview ? (
        <div className="space-y-5">
          <p className="text-[0.875rem] text-ink-soft">
            We checked <span className="text-ink">{preview.fileName || file?.name}</span>. Nothing has been imported yet.
          </p>

          <CountGrid
            items={[
              { label: "Rows in your file", value: preview.totalRows },
              { label: "Ready to import", value: preview.valid, tone: preview.valid ? "success" : undefined },
              { label: "Problems", value: preview.invalid, tone: preview.invalid ? "danger" : undefined },
              { label: "Will be added", value: preview.created },
              { label: "Will be updated", value: preview.updated },
              { label: "Will be skipped", value: preview.skipped },
            ]}
          />

          {failure && <InlineAlert>{failure}</InlineAlert>}

          {problems.length > 0 ? (
            <section className="space-y-2">
              <InlineAlert tone="warning">
                We found {problems.length === 1 ? "1 problem" : `${number(problems.length)} problems`} in your file. Nothing has been imported. Fix these rows in your file and upload
                it again.
              </InlineAlert>
              <ProblemTable problems={problems} columns={definition.columns} />
            </section>
          ) : preview.valid === 0 ? (
            <InlineAlert tone="warning">We could not find any rows to import in this file. Check that you filled in the template and try again.</InlineAlert>
          ) : (
            <InlineAlert tone="success">Everything looks right. Import {rows(preview.valid)} to save them.</InlineAlert>
          )}

          {(preview.sample?.length ?? 0) > 0 && <SampleTable sample={preview.sample ?? []} />}
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-[0.875rem] text-ink-soft">{definition.description}</p>

          <section>
            <h3 className="text-[0.8125rem] font-medium text-ink">What each column is for</h3>
            <p className="mt-0.5 text-[0.75rem] text-muted">Required columns must be filled in on every row. Leave an optional column blank if you don’t have it.</p>
            {definition.columns.length === 0 ? (
              <p className="mt-2 text-[0.8125rem] text-muted">Download the template to see the columns.</p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {definition.columns.map((column) => (
                  <li key={column.key} className="border border-line bg-cream/40 px-3 py-2">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="text-[0.8125rem] font-medium text-ink">{column.label}</span>
                      <span className={cn("shrink-0 text-[0.625rem] uppercase tracking-[0.14em]", column.required ? "text-champagne-deep" : "text-muted")}>
                        {column.required ? "Required" : "Optional"}
                      </span>
                    </p>
                    {column.hint && <p className="mt-0.5 text-[0.75rem] text-muted">{column.hint}</p>}
                    {column.example && (
                      <p className="mt-0.5 text-[0.75rem] text-muted">
                        Example: <span className="text-ink-soft">{column.example}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="border border-line bg-porcelain px-4 py-4">
            <h3 className="text-[0.8125rem] font-medium text-ink">Start from our template</h3>
            <p className="mt-0.5 text-[0.75rem] text-muted">The template already has the right column headings, so nothing gets mixed up.</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a href={importTemplateUrl(definition.entity, "xlsx")} download className={adminButton("secondary")}>
                <DownloadIcon size={15} />
                Download Excel template
              </a>
              <a href={importTemplateUrl(definition.entity, "csv")} download className={adminButton("link", "sm")}>
                Or download a CSV template
              </a>
            </div>
          </section>

          <section>
            <h3 className="text-[0.8125rem] font-medium text-ink">Upload your file</h3>
            <p className="mt-0.5 text-[0.75rem] text-muted">
              Excel (.xlsx) or CSV (.csv)
              {definition.rowLimit > 0 && <> · up to {number(definition.rowLimit)} rows in one file</>} · up to 5 MB
            </p>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn("mt-3 flex flex-col items-center gap-2 border border-dashed px-4 py-6 text-center", dragging ? "border-ink bg-champagne-mist/40" : "border-line-strong bg-cream/30")}
            >
              <input
                id={inputId}
                type="file"
                accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="peer sr-only"
                onChange={(event) => {
                  pick(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <label
                htmlFor={inputId}
                className={cn(adminButton("secondary"), "cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink")}
              >
                <UploadIcon size={15} />
                Choose a file
              </label>
              <p className="text-[0.75rem] text-muted">or drag it here</p>
              {file && (
                <p className="text-[0.8125rem] text-ink">
                  {file.name} <span className="text-muted">({fileSize(file.size)})</span>
                </p>
              )}
            </div>
            {fileError && (
              <p role="alert" className="mt-2 text-[0.75rem] text-danger">
                {fileError}
              </p>
            )}
          </section>

          {failure && <InlineAlert>{failure}</InlineAlert>}
          {problems.length > 0 && <ProblemTable problems={problems} columns={definition.columns} />}
        </div>
      )}
    </AdminDialog>
  );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function CountGrid({ items }: { items: { label: string; value: number; tone?: "success" | "danger" | "info" }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border border-line bg-porcelain px-3 py-2.5">
          <dt className="text-[0.625rem] uppercase tracking-[0.14em] text-muted">{item.label}</dt>
          <dd
            className={cn(
              "mt-1 font-serif text-[1.375rem] leading-none tabular-nums",
              item.tone === "danger" ? "text-danger" : item.tone === "success" ? "text-success" : "text-ink",
            )}
          >
            {number(item.value ?? 0)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MiniTable({ headings, children }: { headings: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full border-collapse text-left text-[0.8125rem]">
        <thead>
          <tr className="border-b border-line bg-cream/60">
            {headings.map((heading, index) => (
              <th key={index} scope="col" className="whitespace-nowrap px-3 py-2 text-[0.625rem] font-medium uppercase tracking-[0.12em] text-muted">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ProblemTable({ problems, columns }: { problems: ImportRowError[]; columns: ImportColumn[] }) {
  const shown = problems.slice(0, MAX_LISTED_PROBLEMS);
  const columnLabel = (key: string | null | undefined) => (key ? (columns.find((column) => column.key === key)?.label ?? key) : "—");

  return (
    <div className="space-y-2">
      <MiniTable headings={["Row", "Column", "What needs fixing"]}>
        {shown.map((problem, index) => (
          <tr key={`${problem.row}-${problem.column ?? ""}-${index}`} className="border-b border-line align-top last:border-0">
            <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink">{problem.row}</td>
            <td className="px-3 py-2 text-ink-soft">{columnLabel(problem.column)}</td>
            <td className="px-3 py-2 text-ink">{problem.message}</td>
          </tr>
        ))}
      </MiniTable>
      {problems.length > shown.length && <p className="text-[0.75rem] text-muted">Showing the first {shown.length} problems of {number(problems.length)}.</p>}
    </div>
  );
}

function SampleTable({ sample }: { sample: ImportSampleRow[] }) {
  const shown = sample.slice(0, MAX_LISTED_SAMPLE);
  return (
    <section className="space-y-2">
      <h3 className="text-[0.8125rem] font-medium text-ink">A look at the first rows</h3>
      <MiniTable headings={["Row", "What happens", "Details"]}>
        {shown.map((row) => (
          <tr key={row.row} className="border-b border-line align-top last:border-0">
            <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink">{row.row}</td>
            <td className="px-3 py-2">
              <StatusBadge status={row.action} label={ACTION_LABELS[row.action] ?? row.action} tone={ACTION_TONES[row.action] ?? "neutral"} />
            </td>
            <td className="px-3 py-2 text-ink">{row.summary}</td>
          </tr>
        ))}
      </MiniTable>
    </section>
  );
}
