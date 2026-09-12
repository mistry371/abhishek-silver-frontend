"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { DownloadIcon } from "@/components/admin/icons";
import { findImport, ImportDialog, importTemplateUrl, useImportDefinitions, type ImportDefinition } from "@/components/admin/ImportDialog";
import { adminButton, AdminButton, EmptyNote, ErrorState, LoadingBlock, PageHeader, Panel } from "@/components/admin/ui";
import { UploadIcon } from "@/components/icons";
import { number } from "@/lib/admin/format";

const STEPS = [
  "Pick what you want to import and download its template.",
  "Fill the template in Excel — one row for each item, keeping the headings as they are.",
  "Upload the file and let us check it. We show you what will be added or updated before anything is saved.",
  "Fix any rows we flag, upload again, then import.",
];

export default function ImportsPage() {
  const { can } = useAdmin();
  const { latest, loading, error, reload } = useImportDefinitions();
  const [dialog, setDialog] = useState<{ entity: string; key: number } | null>(null);

  const items = (latest?.items ?? []).filter((item) => !item.permission || can(item.permission));
  const active = dialog ? findImport(items, dialog.entity) : undefined;

  return (
    <>
      <PageHeader
        title="Bulk import"
        description="Add or update many records at once from an Excel or CSV file, instead of typing them in one by one."
      />

      <Panel title="How it works" className="mb-6">
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center bg-ink text-[0.75rem] text-ivory">{index + 1}</span>
              <span className="text-[0.8125rem] text-ink-soft">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[0.8125rem] text-muted">
          Nothing is saved until you press Import, and a file with problems in it is never imported halfway — fix the rows we list and upload the file again.
        </p>
      </Panel>

      {error && !latest ? (
        error.status === 404 ? (
          <div className="border border-line bg-porcelain">
            <EmptyNote title="Bulk import isn’t available yet" description="Once your admin service offers imports, every one you can run will be listed here." />
          </div>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )
      ) : loading && !latest ? (
        <LoadingBlock rows={4} />
      ) : items.length === 0 ? (
        <div className="border border-line bg-porcelain">
          <EmptyNote title="No imports for your role" description="Ask a Super Admin if you need to import records in bulk." />
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <ImportCard key={item.entity} definition={item} onImport={() => setDialog((current) => ({ entity: item.entity, key: (current?.key ?? 0) + 1 }))} />
          ))}
        </ul>
      )}

      {active && (
        <ImportDialog
          key={dialog?.key}
          entity={active.entity}
          definition={active}
          title={`Import ${active.label.toLowerCase()}`}
          open
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}

function ImportCard({ definition, onImport }: { definition: ImportDefinition; onImport: () => void }) {
  const required = definition.columns.filter((column) => column.required).length;

  return (
    <li className="flex flex-col border border-line bg-porcelain p-5">
      <h2 className="text-[0.9375rem] font-medium text-ink">{definition.label}</h2>
      <p className="mt-1 flex-1 text-[0.8125rem] text-muted">{definition.description}</p>
      <p className="mt-3 text-[0.75rem] text-muted">
        {required === 1 ? "1 required column" : `${number(required)} required columns`}
        {definition.columns.length > required && <> · {number(definition.columns.length - required)} optional</>}
        {definition.rowLimit ? <> · up to {number(definition.rowLimit)} rows per file</> : null}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <AdminButton variant="primary" size="sm" onClick={onImport}>
          <UploadIcon size={14} />
          Import
        </AdminButton>
        <a href={importTemplateUrl(definition.entity, "xlsx")} download className={adminButton("secondary", "sm")}>
          <DownloadIcon size={14} />
          Download template
        </a>
      </div>
    </li>
  );
}
