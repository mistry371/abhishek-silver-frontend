"use client";

import { useId, useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { SelectInput, TextInput } from "@/components/admin/fields";
import { EditIcon, KeyIcon } from "@/components/admin/icons";
import { AdminButton, AdminDialog, AdminLinkButton, ConfirmDialog, DataTable, InlineAlert, Panel, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import { formErrorMessage } from "./errors";
import { PASSWORD_HINT, type RolesResponse, type TeamUser } from "./types";

type RoleOption = { value: string; label: string };

const STATUS_OPTIONS = [
  { value: "active", label: "Active — can sign in" },
  { value: "disabled", label: "Disabled — can’t use the admin panel" },
];

function DialogFooter({ formId, pending, label, onCancel }: { formId: string; pending: boolean; label: string; onCancel: () => void }) {
  return (
    <>
      <AdminButton variant="ghost" onClick={onCancel} disabled={pending}>
        Cancel
      </AdminButton>
      <AdminButton type="submit" form={formId} variant="primary" loading={pending}>
        {label}
      </AdminButton>
    </>
  );
}

function RolesNotice({ error }: { error: AdminApiError | undefined }) {
  if (!error) return null;
  return <InlineAlert tone="warning">Roles couldn’t be loaded: {error.message}</InlineAlert>;
}

/* ------------------------------------------------------------------ */

function AddUserDialog({ roleOptions, rolesError, onClose, onSaved }: { roleOptions: RoleOption[]; rolesError?: AdminApiError; onClose: () => void; onSaved: () => void }) {
  const formId = useId();
  const [form, setForm] = useState({ name: "", email: "", mobile: "", roleId: "", password: "", confirm: "" });
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((body: { name: string; email: string; mobile: string | null; roleId: string; password: string }) => adminApi.post<TeamUser>("/users", body));
  const errors: Record<string, string> = { ...mutation.fieldErrors, ...clientErrors };
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Enter their name.";
    if (!form.email.trim()) next.email = "Enter their email address.";
    if (!form.roleId) next.roleId = "Choose a role.";
    if (form.password.length < 8) next.password = PASSWORD_HINT;
    if (form.password !== form.confirm) next.confirm = "The passwords don’t match.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    const created = await mutation.run({ name: form.name.trim(), email: form.email.trim(), mobile: form.mobile.trim() || null, roleId: form.roleId, password: form.password });
    if (created) {
      toast({ title: "Team member added", description: `${created.name} can now sign in with ${created.email}.`, tone: "success" });
      onSaved();
    }
  }

  const shown = ["name", "email", "mobile", "roleId", "password"];
  return (
    <AdminDialog open onClose={onClose} title="Add team member" description="They sign in with this email and password. Share the password with them securely." footer={<DialogFooter formId={formId} pending={mutation.pending} label="Add team member" onCancel={onClose} />}>
      <form
        id={formId}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextInput label="Full name" required maxLength={120} autoComplete="off" value={form.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} containerClassName="sm:col-span-2" />
        <TextInput label="Email" type="email" required autoComplete="off" value={form.email} onChange={(e) => set({ email: e.target.value })} error={errors.email} />
        <TextInput label="Mobile" type="tel" inputMode="tel" autoComplete="off" value={form.mobile} onChange={(e) => set({ mobile: e.target.value })} error={errors.mobile} hint="Optional. 10-digit Indian mobile number." />
        <SelectInput label="Role" required placeholder="Choose a role" options={roleOptions} value={form.roleId} onChange={(e) => set({ roleId: e.target.value })} error={errors.roleId} hint="Decides what they can see and do." containerClassName="sm:col-span-2" />
        <TextInput label="Password" type="password" required autoComplete="new-password" value={form.password} onChange={(e) => set({ password: e.target.value })} error={errors.password} hint={PASSWORD_HINT} />
        <TextInput label="Confirm password" type="password" required autoComplete="new-password" value={form.confirm} onChange={(e) => set({ confirm: e.target.value })} error={errors.confirm} />
        <div className="space-y-3 sm:col-span-2">
          <RolesNotice error={rolesError} />
          {formErrorMessage(mutation.error, shown) && <InlineAlert>{formErrorMessage(mutation.error, shown)}</InlineAlert>}
        </div>
      </form>
    </AdminDialog>
  );
}

/* ------------------------------------------------------------------ */

function EditUserDialog({
  user,
  isSelf,
  roleOptions,
  rolesError,
  onClose,
  onSaved,
}: {
  user: TeamUser;
  isSelf: boolean;
  roleOptions: RoleOption[];
  rolesError?: AdminApiError;
  onClose: () => void;
  onSaved: (user: TeamUser) => void;
}) {
  const formId = useId();
  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile ?? "");
  const [roleId, setRoleId] = useState(user.roleId);
  const [status, setStatus] = useState<TeamUser["status"]>(user.status);
  const [confirming, setConfirming] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((patch: Record<string, string | null>) => adminApi.patch<TeamUser>(`/users/${user.id}`, patch));
  const errors: Record<string, string> = { ...mutation.fieldErrors, ...clientErrors };

  const options = roleOptions.some((option) => option.value === user.roleId) ? roleOptions : [{ value: user.roleId, label: user.roleName }, ...roleOptions];
  const roleLabel = (id: string) => options.find((option) => option.value === id)?.label ?? id;
  const roleChanged = roleId !== user.roleId;
  const statusChanged = status !== user.status;

  function buildPatch() {
    const patch: Record<string, string | null> = {};
    if (name.trim() !== user.name) patch.name = name.trim();
    if ((mobile.trim() || null) !== user.mobile) patch.mobile = mobile.trim() || null;
    if (roleChanged) patch.roleId = roleId;
    if (statusChanged) patch.status = status;
    return patch;
  }

  async function commit() {
    const patch = buildPatch();
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    const updated = await mutation.run(patch);
    if (updated) {
      toast({ title: "Team member updated", description: updated.name, tone: "success" });
      onSaved(updated);
    }
  }

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter their name.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    if (roleChanged || statusChanged) setConfirming(true);
    else void commit();
  }

  const shown = ["name", "mobile", "roleId", "status"];
  return (
    <>
      <AdminDialog
        open={!confirming}
        onClose={onClose}
        title={`Edit ${user.name}`}
        description={user.email}
        footer={<DialogFooter formId={formId} pending={mutation.pending} label="Save changes" onCancel={onClose} />}
      >
        <form
          id={formId}
          noValidate
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <TextInput label="Full name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} containerClassName="sm:col-span-2" />
          <TextInput label="Mobile" type="tel" inputMode="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} error={errors.mobile} hint="Optional. Leave blank to remove." containerClassName="sm:col-span-2" />
          <SelectInput label="Role" required options={options} value={roleId} onChange={(e) => setRoleId(e.target.value)} error={errors.roleId} hint={roleChanged ? "Changing the role changes what they can access." : undefined} />
          <SelectInput
            label="Status"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value as TeamUser["status"])}
            error={errors.status}
            disabled={isSelf && user.status === "active"}
            hint={isSelf ? "You can’t disable your own account." : undefined}
          />
          <div className="space-y-3 sm:col-span-2">
            <RolesNotice error={rolesError} />
            {!confirming && formErrorMessage(mutation.error, shown) && <InlineAlert>{formErrorMessage(mutation.error, shown)}</InlineAlert>}
          </div>
        </form>
      </AdminDialog>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Confirm access change for ${user.name}`}
        description="Role and status changes take effect immediately and are recorded in the audit log."
        confirmLabel={statusChanged && status === "disabled" ? "Disable account" : "Confirm change"}
        tone={statusChanged && status === "disabled" ? "danger" : "primary"}
        pending={mutation.pending}
        error={formErrorMessage(mutation.error)}
        onConfirm={() => void commit()}
      >
        <ul className="space-y-2 text-[0.875rem] text-ink">
          {roleChanged && (
            <li>
              Role: <span className="text-muted line-through">{roleLabel(user.roleId)}</span> → <strong className="font-medium">{roleLabel(roleId)}</strong>
            </li>
          )}
          {statusChanged && (
            <li>{status === "disabled" ? "Disable the account — they won’t be able to use the admin panel until it is re-activated." : "Re-activate the account — they’ll be able to sign in again."}</li>
          )}
        </ul>
        {isSelf && roleChanged && (
          <InlineAlert tone="warning" className="mt-4">
            You’re changing your own role. Your access changes as soon as this is saved.
          </InlineAlert>
        )}
      </ConfirmDialog>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ResetPasswordDialog({ user, onClose, onSaved }: { user: TeamUser; onClose: () => void; onSaved: () => void }) {
  const formId = useId();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const mutation = useMutation(async (value: string) => {
    await adminApi.post<void>(`/users/${user.id}/password`, { password: value });
    return true;
  });
  const errors: Record<string, string> = { ...mutation.fieldErrors, ...clientErrors };

  async function submit() {
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = PASSWORD_HINT;
    if (password !== confirm) next.confirm = "The passwords don’t match.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    if (await mutation.run(password)) {
      toast({ title: "Password reset", description: `Share the new password with ${user.name} securely.`, tone: "success" });
      onSaved();
    }
  }

  return (
    <AdminDialog open onClose={onClose} title={`Reset password for ${user.name}`} description={user.email} footer={<DialogFooter formId={formId} pending={mutation.pending} label="Reset password" onCancel={onClose} />}>
      <form
        id={formId}
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <TextInput label="New password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint={PASSWORD_HINT} />
        <TextInput label="Confirm new password" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        {formErrorMessage(mutation.error, ["password"]) && <InlineAlert>{formErrorMessage(mutation.error, ["password"])}</InlineAlert>}
      </form>
    </AdminDialog>
  );
}

/* ------------------------------------------------------------------ */

export function TeamPanel() {
  const { admin, refresh } = useAdmin();
  const users = useAdminResource<TeamUser[]>("/users");
  const roles = useAdminResource<RolesResponse>("/roles");
  const [dialog, setDialog] = useState<{ kind: "add" } | { kind: "edit" | "password"; user: TeamUser } | null>(null);
  const roleOptions = (roles.data?.roles ?? []).map((role) => ({ value: role.id, label: role.name }));
  const close = () => setDialog(null);

  const columns: Column<TeamUser>[] = [
    {
      key: "name",
      header: "Team member",
      cell: (user) => (
        <div className="min-w-[11rem]">
          <p className="font-medium">
            {user.name}
            {user.id === admin.id && <span className="ml-2 bg-cream px-1.5 py-0.5 text-[0.6875rem] font-normal text-ink-soft">You</span>}
          </p>
          <p className="break-all text-muted">{user.email}</p>
        </div>
      ),
    },
    { key: "mobile", header: "Mobile", priority: "low", cell: (user) => user.mobile ?? "—" },
    { key: "role", header: "Role", cell: (user) => user.roleName },
    { key: "status", header: "Status", cell: (user) => <StatusBadge status={user.status} /> },
    { key: "lastLoginAt", header: "Last sign-in", priority: "low", cell: (user) => (user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never") },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (user) => (
        <div className="flex flex-wrap justify-end gap-1">
          <AdminButton size="sm" variant="ghost" onClick={() => setDialog({ kind: "edit", user })}>
            <EditIcon size={14} />
            Edit
          </AdminButton>
          <AdminButton size="sm" variant="ghost" onClick={() => setDialog({ kind: "password", user })}>
            <KeyIcon size={14} />
            Reset password
          </AdminButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <Panel
        title="Team"
        description="People who can sign in to the admin panel. Each person’s role decides what they can see and do."
        actions={
          <>
            <AdminLinkButton href="/admin/settings/roles" size="sm" variant="ghost">
              Roles &amp; permissions
            </AdminLinkButton>
            <AdminButton size="sm" variant="primary" onClick={() => setDialog({ kind: "add" })}>
              <PlusIcon size={14} />
              Add team member
            </AdminButton>
          </>
        }
        flush
        bodyClassName="[&>div]:border-0"
      >
        <DataTable columns={columns} rows={users.latest} getRowKey={(user) => user.id} loading={users.loading} error={users.error} onRetry={users.reload} empty={{ title: "No team members yet" }} />
      </Panel>

      {dialog?.kind === "add" && (
        <AddUserDialog
          roleOptions={roleOptions}
          rolesError={roles.error}
          onClose={close}
          onSaved={() => {
            close();
            users.reload();
          }}
        />
      )}
      {dialog?.kind === "edit" && (
        <EditUserDialog
          user={dialog.user}
          isSelf={dialog.user.id === admin.id}
          roleOptions={roleOptions}
          rolesError={roles.error}
          onClose={close}
          onSaved={(updated) => {
            close();
            if (updated.id === admin.id) refresh();
            else users.reload();
          }}
        />
      )}
      {dialog?.kind === "password" && <ResetPasswordDialog user={dialog.user} onClose={close} onSaved={close} />}
    </>
  );
}
