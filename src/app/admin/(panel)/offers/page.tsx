"use client";

import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { EditIcon, TrashIcon } from "@/components/admin/icons";
import { OfferDialog, offerTypeOptions, offerWindow, type Offer } from "@/components/admin/pricing/OfferDialog";
import { discountLabel, targetSummary, type CategoryOption, type CollectionOption } from "@/components/admin/pricing/shared";
import { AdminButton, AdminLinkButton, ConfirmDialog, DataTable, FilterBar, FilterSelect, InlineAlert, PageHeader, StatCard, StatusBadge, type Column } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { humanize, number as formatNumber } from "@/lib/admin/format";
import { useAdminResource, useMutation, useUrlFilters } from "@/lib/admin/hooks";

const stateOptions = [
  { value: "running", label: "Running" },
  { value: "scheduled", label: "Scheduled" },
  { value: "ended", label: "Ended" },
  { value: "inactive", label: "Inactive" },
];

export default function OffersPage() {
  const { can } = useAdmin();
  const canManage = can("marketing:manage");
  const { values, setFilters } = useUrlFilters(["state"] as const);
  const { latest, loading, error, reload } = useAdminResource<Offer[]>("/offers");
  const categories = useAdminResource<CategoryOption[]>("/categories");
  const collections = useAdminResource<CollectionOption[]>("/collections");
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [removing, setRemoving] = useState<Offer | null>(null);

  const names: Record<string, string> = {
    ...Object.fromEntries((categories.data ?? []).map((category) => [category.id, category.name])),
    ...Object.fromEntries((collections.data ?? []).map((collection) => [collection.id, collection.name])),
  };
  const rows = latest?.filter((offer) => !values.state || offer.state === values.state);
  const count = (predicate: (offer: Offer) => boolean) => (latest ? latest.filter(predicate).length : 0);

  const removal = useMutation(async (offer: Offer) => {
    await adminApi.del(`/offers/${offer.id}`);
    return true;
  });

  async function confirmRemoval() {
    if (!removing) return;
    const done = await removal.run(removing);
    if (!done) return;
    toast({ tone: "success", title: `“${removing.title}” deleted` });
    setRemoving(null);
    reload();
  }

  const columns: Column<Offer>[] = [
    {
      key: "offer",
      header: "Offer",
      cell: (row) => (
        <div className="flex min-w-[14rem] items-start gap-3">
          {row.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.image.url} alt="" className="h-12 w-12 shrink-0 bg-cream object-cover" />
          ) : (
            <span className="h-12 w-12 shrink-0 bg-cream" aria-hidden="true" />
          )}
          <div className="min-w-0">
            {row.eyebrow && <p className="text-[0.6875rem] uppercase tracking-[0.12em] text-muted">{row.eyebrow}</p>}
            <p className="font-medium">{row.title}</p>
            <p className="text-[0.75rem] text-muted">{offerTypeOptions.find((option) => option.value === row.type)?.label ?? humanize(row.type)}</p>
          </div>
        </div>
      ),
    },
    {
      key: "discount",
      header: "Price discount",
      cell: (row) => (row.discount ? <span className="whitespace-nowrap font-medium">{discountLabel(row.discount)}</span> : <span className="text-muted">Display only</span>),
    },
    { key: "target", header: "Applies to", cell: (row) => <span className="whitespace-nowrap">{targetSummary(row.target, names)}</span> },
    { key: "coupon", header: "Coupon", priority: "low", cell: (row) => (row.couponCode ? <span className="tracking-[0.06em]">{row.couponCode}</span> : <span className="text-muted">—</span>) },
    { key: "window", header: "Runs", cell: (row) => <span className="whitespace-nowrap text-[0.75rem] text-ink-soft">{offerWindow(row.startsAt, row.endsAt)}</span> },
    { key: "order", header: "Order", align: "right", priority: "low", cell: (row) => row.displayOrder },
    { key: "state", header: "State", cell: (row) => <StatusBadge status={row.state} /> },
  ];
  if (canManage) {
    columns.push({
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <AdminButton size="sm" variant="ghost" onClick={() => setEditing(row)} aria-label={`Edit ${row.title}`}>
            <EditIcon size={14} />
          </AdminButton>
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => {
              removal.clearError();
              setRemoving(row);
            }}
            aria-label={`Delete ${row.title}`}
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
      New offer
    </AdminButton>
  ) : undefined;

  const removingLive = Boolean(removing?.discount && removing.state === "running");

  return (
    <>
      <PageHeader
        title="Offers"
        description="Website offer banners and campaigns. Offers with a price discount change live product prices while they run."
        actions={
          <>
            <AdminLinkButton href="/admin/pricing?tab=offers" variant="ghost">
              Pricing impact
            </AdminLinkButton>
            {newButton}
          </>
        }
      />

      {latest && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Running" value={formatNumber(count((offer) => offer.state === "running"))} />
          <StatCard label="Discounting prices now" value={formatNumber(count((offer) => offer.state === "running" && Boolean(offer.discount)))} href="/admin/pricing?tab=offers" />
          <StatCard label="Scheduled" value={formatNumber(count((offer) => offer.state === "scheduled"))} />
          <StatCard label="Ended or inactive" value={formatNumber(count((offer) => offer.state === "ended" || offer.state === "inactive"))} />
        </div>
      )}

      <FilterBar>
        <FilterSelect label="State" value={values.state} onChange={(state) => setFilters({ state })} options={stateOptions} allLabel="All offers" />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={reload}
        empty={values.state ? { title: "No offers in this state" } : { title: "No offers yet", description: "Create an offer banner, optionally with a price discount.", action: newButton }}
      />

      {editing && (
        <OfferDialog
          offer={editing === "new" ? null : editing}
          categories={{ data: categories.data, error: categories.error }}
          collections={{ data: collections.data, error: collections.error }}
          names={names}
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
        title={`Delete “${removing?.title ?? ""}”?`}
        description="The offer is removed from the website. This can’t be undone — deactivate it instead if you may reuse it."
        confirmLabel="Delete offer"
        tone="danger"
        pending={removal.pending}
        error={removal.error?.message}
      >
        {removingLive && removing?.discount && (
          <InlineAlert tone="warning">
            This offer is discounting live prices ({discountLabel(removing.discount)} on {targetSummary(removing.target, names).toLowerCase()}). Website prices return to normal immediately.
          </InlineAlert>
        )}
      </ConfirmDialog>
    </>
  );
}
