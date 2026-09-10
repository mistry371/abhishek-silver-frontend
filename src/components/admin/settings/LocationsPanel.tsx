"use client";

import { useId, useState } from "react";
import { NumberInput, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { EditIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, ConfirmDialog, DataTable, InlineAlert, Panel, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { number } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import { formErrorMessage } from "./errors";
import type { StockLocation } from "./types";

function LocationDialog({ location, onClose, onSaved }: { location?: StockLocation; onClose: () => void; onSaved: () => void }) {
  const formId = useId();
  const [code, setCode] = useState(location?.id ?? "");
  const [name, setName] = useState(location?.name ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(location?.displayOrder ?? 0));
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((body: { id?: string; name: string; displayOrder: number }) =>
    location ? adminApi.patch<StockLocation>(`/locations/${encodeURIComponent(location.id)}`, body) : adminApi.post<StockLocation>("/locations", body),
  );
  const errors: Record<string, string> = { ...mutation.fieldErrors, ...clientErrors };

  async function submit() {
    const order = toNumberOrNull(displayOrder);
    const next: Record<string, string> = {};
    if (!location && !/^[a-z0-9-]{2,40}$/.test(code.trim())) next.id = "Use 2–40 lowercase letters, numbers or hyphens.";
    if (!name.trim()) next.name = "Enter a name.";
    if (order === null || !Number.isInteger(order) || order < 0 || order > 1000) next.displayOrder = "Enter a whole number from 0 to 1,000.";
    setClientErrors(next);
    if (Object.keys(next).length || order === null) return;
    const saved = await mutation.run(location ? { name: name.trim(), displayOrder: order } : { id: code.trim(), name: name.trim(), displayOrder: order });
    if (saved) {
      toast({ title: location ? "Location updated" : "Location added", description: saved.name, tone: "success" });
      onSaved();
    }
  }

  return (
    <AdminDialog
      open
      onClose={onClose}
      title={location ? `Edit ${location.name}` : "Add stock location"}
      description={location ? undefined : "A place where stock is kept, such as the store counter, a safe or a warehouse."}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={mutation.pending}>
            {location ? "Save changes" : "Add location"}
          </AdminButton>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {location ? (
          <TextInput label="Code" value={location.id} disabled readOnly hint="The code can’t be changed after the location is created." />
        ) : (
          <TextInput label="Code" required maxLength={40} value={code} onChange={(e) => setCode(e.target.value.toLowerCase())} error={errors.id} hint="Short permanent identifier, e.g. store or back-safe." />
        )}
        <TextInput label="Name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <NumberInput label="Display order" min={0} max={1000} step={1} inputMode="numeric" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)} error={errors.displayOrder} hint="Lower numbers are listed first." />
        {formErrorMessage(mutation.error, ["id", "name", "displayOrder"]) && <InlineAlert>{formErrorMessage(mutation.error, ["id", "name", "displayOrder"])}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}

function ToggleLocationDialog({ location, onClose, onSaved }: { location: StockLocation; onClose: () => void; onSaved: () => void }) {
  const mutation = useMutation(() => adminApi.patch<StockLocation>(`/locations/${encodeURIComponent(location.id)}`, { active: !location.active }));
  const deactivating = location.active;
  return (
    <ConfirmDialog
      open
      onClose={onClose}
      title={deactivating ? `Deactivate ${location.name}?` : `Reactivate ${location.name}?`}
      description={
        deactivating
          ? "An inactive location can’t be chosen for stock changes. A location that still holds stock, or is set as the default or online fulfilment location, can’t be deactivated."
          : "The location can be used for stock changes again."
      }
      confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
      tone={deactivating ? "danger" : "primary"}
      pending={mutation.pending}
      error={formErrorMessage(mutation.error)}
      onConfirm={async () => {
        const saved = await mutation.run();
        if (saved) {
          toast({ title: saved.active ? "Location reactivated" : "Location deactivated", description: saved.name, tone: "success" });
          onSaved();
        }
      }}
    />
  );
}

export function LocationsPanel({ canManage }: { canManage: boolean }) {
  const { latest, error, reload } = useAdminResource<StockLocation[]>("/locations");
  const [dialog, setDialog] = useState<{ kind: "create" } | { kind: "edit" | "toggle"; location: StockLocation } | null>(null);
  const close = () => setDialog(null);
  const saved = () => {
    setDialog(null);
    reload();
  };

  const columns: Column<StockLocation>[] = [
    {
      key: "name",
      header: "Location",
      cell: (location) => (
        <div>
          <p className="font-medium">{location.name}</p>
          <p className="font-mono text-[0.75rem] text-muted">{location.id}</p>
        </div>
      ),
    },
    { key: "order", header: "Order", align: "right", priority: "low", cell: (location) => location.displayOrder },
    { key: "units", header: "Units in stock", align: "right", cell: (location) => number(location.units) },
    { key: "status", header: "Status", cell: (location) => <StatusBadge status={location.active ? "active" : "inactive"} /> },
    ...(canManage
      ? [
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right" as const,
            cell: (location: StockLocation) => (
              <div className="flex justify-end gap-1">
                <AdminButton size="sm" variant="ghost" onClick={() => setDialog({ kind: "edit", location })}>
                  <EditIcon size={14} />
                  Edit
                </AdminButton>
                <AdminButton size="sm" variant="ghost" onClick={() => setDialog({ kind: "toggle", location })}>
                  {location.active ? "Deactivate" : "Reactivate"}
                </AdminButton>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <>
      <Panel
        title="Stock locations"
        description="Places where stock is kept. Stock levels, transfers and fulfilment are tracked per location."
        actions={
          canManage && (
            <AdminButton variant="primary" size="sm" onClick={() => setDialog({ kind: "create" })}>
              <PlusIcon size={14} />
              Add location
            </AdminButton>
          )
        }
        flush
        bodyClassName="[&>div]:border-0"
      >
        <DataTable columns={columns} rows={latest} getRowKey={(location) => location.id} error={error} onRetry={reload} empty={{ title: "No stock locations yet" }} />
      </Panel>
      {dialog?.kind === "create" && <LocationDialog onClose={close} onSaved={saved} />}
      {dialog?.kind === "edit" && <LocationDialog location={dialog.location} onClose={close} onSaved={saved} />}
      {dialog?.kind === "toggle" && <ToggleLocationDialog location={dialog.location} onClose={close} onSaved={saved} />}
    </>
  );
}
