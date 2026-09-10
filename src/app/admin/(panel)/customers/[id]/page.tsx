"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { AddressDialog } from "@/components/admin/customers/AddressDialog";
import { ContactLinks } from "@/components/admin/customers/ContactLinks";
import { CustomerFormDialog } from "@/components/admin/customers/CustomerFormDialog";
import { LogEnquiryDialog } from "@/components/admin/customers/LogEnquiryDialog";
import { InternalNotice, NoteComposer } from "@/components/admin/customers/NoteComposer";
import { customerSourceOptions, enquiryTypeOptions, labelOf, telHref } from "@/components/admin/customers/shared";
import type { Customer360, CustomerAddress, CustomerNote } from "@/components/admin/customers/types";
import { EditIcon, TrashIcon } from "@/components/admin/icons";
import {
  AdminButton,
  ConfirmDialog,
  DataTable,
  EmptyNote,
  ErrorState,
  InlineAlert,
  KeyValue,
  LoadingBlock,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
  Tabs,
  type Column,
} from "@/components/admin/ui";
import { ImageOffIcon, PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { formatDate, formatDateTime, humanize, money, number } from "@/lib/admin/format";
import { useAdminResource, useMutation, useUrlFilters } from "@/lib/admin/hooks";

const BACK = { href: "/admin/customers", label: "Customers" };
const TAB_KEYS = ["tab"] as const;
const TAB_DEFAULTS = { tab: "overview" };
const TAB_IDS = ["overview", "orders", "purchases", "invoices", "wishlist", "enquiries", "notes", "activity"] as const;
type TabId = (typeof TAB_IDS)[number];

type OrderRow = Customer360["orders"][number];
type InvoiceRow = Customer360["invoices"][number];
type EnquiryRow = Customer360["enquiries"][number];

const isTab = (value: string): value is TabId => (TAB_IDS as readonly string[]).includes(value);

/** The API links invoices under /admin/billing/invoices; the admin panel serves them at /admin/invoices. */
const activityHref = (href: string | null) => (href ? href.replace(/^\/admin\/billing\/invoices\//, "/admin/invoices/") : null);

const channelLabel = (channel: string) => (channel === "manual" ? "In-store sale" : channel === "online" ? "Online order" : humanize(channel));

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const { values, setFilters } = useUrlFilters(TAB_KEYS, TAB_DEFAULTS);
  const resource = useAdminResource<Customer360>(`/customers/${id}`);
  const [profileDialog, setProfileDialog] = useState({ open: false, key: 0 });
  const data = resource.latest?.customer.id === id ? resource.latest : undefined;

  if (!data) {
    return (
      <>
        <PageHeader back={BACK} title="Customer" />
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : <LoadingBlock rows={8} />}
      </>
    );
  }

  const { customer, stats } = data;
  const tab: TabId = isTab(values.tab) ? values.tab : "overview";
  const canManage = can("customers:manage");
  const openProfileDialog = () => setProfileDialog((current) => ({ open: true, key: current.key + 1 }));

  return (
    <>
      <PageHeader
        back={BACK}
        title={customer.name}
        meta={
          <>
            <span className="text-[0.8125rem] text-ink-soft">{customer.customerCode}</span>
            <StatusBadge status={customer.status} />
            <StatusBadge status="account" label={customer.hasAccount ? "Online account" : "No online account"} tone={customer.hasAccount ? "info" : "neutral"} />
          </>
        }
        actions={
          <>
            <ContactLinks phone={customer.phone} email={customer.email} />
            {canManage && (
              <AdminButton onClick={openProfileDialog}>
                <EditIcon size={15} />
                Edit profile
              </AdminButton>
            )}
          </>
        }
      />

      {resource.error && (
        <InlineAlert className="mb-4">
          {resource.error.message}{" "}
          <button type="button" className="underline" onClick={resource.reload}>
            Retry
          </button>
        </InlineAlert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total spent" value={money(stats.totalSpent)} hint="Recorded sales, excluding refunds" />
        <StatCard label="Purchases" value={number(stats.purchaseCount)} />
        <StatCard label="Online orders" value={number(stats.onlineOrderCount)} />
        <StatCard label="Average purchase" value={money(stats.averagePurchaseValue)} />
        <StatCard label="First purchase" value={formatDate(stats.firstPurchaseAt)} />
        <StatCard label="Last purchase" value={formatDate(stats.lastPurchaseAt)} />
      </div>

      <Tabs
        className="mb-6"
        value={tab}
        onChange={(next) => setFilters({ tab: next })}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "orders", label: "Orders", count: data.orders.length },
          { value: "purchases", label: "Purchases", count: data.purchases.length },
          { value: "invoices", label: "Invoices", count: data.invoices.length },
          { value: "wishlist", label: "Wishlist", count: data.wishlist.length },
          { value: "enquiries", label: "Enquiries", count: data.enquiries.length },
          { value: "notes", label: "Internal notes", count: data.notes.length },
          { value: "activity", label: "Activity" },
        ]}
      />

      {tab === "overview" && (
        <OverviewTab data={data} canManage={canManage} onEditProfile={openProfileDialog} onAddressesChange={(addresses) => resource.setData({ ...data, addresses })} onReload={resource.reload} />
      )}
      {tab === "orders" && <OrdersTab rows={data.orders} />}
      {tab === "purchases" && <PurchasesTab purchases={data.purchases} />}
      {tab === "invoices" && <InvoicesTab rows={data.invoices} />}
      {tab === "wishlist" && <WishlistTab items={data.wishlist} />}
      {tab === "enquiries" && <EnquiriesTab data={data} onReload={resource.reload} />}
      {tab === "notes" && (
        <NotesTab
          data={data}
          onAdded={(note) =>
            resource.setData({
              ...data,
              notes: [note, ...data.notes],
              activity: [{ at: note.createdAt, type: "note", label: `Note by ${note.authorName}`, href: null }, ...data.activity].slice(0, 20),
            })
          }
          onRemoved={(noteId) => resource.setData({ ...data, notes: data.notes.filter((note) => note.id !== noteId) })}
        />
      )}
      {tab === "activity" && <ActivityTab activity={data.activity} />}

      {canManage && (
        <CustomerFormDialog
          key={profileDialog.key}
          open={profileDialog.open}
          customer={customer}
          onClose={() => setProfileDialog((current) => ({ ...current, open: false }))}
          onSaved={() => {
            setProfileDialog((current) => ({ ...current, open: false }));
            resource.reload();
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab({
  data,
  canManage,
  onEditProfile,
  onAddressesChange,
  onReload,
}: {
  data: Customer360;
  canManage: boolean;
  onEditProfile: () => void;
  onAddressesChange: (addresses: CustomerAddress[]) => void;
  onReload: () => void;
}) {
  const { customer, addresses } = data;
  const [addressDialog, setAddressDialog] = useState({ open: false, key: 0 });
  const [removing, setRemoving] = useState<CustomerAddress | null>(null);
  const remove = useMutation(async (addressId: string) => {
    await adminApi.del(`/customers/${customer.id}/addresses/${addressId}`);
    return true;
  });

  async function confirmRemove() {
    if (!removing) return;
    const done = await remove.run(removing.id);
    if (!done) return;
    setRemoving(null);
    toast({ title: "Address removed", tone: "success" });
    onReload();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel
        title="Profile"
        actions={
          canManage && (
            <AdminButton size="sm" onClick={onEditProfile}>
              <EditIcon size={14} />
              Edit profile
            </AdminButton>
          )
        }
      >
        <KeyValue
          items={[
            { label: "Customer ID", value: customer.customerCode },
            { label: "Name", value: customer.name },
            {
              label: "Mobile",
              value: customer.phone ? (
                <a href={telHref(customer.phone)} className="hover:underline">
                  {customer.phone}
                </a>
              ) : null,
            },
            {
              label: "Email",
              value: customer.email ? (
                <>
                  <a href={`mailto:${customer.email}`} className="hover:underline">
                    {customer.email}
                  </a>
                  {customer.hasAccount && <span className="block text-[0.75rem] text-muted">Sign-in email for their online account</span>}
                </>
              ) : null,
            },
            { label: "Status", value: <StatusBadge status={customer.status} /> },
            { label: "Online account", value: customer.hasAccount ? "Yes" : "No" },
            { label: "Source", value: labelOf(customerSourceOptions, customer.source) },
            { label: "Marketing opt-in", value: customer.marketingOptIn ? "Opted in" : "Not opted in" },
            { label: "Registered", value: formatDateTime(customer.createdAt) },
            { label: "Last updated", value: formatDateTime(customer.updatedAt) },
          ]}
        />
      </Panel>

      <Panel
        title="Addresses"
        actions={
          canManage && (
            <AdminButton size="sm" onClick={() => setAddressDialog((current) => ({ open: true, key: current.key + 1 }))}>
              <PlusIcon size={14} />
              Add address
            </AdminButton>
          )
        }
      >
        {addresses.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">No saved addresses.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {addresses.map((address) => (
              <li key={address.id} className="flex items-start justify-between gap-3 border border-line p-4">
                <div className="min-w-0 text-[0.8125rem] leading-relaxed text-ink">
                  <p className="font-medium">
                    {address.fullName}
                    {address.label && <span className="font-normal text-muted"> · {address.label}</span>}
                  </p>
                  <p>{address.line1}</p>
                  {address.line2 && <p>{address.line2}</p>}
                  {address.landmark && <p className="text-ink-soft">Near {address.landmark}</p>}
                  <p>
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  <p>{address.country}</p>
                  <p className="text-muted">{address.phone}</p>
                  {(address.isDefaultShipping || address.isDefaultBilling) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {address.isDefaultShipping && <StatusBadge status="default" label="Default shipping" tone="accent" />}
                      {address.isDefaultBilling && <StatusBadge status="default" label="Default billing" tone="accent" />}
                    </div>
                  )}
                </div>
                {canManage && (
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove address ${address.line1}`}
                    onClick={() => {
                      remove.clearError();
                      setRemoving(address);
                    }}
                  >
                    <TrashIcon size={14} />
                  </AdminButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {canManage && (
        <AddressDialog
          key={addressDialog.key}
          open={addressDialog.open}
          customerId={customer.id}
          defaults={{ fullName: customer.name, phone: customer.phone ?? "" }}
          onClose={() => setAddressDialog((current) => ({ ...current, open: false }))}
          onSaved={(next) => {
            setAddressDialog((current) => ({ ...current, open: false }));
            onAddressesChange(next);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title="Remove this address?"
        description={removing ? `${removing.line1}, ${removing.city} ${removing.postalCode} will be removed from this customer.` : undefined}
        confirmLabel="Remove address"
        tone="danger"
        pending={remove.pending}
        error={remove.error?.message}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Orders, purchases, invoices, wishlist, enquiries                    */
/* ------------------------------------------------------------------ */

function OrdersTab({ rows }: { rows: OrderRow[] }) {
  const columns: Column<OrderRow>[] = [
    {
      key: "number",
      header: "Order",
      cell: (row) => (
        <Link href={`/admin/orders/${row.id}`} className="font-medium hover:underline">
          {row.orderNumber}
        </Link>
      ),
    },
    { key: "date", header: "Placed", cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span> },
    { key: "items", header: "Items", align: "right", priority: "low", cell: (row) => number(row.itemCount) },
    { key: "payment", header: "Payment", cell: (row) => <StatusBadge status={row.paymentStatus} /> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "total", header: "Total", align: "right", cell: (row) => money(row.grandTotal) },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      rowHref={(row) => `/admin/orders/${row.id}`}
      empty={{ title: "No online orders", description: "Orders placed on the website by this customer appear here." }}
    />
  );
}

function PurchasesTab({ purchases }: { purchases: Customer360["purchases"] }) {
  if (!purchases.length) {
    return (
      <Panel>
        <EmptyNote title="No purchases yet" description="Online orders and in-store sales recorded for this customer appear here." />
      </Panel>
    );
  }
  return (
    <div className="space-y-4">
      {purchases.map((sale) => (
        <Panel
          key={sale.id}
          flush
          title={
            <Link href={`/admin/sales/${sale.id}`} className="hover:underline">
              {sale.saleNumber}
            </Link>
          }
          description={`${channelLabel(sale.channel)} · ${formatDateTime(sale.createdAt)}`}
          actions={
            <>
              <StatusBadge status={sale.paymentStatus} />
              <span className="text-[0.9375rem] font-medium tabular-nums text-ink">{money(sale.grandTotal)}</span>
            </>
          }
        >
          {sale.items.length === 0 ? (
            <p className="px-5 py-3 text-[0.8125rem] text-muted">No item lines recorded.</p>
          ) : (
            <ul className="divide-y divide-line">
              {sale.items.map((item, index) => (
                <li key={`${item.sku}-${index}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-[0.8125rem]">
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{item.name}</span>
                    <span className="block text-muted">
                      {item.sku} · Qty {number(item.quantity)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">{money(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ))}
    </div>
  );
}

function InvoicesTab({ rows }: { rows: InvoiceRow[] }) {
  const columns: Column<InvoiceRow>[] = [
    {
      key: "number",
      header: "Invoice",
      cell: (row) => (
        <Link href={`/admin/invoices/${row.id}`} className="font-medium hover:underline">
          {row.invoiceNumber ?? "Draft"}
        </Link>
      ),
    },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
    { key: "source", header: "Source", priority: "low", cell: (row) => humanize(row.source) },
    { key: "issued", header: "Issued", cell: (row) => <span className="whitespace-nowrap">{row.issuedAt ? formatDate(row.issuedAt) : "Not issued"}</span> },
    { key: "total", header: "Total", align: "right", cell: (row) => money(row.grandTotal) },
    {
      key: "balance",
      header: "Balance due",
      align: "right",
      cell: (row) => <span className={row.balanceDue > 0 ? "text-warning" : "text-muted"}>{money(row.balanceDue)}</span>,
    },
  ];
  return (
    <DataTable
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.id}
      rowHref={(row) => `/admin/invoices/${row.id}`}
      empty={{ title: "No invoices", description: "Invoices raised for this customer appear here." }}
    />
  );
}

function WishlistTab({ items }: { items: Customer360["wishlist"] }) {
  if (!items.length) {
    return (
      <Panel>
        <EmptyNote title="Wishlist is empty" description="Products this customer saves on the website appear here." />
      </Panel>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <li key={item.productId}>
          <Link href={`/admin/products/${item.productId}`} className="flex h-full gap-3 border border-line bg-porcelain p-3 transition-colors hover:border-ink">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image.url} alt={item.image.alt || item.name} className="h-20 w-16 shrink-0 bg-cream object-cover" />
            ) : (
              <span className="flex h-20 w-16 shrink-0 items-center justify-center bg-cream text-muted">
                <ImageOffIcon size={18} />
              </span>
            )}
            <span className="min-w-0 text-[0.8125rem]">
              <span className="block font-medium text-ink">{item.name}</span>
              <span className="block text-muted">{item.sku}</span>
              <span className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                <span className="text-[0.75rem] text-muted">Saved {formatDate(item.addedAt)}</span>
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EnquiriesTab({ data, onReload }: { data: Customer360; onReload: () => void }) {
  const { can } = useAdmin();
  const [dialog, setDialog] = useState({ open: false, key: 0 });
  const canLog = can("enquiries:manage");
  const columns: Column<EnquiryRow>[] = [
    {
      key: "reference",
      header: "Reference",
      cell: (row) => (
        <Link href={`/admin/enquiries/${row.id}`} className="font-medium hover:underline">
          {row.reference}
        </Link>
      ),
    },
    { key: "type", header: "Type", cell: (row) => labelOf(enquiryTypeOptions, row.type) },
    { key: "message", header: "Message", priority: "low", cell: (row) => <span className="line-clamp-2 max-w-md text-ink-soft">{row.message}</span> },
    { key: "received", header: "Received", cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span> },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  ];
  return (
    <div className="space-y-4">
      {canLog && (
        <div className="flex justify-end">
          <AdminButton onClick={() => setDialog((current) => ({ open: true, key: current.key + 1 }))}>
            <PlusIcon size={15} />
            Log enquiry
          </AdminButton>
        </div>
      )}
      <DataTable
        columns={columns}
        rows={data.enquiries}
        getRowKey={(row) => row.id}
        rowHref={(row) => `/admin/enquiries/${row.id}`}
        empty={{ title: "No enquiries", description: "Enquiries linked to this customer or sent from their email appear here." }}
      />
      {canLog && (
        <LogEnquiryDialog
          key={dialog.key}
          open={dialog.open}
          customer={{ id: data.customer.id, name: data.customer.name, phone: data.customer.phone, email: data.customer.email }}
          onClose={() => setDialog((current) => ({ ...current, open: false }))}
          onCreated={() => {
            setDialog((current) => ({ ...current, open: false }));
            onReload();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Internal notes & activity                                           */
/* ------------------------------------------------------------------ */

function NotesTab({ data, onAdded, onRemoved }: { data: Customer360; onAdded: (note: CustomerNote) => void; onRemoved: (noteId: string) => void }) {
  const { admin, can } = useAdmin();
  const canNotes = can("customers:notes");
  const [removing, setRemoving] = useState<CustomerNote | null>(null);
  const remove = useMutation(async (noteId: string) => {
    await adminApi.del(`/customers/${data.customer.id}/notes/${noteId}`);
    return true;
  });

  async function confirmRemove() {
    if (!removing) return;
    const done = await remove.run(removing.id);
    if (!done) return;
    onRemoved(removing.id);
    setRemoving(null);
    toast({ title: "Note removed", tone: "success" });
  }

  return (
    <Panel title="Internal notes" description="Context for the team — preferences, sizes, follow-ups.">
      <div className="space-y-5">
        <InternalNotice />
        {canNotes && (
          <NoteComposer
            onSubmit={async (body) => {
              const note = await adminApi.post<CustomerNote>(`/customers/${data.customer.id}/notes`, { body });
              onAdded(note);
            }}
          />
        )}
        {data.notes.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">No internal notes yet.</p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {data.notes.map((note) => {
              const canDelete = canNotes && (note.authorAdminId === admin.id || admin.roleId === "super_admin");
              return (
                <li key={note.id} className="flex items-start justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap break-words text-[0.875rem] text-ink">{note.body}</p>
                    <p className="mt-1 text-[0.75rem] text-muted">
                      {note.authorName} · {formatDateTime(note.createdAt)}
                    </p>
                  </div>
                  {canDelete && (
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      aria-label="Delete note"
                      onClick={() => {
                        remove.clearError();
                        setRemoving(note);
                      }}
                    >
                      <TrashIcon size={14} />
                    </AdminButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={confirmRemove}
        title="Delete this note?"
        description="The internal note will be permanently removed."
        confirmLabel="Delete note"
        tone="danger"
        pending={remove.pending}
        error={remove.error?.message}
      />
    </Panel>
  );
}

function ActivityTab({ activity }: { activity: Customer360["activity"] }) {
  if (!activity.length) {
    return (
      <Panel>
        <EmptyNote title="No activity yet" description="Orders, sales, invoices, enquiries and notes appear here as they happen." />
      </Panel>
    );
  }
  return (
    <Panel title="Activity" description="The 20 most recent events for this customer.">
      <ol className="ml-1.5 border-l border-line">
        {activity.map((entry, index) => {
          const href = activityHref(entry.href);
          return (
            <li key={`${entry.type}-${entry.at}-${index}`} className="relative pb-5 pl-6 last:pb-0">
              <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-porcelain bg-champagne" aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-2">
                {href ? (
                  <Link href={href} className="text-[0.875rem] text-ink hover:underline">
                    {entry.label}
                  </Link>
                ) : (
                  <span className="text-[0.875rem] text-ink">{entry.label}</span>
                )}
                <StatusBadge status={entry.type} label={humanize(entry.type)} tone="neutral" />
              </div>
              <p className="mt-0.5 text-[0.75rem] text-muted">{formatDateTime(entry.at)}</p>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
