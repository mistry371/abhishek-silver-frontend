"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { EditIcon, TrashIcon } from "@/components/admin/icons";
import { ImportAction } from "@/components/admin/ImportDialog";
import { CouponDialog, couponPayload, couponScopeSummary, type Coupon } from "@/components/admin/pricing/CouponDialog";
import { discountLabel } from "@/components/admin/pricing/shared";
import { AdminButton, ConfirmDialog, DataTable, FilterBar, FilterSelect, Pagination, PageHeader, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi, type Paginated } from "@/lib/admin/client";
import { formatDateTime, money, number as formatNumber } from "@/lib/admin/format";
import { useAdminResource, useMutation, useUrlFilters } from "@/lib/admin/hooks";

export default function CouponsPage() {
  const { can } = useAdmin();
  const canManage = can("marketing:manage");
  const { values, setFilters } = useUrlFilters(["q", "active", "page"] as const);
  const page = Math.max(1, Number(values.page) || 1);
  const { latest, loading, error, reload } = useAdminResource<Paginated<Coupon>>("/coupons", { q: values.q || undefined, active: values.active || undefined, page, pageSize: 20 });
  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [removing, setRemoving] = useState<Coupon | null>(null);

  const removal = useMutation(async (coupon: Coupon) => {
    if (coupon.usedCount > 0) {
      await adminApi.patch<Coupon>(`/coupons/${coupon.id}`, { ...couponPayload(coupon), active: false });
      return "deactivated" as const;
    }
    await adminApi.del(`/coupons/${coupon.id}`);
    return "deleted" as const;
  });

  async function confirmRemoval() {
    if (!removing) return;
    const outcome = await removal.run(removing);
    if (!outcome) return;
    toast({ tone: "success", title: outcome === "deleted" ? `Coupon ${removing.code} deleted` : `Coupon ${removing.code} deactivated` });
    setRemoving(null);
    reload();
  }

  const columns: Column<Coupon>[] = [
    {
      key: "code",
      header: "Code",
      cell: (row) => (
        <div className="min-w-[8rem]">
          <p className="font-medium tracking-[0.06em]">{row.code}</p>
          <p className="mt-0.5 max-w-[16rem] truncate text-[0.75rem] text-muted" title={row.description}>
            {row.description}
          </p>
        </div>
      ),
    },
    { key: "discount", header: "Discount", cell: (row) => <span className="whitespace-nowrap">{discountLabel(row)}</span> },
    { key: "minOrder", header: "Min order", align: "right", cell: (row) => (row.minOrderValue === null ? <span className="text-muted">—</span> : money(row.minOrderValue)) },
    { key: "maxDiscount", header: "Max discount", align: "right", priority: "low", cell: (row) => (row.maxDiscount === null ? <span className="text-muted">—</span> : money(row.maxDiscount)) },
    {
      key: "scope",
      header: "Applies to",
      priority: "low",
      cell: (row) => (
        <span className="whitespace-nowrap" title={row.appliesTo?.categorySlugs?.join(", ")}>
          {couponScopeSummary(row.appliesTo)}
        </span>
      ),
    },
    {
      key: "window",
      header: "Valid",
      cell: (row) => (
        <div className="whitespace-nowrap text-[0.75rem] text-ink-soft">
          <p>From {row.startsAt ? formatDateTime(row.startsAt) : "creation"}</p>
          <p>{row.endsAt ? `Until ${formatDateTime(row.endsAt)}` : "No end date"}</p>
        </div>
      ),
    },
    { key: "used", header: "Used", align: "right", cell: (row) => <span className="whitespace-nowrap">{`${formatNumber(row.usedCount)} / ${row.usageLimit === null ? "∞" : formatNumber(row.usageLimit)}`}</span> },
    { key: "state", header: "State", cell: (row) => <StatusBadge status={row.state} /> },
  ];
  if (canManage) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <AdminButton size="sm" variant="ghost" onClick={() => setEditing(row)} aria-label={`Edit coupon ${row.code}`}>
            <EditIcon size={14} />
          </AdminButton>
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => {
              removal.clearError();
              setRemoving(row);
            }}
            aria-label={row.usedCount > 0 ? `Deactivate coupon ${row.code}` : `Delete coupon ${row.code}`}
            title={row.usedCount > 0 ? "Used coupons can’t be deleted" : "Delete"}
          >
            <TrashIcon size={14} />
          </AdminButton>
        </div>
      ),
    });
  }

  const newButton = canManage ? (
    <AdminButton variant="primary" onClick={() => setEditing("new")}>
      <PlusIcon size={15} />
      New coupon
    </AdminButton>
  ) : undefined;

  const used = Boolean(removing && removing.usedCount > 0);

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Checkout codes with discounts, limits and schedules. Coupon discounts apply at checkout and don’t change website prices."
        actions={
          <>
            <ImportAction entity="coupons" onImported={reload} />
            {newButton}
          </>
        }
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Search code or description" />
        <FilterSelect
          label="Enabled"
          value={values.active}
          onChange={(active) => setFilters({ active })}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={latest?.items}
        getRowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={
          values.q || values.active
            ? { title: "No coupons match", description: "Try a different search or filter." }
            : { title: "No coupons yet", description: "Create a coupon code customers can use at checkout.", action: newButton }
        }
        footer={latest && latest.total > 0 ? <Pagination page={latest.page} totalPages={latest.totalPages} total={latest.total} pageSize={latest.pageSize} onPageChange={(next) => setFilters({ page: String(next) })} /> : undefined}
      />

      {editing && (
        <CouponDialog
          coupon={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => {
          if (!removal.pending) setRemoving(null);
        }}
        onConfirm={confirmRemoval}
        title={used ? `Coupon ${removing?.code} can’t be deleted` : `Delete coupon ${removing?.code}?`}
        description={
          used
            ? `It has been used ${removing?.usedCount} time${removing?.usedCount === 1 ? "" : "s"}, so it’s kept for order records. ${removing?.active ? "Deactivate it to stop customers using it." : "It’s already inactive."}`
            : "The code stops working immediately. This can’t be undone."
        }
        confirmLabel={used ? "Deactivate coupon" : "Delete coupon"}
        confirmDisabled={used && !removing?.active}
        tone={used ? "primary" : "danger"}
        pending={removal.pending}
        error={removal.error?.message}
      />
    </>
  );
}
