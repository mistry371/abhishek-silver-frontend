"use client";

import { useId, useMemo, useState } from "react";
import { useAdmin, type PermissionGroup } from "@/components/admin/AdminSession";
import { SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { SaveIcon, TrashIcon } from "@/components/admin/icons";
import { formErrorMessage } from "@/components/admin/settings/errors";
import { PermissionMatrix } from "@/components/admin/settings/PermissionMatrix";
import { SUPER_ADMIN_ROLE, type Role, type RolesResponse } from "@/components/admin/settings/types";
import { AdminButton, AdminDialog, ConfirmDialog, ErrorState, InlineAlert, LoadingBlock, PageHeader, Panel, PermissionDenied, StatusBadge } from "@/components/admin/ui";
import { LockIcon, PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { number } from "@/lib/admin/format";
import { useAdminResource, useMutation, useUrlFilters } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^[^a-z]+|_+$/g, "")
    .slice(0, 40);

/* ------------------------------------------------------------------ */

function PermissionList({ title, codes, labels, tone }: { title: string; codes: string[]; labels: Map<string, { module: string; description: string }>; tone: "success" | "danger" }) {
  if (!codes.length) return null;
  return (
    <div>
      <p className={cn("text-[0.75rem] font-medium uppercase tracking-[0.12em]", tone === "success" ? "text-success" : "text-danger")}>
        {title} ({codes.length})
      </p>
      <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto text-[0.8125rem]">
        {codes.map((code) => (
          <li key={code} className="flex gap-2">
            <span className={tone === "success" ? "text-success" : "text-danger"}>{tone === "success" ? "+" : "−"}</span>
            <span>
              <span className="text-muted">{labels.get(code)?.module ?? "Other"} · </span>
              {labels.get(code)?.description ?? code}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoleEditor({ role, groups, isOwnRole, onSaved, onDeleted }: { role: Role; groups: PermissionGroup[]; isOwnRole: boolean; onSaved: (role: Role) => void; onDeleted: () => void }) {
  const locked = role.id === SUPER_ADMIN_ROLE;
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role.permissions));
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const catalogue = useMemo(() => groups.flatMap((group) => Object.keys(group.permissions)), [groups]);
  const labels = useMemo(() => {
    const map = new Map<string, { module: string; description: string }>();
    for (const group of groups) for (const [code, description] of Object.entries(group.permissions)) map.set(code, { module: group.module, description });
    return map;
  }, [groups]);
  const original = useMemo(() => new Set(role.permissions), [role.permissions]);
  const added = catalogue.filter((code) => selected.has(code) && !original.has(code));
  const removed = catalogue.filter((code) => !selected.has(code) && original.has(code));
  const dirty = added.length + removed.length > 0;
  const grantedCount = catalogue.filter((code) => selected.has(code)).length;

  const save = useMutation((permissions: string[]) => adminApi.patch<Role>(`/roles/${encodeURIComponent(role.id)}`, { permissions }));
  const remove = useMutation(async () => {
    await adminApi.del(`/roles/${encodeURIComponent(role.id)}`);
    return true;
  });

  async function confirmSave() {
    const updated = await save.run(catalogue.filter((code) => selected.has(code)));
    if (updated) {
      setConfirming(false);
      toast({ title: "Permissions updated", description: updated.name, tone: "success" });
      onSaved(updated);
    }
  }

  async function confirmDelete() {
    if (await remove.run()) {
      toast({ title: "Role deleted", description: role.name, tone: "success" });
      onDeleted();
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <Panel
        title={role.name}
        description={role.description || "No description."}
        actions={
          !locked && (
            <>
              {!role.isSystem && (
                <AdminButton size="sm" variant="danger" onClick={() => setDeleting(true)} disabled={role.userCount > 0} title={role.userCount > 0 ? "Move this role’s team members to another role first." : undefined}>
                  <TrashIcon size={14} />
                  Delete role
                </AdminButton>
              )}
              {dirty && (
                <AdminButton size="sm" variant="ghost" onClick={() => setSelected(new Set(role.permissions))}>
                  Discard
                </AdminButton>
              )}
              <AdminButton size="sm" variant="primary" disabled={!dirty} onClick={() => setConfirming(true)}>
                <SaveIcon size={14} />
                Save permissions
              </AdminButton>
            </>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-[0.75rem] text-muted">
          {role.isSystem && <StatusBadge status="system" label="Built-in role" tone="accent" />}
          <span>
            {number(role.userCount)} {role.userCount === 1 ? "team member" : "team members"}
          </span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {grantedCount} of {catalogue.length} permissions
          </span>
          <span aria-hidden="true">·</span>
          <code>{role.id}</code>
        </div>
        {locked && (
          <InlineAlert tone="info" className="mt-4">
            <span className="inline-flex items-start gap-2">
              <LockIcon size={15} className="mt-0.5 shrink-0" />
              The Super Admin role always has every permission, so the business can never be locked out. Its permissions can’t be changed.
            </span>
          </InlineAlert>
        )}
        {!locked && role.userCount > 0 && !role.isSystem && <p className="mt-3 text-[0.75rem] text-muted">To delete this role, move its team members to another role first.</p>}
      </Panel>

      <PermissionMatrix groups={groups} selected={selected} locked={locked} onChange={setSelected} />

      {dirty && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border border-line bg-porcelain px-4 py-3 shadow-[0_-12px_30px_-20px_rgb(20_18_16/0.35)]">
          <p className="text-[0.8125rem] text-ink-soft">
            Unsaved changes: <span className="text-success">{added.length} added</span>, <span className="text-danger">{removed.length} removed</span>
          </p>
          <div className="flex gap-2">
            <AdminButton size="sm" variant="ghost" onClick={() => setSelected(new Set(role.permissions))}>
              Discard
            </AdminButton>
            <AdminButton size="sm" variant="primary" onClick={() => setConfirming(true)}>
              Review &amp; save
            </AdminButton>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void confirmSave()}
        title={`Update permissions for ${role.name}?`}
        description={`This changes what ${role.userCount === 1 ? "the 1 team member" : `the ${number(role.userCount)} team members`} with this role can see and do. The change is recorded in the audit log.`}
        confirmLabel="Save permissions"
        pending={save.pending}
        error={formErrorMessage(save.error)}
      >
        <div className="space-y-4">
          <PermissionList title="Granted" codes={added} labels={labels} tone="success" />
          <PermissionList title="Removed" codes={removed} labels={labels} tone="danger" />
          {isOwnRole && removed.length > 0 && <InlineAlert tone="warning">This is your own role. Removing permissions may take away your access to parts of the admin panel, including this page.</InlineAlert>}
        </div>
      </ConfirmDialog>

      {!role.isSystem && (
        <ConfirmDialog
          open={deleting}
          onClose={() => setDeleting(false)}
          onConfirm={() => void confirmDelete()}
          title={`Delete ${role.name}?`}
          description="The role and its permission list will be removed. This can’t be undone."
          confirmLabel="Delete role"
          tone="danger"
          pending={remove.pending}
          error={formErrorMessage(remove.error)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CreateRoleDialog({ roles, groups, onClose, onCreated }: { roles: Role[]; groups: PermissionGroup[]; onClose: () => void; onCreated: (role: Role) => void }) {
  const formId = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((body: { id: string; name: string; description: string; permissions: string[] }) => adminApi.post<Role>("/roles", body));
  const errors: Record<string, string> = { ...mutation.fieldErrors, ...clientErrors };
  const roleCode = code ?? slugify(name);

  async function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter a role name.";
    if (!/^[a-z][a-z0-9_]{2,39}$/.test(roleCode)) next.id = "Use 3–40 lowercase letters, numbers or underscores, starting with a letter.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    const catalogue = new Set(groups.flatMap((group) => Object.keys(group.permissions)));
    const template = roles.find((role) => role.id === templateId);
    const created = await mutation.run({ id: roleCode, name: name.trim(), description: description.trim(), permissions: (template?.permissions ?? []).filter((permission) => catalogue.has(permission)) });
    if (created) {
      toast({ title: "Role created", description: created.name, tone: "success" });
      onCreated(created);
    }
  }

  const shown = ["id", "name", "description"];
  return (
    <AdminDialog
      open
      onClose={onClose}
      title="Create a custom role"
      description="Start empty or copy the permissions of an existing role, then fine-tune them."
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={mutation.pending}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" form={formId} variant="primary" loading={mutation.pending}>
            Create role
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
        <TextInput label="Role name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} placeholder="e.g. Store Staff" />
        <TextInput label="Code" required maxLength={40} value={roleCode} onChange={(e) => setCode(e.target.value.toLowerCase())} error={errors.id} hint="Permanent identifier. Lowercase letters, numbers and underscores." className="font-mono" />
        <TextArea label="Description" rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} hint="What this role is for." />
        <SelectInput
          label="Start from"
          placeholder="No permissions (start empty)"
          options={roles.map((role) => ({ value: role.id, label: `${role.name} (${role.permissions.length} permissions)` }))}
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
        />
        {formErrorMessage(mutation.error, shown) && <InlineAlert>{formErrorMessage(mutation.error, shown)}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}

/* ------------------------------------------------------------------ */

export default function RolesPage() {
  const { can, admin, refresh } = useAdmin();
  const allowed = can("settings:manage_users");
  const { values, setFilters } = useUrlFilters(["role"] as const);
  const { data, error, reload, setData } = useAdminResource<RolesResponse>(allowed ? "/roles" : null);
  const [creating, setCreating] = useState(false);

  const header = (
    <PageHeader
      title="Roles & permissions"
      description="A role is a named set of permissions. Every team member has one role."
      back={{ href: "/admin/settings", label: "Settings" }}
      actions={
        allowed &&
        data && (
          <AdminButton variant="primary" onClick={() => setCreating(true)}>
            <PlusIcon size={15} />
            New role
          </AdminButton>
        )
      }
    />
  );

  if (!allowed) {
    return (
      <>
        {header}
        <PermissionDenied message="Managing roles needs the “Manage admin users, roles and permissions” permission." />
      </>
    );
  }

  const selectedRole = data ? (data.roles.find((role) => role.id === values.role) ?? data.roles[0]) : undefined;

  return (
    <>
      {header}
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingBlock rows={6} />}
      {data && (
        <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <Panel title="Roles" flush className="lg:sticky lg:top-4">
            <ul className="divide-y divide-line" aria-label="Roles">
              {data.roles.map((role) => {
                const active = role.id === selectedRole?.id;
                return (
                  <li key={role.id}>
                    <button
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => setFilters({ role: role.id })}
                      className={cn("block w-full border-l-2 px-4 py-3 text-left transition-colors", active ? "border-ink bg-cream/70" : "border-transparent hover:bg-cream/40")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[0.875rem] font-medium text-ink">{role.name}</span>
                        {role.id === SUPER_ADMIN_ROLE ? <LockIcon size={13} className="text-muted" /> : role.isSystem ? <StatusBadge status="system" label="Built-in" tone="accent" /> : null}
                      </span>
                      {role.description && <span className="mt-0.5 line-clamp-2 block text-[0.75rem] text-muted">{role.description}</span>}
                      <span className="mt-1 block text-[0.6875rem] text-subtle">
                        {number(role.userCount)} {role.userCount === 1 ? "member" : "members"} · {role.id === SUPER_ADMIN_ROLE ? "all" : role.permissions.length} permissions
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {selectedRole ? (
            <RoleEditor
              key={`${selectedRole.id}:${selectedRole.updatedAt}:${selectedRole.permissions.join(",")}`}
              role={selectedRole}
              groups={data.permissionGroups}
              isOwnRole={selectedRole.id === admin.roleId}
              onSaved={(updated) => {
                setData({ ...data, roles: data.roles.map((role) => (role.id === updated.id ? updated : role)) });
                if (updated.id === admin.roleId) refresh();
              }}
              onDeleted={() => {
                setFilters({ role: "" });
                reload();
              }}
            />
          ) : (
            <Panel>
              <p className="text-[0.875rem] text-muted">No roles found.</p>
            </Panel>
          )}
        </div>
      )}

      {creating && data && (
        <CreateRoleDialog
          roles={data.roles}
          groups={data.permissionGroups}
          onClose={() => setCreating(false)}
          onCreated={(role) => {
            setCreating(false);
            setFilters({ role: role.id });
            reload();
          }}
        />
      )}
    </>
  );
}
