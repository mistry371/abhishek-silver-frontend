"use client";

import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminSession";
import { HistoryIcon } from "@/components/admin/icons";
import { LocationsPanel } from "@/components/admin/settings/LocationsPanel";
import { BillingSettingsForm, CommerceSettingsForm, ExpenseSettingsForm, GeneralSettingsForm, InventorySettingsForm } from "@/components/admin/settings/SettingsForms";
import { TeamPanel } from "@/components/admin/settings/TeamPanel";
import type { AllSettings, SettingKey } from "@/components/admin/settings/types";
import { AdminLinkButton, ErrorState, InlineAlert, LoadingBlock, PageHeader, Panel, PermissionDenied, Tabs } from "@/components/admin/ui";
import { ShieldIcon, UserIcon } from "@/components/icons";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

type TabKey = SettingKey | "locations" | "team";

const SETTING_TABS: { value: SettingKey; label: string }[] = [
  { value: "general", label: "General" },
  { value: "commerce", label: "Commerce" },
  { value: "inventory", label: "Inventory" },
  { value: "billing", label: "Billing" },
  { value: "expenses", label: "Expenses" },
];

const isSettingKey = (value: string): value is SettingKey => SETTING_TABS.some((tab) => tab.value === value);

export default function SettingsPage() {
  const { can } = useAdmin();
  const canView = can("settings:view");
  const canManage = can("settings:manage");
  const canUsers = can("settings:manage_users");
  const canAudit = can("audit:view");
  const canLocations = can("inventory:view") && (canView || canManage);

  const tabs: { value: TabKey; label: string }[] = [...(canView ? SETTING_TABS : []), ...(canLocations ? [{ value: "locations" as const, label: "Stock locations" }] : []), ...(canUsers ? [{ value: "team" as const, label: "Team" }] : [])];

  const { values, setFilters } = useUrlFilters(["tab"] as const);
  const active = tabs.find((tab) => tab.value === values.tab)?.value ?? tabs[0]?.value;
  const settings = useAdminResource<AllSettings>(canView && active && isSettingKey(active) ? "/settings" : null);

  function saved<K extends SettingKey>(key: K, value: AllSettings[K]) {
    if (!settings.data) return;
    const next: AllSettings = { ...settings.data };
    next[key] = value;
    settings.setData(next);
  }

  function renderSettingForm(key: SettingKey, data: AllSettings) {
    switch (key) {
      case "general":
        return <GeneralSettingsForm key={JSON.stringify(data.general)} value={data.general} canManage={canManage} onSaved={(value) => saved("general", value)} />;
      case "commerce":
        return <CommerceSettingsForm key={JSON.stringify(data.commerce)} value={data.commerce} canManage={canManage} onSaved={(value) => saved("commerce", value)} />;
      case "inventory":
        return <InventorySettingsForm key={JSON.stringify(data.inventory)} value={data.inventory} canManage={canManage} onSaved={(value) => saved("inventory", value)} />;
      case "billing":
        return <BillingSettingsForm key={JSON.stringify(data.billing)} value={data.billing} canManage={canManage} onSaved={(value) => saved("billing", value)} />;
      case "expenses":
        return <ExpenseSettingsForm key={JSON.stringify(data.expenses)} value={data.expenses} canManage={canManage} onSaved={(value) => saved("expenses", value)} />;
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Business rules, stock locations and who can access the admin panel."
        actions={
          <>
            <AdminLinkButton href="/admin/settings/profile" variant="ghost">
              <UserIcon size={15} />
              My profile
            </AdminLinkButton>
            {canUsers && (
              <AdminLinkButton href="/admin/settings/roles">
                <ShieldIcon size={15} />
                Roles &amp; permissions
              </AdminLinkButton>
            )}
            {canAudit && (
              <AdminLinkButton href="/admin/settings/audit-log">
                <HistoryIcon size={15} />
                Audit log
              </AdminLinkButton>
            )}
          </>
        }
      />

      {!active ? (
        canAudit ? (
          <Panel>
            <p className="text-[0.875rem] text-ink-soft">
              Your role can’t view or change settings, but you can review activity in the{" "}
              <Link href="/admin/settings/audit-log" className="text-champagne-deep underline-offset-4 hover:underline">
                audit log
              </Link>
              .
            </p>
          </Panel>
        ) : (
          <PermissionDenied message="Your role doesn’t include access to settings. You can still update your own profile." />
        )
      ) : (
        <>
          <Tabs tabs={tabs} value={active} onChange={(tab) => setFilters({ tab: tab === tabs[0]?.value ? "" : tab })} className="mb-6" />

          {isSettingKey(active) && (
            <div className="max-w-4xl space-y-4">
              {!canManage && <InlineAlert tone="info">You can view these settings. Changing them needs the “Change business settings” permission.</InlineAlert>}
              {settings.error ? <ErrorState error={settings.error} onRetry={settings.reload} /> : !settings.data ? <LoadingBlock rows={5} /> : renderSettingForm(active, settings.data)}
            </div>
          )}
          {active === "locations" && <LocationsPanel canManage={canManage} />}
          {active === "team" && <TeamPanel />}
        </>
      )}
    </>
  );
}
