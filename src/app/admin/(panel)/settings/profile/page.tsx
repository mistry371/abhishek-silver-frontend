"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { FormSection, TextInput } from "@/components/admin/fields";
import { SaveIcon } from "@/components/admin/icons";
import { formErrorMessage } from "@/components/admin/settings/errors";
import { PASSWORD_HINT } from "@/components/admin/settings/types";
import { AdminButton, ErrorState, InlineAlert, KeyValue, LoadingBlock, PageHeader, Panel } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDateTime, number } from "@/lib/admin/format";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";

interface Profile {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  mobile: string | null;
  lastLoginAt: string | null;
}

function ProfileForm({ profile, onSaved }: { profile: Profile; onSaved: (profile: Profile) => void }) {
  const [name, setName] = useState(profile.name);
  const [mobile, setMobile] = useState(profile.mobile ?? "");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const mutation = useMutation((body: { name: string; mobile: string | null }) => adminApi.patch<Profile>("/profile", body));
  const errors: Record<string, string> = { ...mutation.fieldErrors, ...clientErrors };

  async function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Enter your name.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    const updated = await mutation.run({ name: name.trim(), mobile: mobile.trim() || null });
    if (updated) {
      toast({ title: "Profile updated", tone: "success" });
      onSaved(updated);
    }
  }

  const message = formErrorMessage(mutation.error, ["name", "mobile"]);
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormSection title="Your details" description="Your name appears in the admin panel and on the audit log.">
        <TextInput label="Full name" required maxLength={120} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} containerClassName="sm:col-span-2" />
        <TextInput label="Email" value={profile.email} disabled readOnly hint="Ask a Super Admin to change your sign-in email." />
        <TextInput label="Mobile" type="tel" inputMode="tel" autoComplete="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} error={errors.mobile} hint="Optional. 10-digit Indian mobile number." />
      </FormSection>
      {message && <InlineAlert>{message}</InlineAlert>}
      <div className="flex justify-end">
        <AdminButton type="submit" variant="primary" loading={mutation.pending}>
          <SaveIcon size={15} />
          Save details
        </AdminButton>
      </div>
    </form>
  );
}

function PasswordForm({ onChanged }: { onChanged: () => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const mutation = useMutation(async (body: { currentPassword: string; newPassword: string }) => {
    await adminApi.post<void>("/profile/password", body);
    return true;
  });
  const errors: Record<string, string> = { ...mutation.fieldErrors, ...clientErrors };
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  async function submit() {
    const next: Record<string, string> = {};
    if (!form.currentPassword) next.currentPassword = "Enter your current password.";
    if (!form.newPassword) next.newPassword = "Enter a new password.";
    if (form.newPassword !== form.confirmPassword) next.confirmPassword = "The new passwords don’t match.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    if (await mutation.run({ currentPassword: form.currentPassword, newPassword: form.newPassword })) {
      toast({ title: "Password changed", description: "Use your new password next time you sign in.", tone: "success" });
      onChanged();
    }
  }

  const message = formErrorMessage(mutation.error, ["currentPassword", "newPassword"]);
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FormSection title="Change password" description="You’ll need your current password.">
        <TextInput label="Current password" type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => set({ currentPassword: e.target.value })} error={errors.currentPassword} containerClassName="sm:col-span-2" />
        <TextInput label="New password" type="password" required autoComplete="new-password" value={form.newPassword} onChange={(e) => set({ newPassword: e.target.value })} error={errors.newPassword} hint={PASSWORD_HINT} />
        <TextInput label="Confirm new password" type="password" required autoComplete="new-password" value={form.confirmPassword} onChange={(e) => set({ confirmPassword: e.target.value })} error={errors.confirmPassword} />
      </FormSection>
      {message && <InlineAlert>{message}</InlineAlert>}
      <div className="flex justify-end">
        <AdminButton type="submit" variant="primary" loading={mutation.pending}>
          Change password
        </AdminButton>
      </div>
    </form>
  );
}

export default function ProfilePage() {
  const { refresh } = useAdmin();
  const { data, error, reload, setData } = useAdminResource<Profile>("/profile");
  const [passwordFormKey, setPasswordFormKey] = useState(0);

  return (
    <>
      <PageHeader title="My profile" description="Your details and sign-in password." back={{ href: "/admin/settings", label: "Settings" }} />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingBlock rows={5} />}
      {data && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-8">
            <ProfileForm
              key={`${data.name}|${data.mobile ?? ""}`}
              profile={data}
              onSaved={(updated) => {
                setData(updated);
                refresh();
              }}
            />
            <PasswordForm key={passwordFormKey} onChanged={() => setPasswordFormKey((value) => value + 1)} />
          </div>
          <Panel title="Account" className="h-fit">
            <KeyValue
              columns={1}
              items={[
                { label: "Email", value: data.email },
                { label: "Role", value: data.roleName },
                { label: "Permissions", value: `${number(data.permissions.length)} granted by your role` },
                { label: "Last sign-in", value: data.lastLoginAt ? formatDateTime(data.lastLoginAt) : "—" },
              ]}
            />
          </Panel>
        </div>
      )}
    </>
  );
}
