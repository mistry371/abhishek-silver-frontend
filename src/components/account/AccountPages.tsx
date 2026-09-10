"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { AddressFields, emptyAddress, formatAddress, validateAddress, type AddressErrors } from "@/components/forms/AddressFields";
import { PasswordField } from "@/components/forms/PasswordField";
import {
  AlertIcon,
  ArrowLeftIcon,
  HeartIcon,
  InboxIcon,
  InvoiceIcon,
  MapPinIcon,
  PackageIcon,
  PlusIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { OrderStatusBadge, OrderTimeline, PaymentStatusLabel } from "@/components/orders/OrderStatus";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { CheckboxField, FormMessage, TextField } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { isApiError, toUserMessage } from "@/lib/api/errors";
import { getOrder, getOrders } from "@/lib/api/services/commerce";
import { changePassword, deleteAddress, getAddresses, getEnquiries, saveAddress, updateCustomerProfile } from "@/lib/api/services/customer";
import { metalPurityLabel } from "@/lib/catalog/filters";
import { cn, formatDate, formatDateTime, formatINR } from "@/lib/utils";
import { isValidIndianMobile, passwordIssues } from "@/lib/validation";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { getAuthToken, useAuthStore, useCustomer } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import type { Address, AddressInput, Enquiry, Order } from "@/types/customer";
import { useAccountResource, type ResourceState } from "./useAccountResource";

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

function PageTitle({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="type-h2 text-ink">{title}</h1>
        {description && <p className="mt-2 type-body text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ResourceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState compact icon={AlertIcon} title="We couldn't load this section" description={message} className="border border-line bg-porcelain px-6">
      <Button variant="outline" onClick={onRetry}>
        Try Again
      </Button>
    </EmptyState>
  );
}

function ListSkeleton({ rows = 3, height = "h-32" }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={cn("w-full", height)} />
      ))}
    </div>
  );
}

const readyData = <T,>(state: ResourceState<T>) => (state.status === "ready" ? state.data : undefined);

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export function AccountOverview() {
  const customer = useCustomer();
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const orders = useAccountResource(getOrders);
  const addresses = useAccountResource(getAddresses);
  const enquiries = useAccountResource(getEnquiries);
  const orderList = readyData(orders.state);
  const addressList = readyData(addresses.state);
  const enquiryList = readyData(enquiries.state);
  const latest = orderList?.[0];
  const defaultAddress = addressList?.find((a) => a.isDefaultShipping) ?? addressList?.[0];

  const previousPurchases = (orderList ?? [])
    .filter((order) => order.status === "delivered" || order.status === "completed")
    .flatMap((order) => order.items)
    .filter((item, index, all) => all.findIndex((other) => other.productId === item.productId) === index)
    .slice(0, 4);

  const stats = [
    { label: "Orders", value: orderList?.length, href: "/account/orders", Icon: PackageIcon },
    { label: "Wishlist", value: wishlistCount, href: "/account/wishlist", Icon: HeartIcon },
    { label: "Addresses", value: addressList?.length, href: "/account/addresses", Icon: MapPinIcon },
    { label: "Enquiries", value: enquiryList?.length, href: "/account/enquiries", Icon: InboxIcon },
  ];

  return (
    <div>
      <PageTitle title="Account overview" description="Everything in one place — orders, saved pieces and details." />
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, href, Icon }) => (
          <li key={label}>
            <Link href={href} className="group flex h-full flex-col justify-between gap-6 border border-line bg-porcelain p-5 transition-colors hover:border-ink">
              <Icon size={22} className="text-champagne-deep" />
              <span>
                <span className="block font-serif text-3xl text-ink tabular-nums">{value ?? "—"}</span>
                <span className="mt-1 block type-caption tracking-[0.16em] text-muted group-hover:text-ink">{label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="latest-order-title" className="border border-line bg-porcelain p-6 md:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 id="latest-order-title" className="type-h3 text-ink">
              Latest order
            </h2>
            {latest && (
              <Link href="/account/orders" className="type-caption tracking-[0.14em] link-underline-static">
                All orders
              </Link>
            )}
          </div>
          {orders.state.status === "loading" && <Skeleton className="mt-6 h-40 w-full" />}
          {orders.state.status === "error" && <p className="mt-6 type-body-sm text-danger">{orders.state.message}</p>}
          {orders.state.status === "ready" && !latest && (
            <div className="mt-6">
              <p className="type-body text-muted">You haven&apos;t placed an order yet.</p>
              <ButtonLink href="/shop" variant="outline" size="sm" className="mt-5">
                Start Shopping
              </ButtonLink>
            </div>
          )}
          {latest && (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="type-body-sm text-muted">
                  <span className="font-medium text-ink">{latest.orderNumber}</span> · {formatDate(latest.createdAt)} · {formatINR(latest.totals.grandTotal)}
                </p>
                <OrderStatusBadge status={latest.status} />
              </div>
              <OrderTimeline order={latest} className="mt-8" />
              <ButtonLink href={`/account/orders/${latest.id}`} size="sm" className="mt-8">
                Track Order
              </ButtonLink>
            </div>
          )}
        </section>

        <section aria-labelledby="details-title" className="border border-line bg-porcelain p-6 md:p-8">
          <h2 id="details-title" className="type-h3 text-ink">
            Your details
          </h2>
          <dl className="mt-6 space-y-4 type-body-sm">
            <div>
              <dt className="type-caption tracking-[0.16em] text-muted">Name</dt>
              <dd className="mt-1 text-ink">
                {customer?.firstName} {customer?.lastName}
              </dd>
            </div>
            <div>
              <dt className="type-caption tracking-[0.16em] text-muted">Contact</dt>
              <dd className="mt-1 text-ink">
                {customer?.email}
                <br />
                {customer?.phone}
              </dd>
            </div>
            <div>
              <dt className="type-caption tracking-[0.16em] text-muted">Default address</dt>
              <dd className="mt-1 text-ink">
                {addresses.state.status === "loading" ? <Skeleton className="h-10 w-full" /> : defaultAddress ? formatAddress(defaultAddress) : "No saved address yet"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/account/profile" className="type-caption tracking-[0.14em] link-underline-static">
              Edit profile
            </Link>
            <Link href="/account/addresses" className="type-caption tracking-[0.14em] link-underline-static">
              Manage addresses
            </Link>
          </div>
        </section>
      </div>

      {previousPurchases.length > 0 && (
        <section aria-labelledby="previous-title" className="mt-10">
          <h2 id="previous-title" className="type-h3 text-ink">
            Previous purchases
          </h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {previousPurchases.map((item) => (
              <li key={item.productId}>
                <Link href={`/product/${item.slug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                    <Image src={item.image.url} alt="" fill sizes="(min-width: 768px) 18vw, 45vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                  </div>
                  <p className="mt-3 font-serif text-[1.05rem] leading-snug text-ink">{item.name}</p>
                  <span className="mt-1 inline-block type-caption tracking-[0.14em] text-ink-soft link-underline-static">Buy again</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

export function AccountOrders() {
  const { state, retry } = useAccountResource(getOrders);
  return (
    <div>
      <PageTitle title="My orders" description="Track deliveries, view invoices and revisit previous purchases." />
      {state.status === "loading" && <ListSkeleton rows={3} height="h-44" />}
      {state.status === "error" && <ResourceError message={state.message} onRetry={retry} />}
      {state.status === "ready" && state.data.length === 0 && (
        <EmptyState icon={PackageIcon} title="No orders yet" description="When you place an order, you'll be able to track it here." className="border border-line bg-porcelain px-6">
          <ButtonLink href="/shop">Explore the Collection</ButtonLink>
        </EmptyState>
      )}
      {state.status === "ready" && state.data.length > 0 && (
        <ul className="space-y-5">
          {state.data.map((order) => (
            <li key={order.id} className="border border-line bg-porcelain">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
                <dl className="flex flex-wrap gap-x-8 gap-y-2 type-body-sm">
                  <div>
                    <dt className="type-caption tracking-[0.14em] text-muted">Order</dt>
                    <dd className="mt-0.5 font-medium text-ink">{order.orderNumber}</dd>
                  </div>
                  <div>
                    <dt className="type-caption tracking-[0.14em] text-muted">Placed</dt>
                    <dd className="mt-0.5 text-ink">{formatDate(order.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="type-caption tracking-[0.14em] text-muted">Total</dt>
                    <dd className="mt-0.5 text-ink tabular-nums">{formatINR(order.totals.grandTotal)}</dd>
                  </div>
                </dl>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="flex flex-wrap items-center gap-5 px-5 py-5 md:px-6">
                <ul className="flex -space-x-3" aria-hidden="true">
                  {order.items.slice(0, 4).map((item) => (
                    <li key={item.id} className="relative h-16 w-14 overflow-hidden border-2 border-porcelain bg-cream">
                      <Image src={item.image.url} alt="" fill sizes="56px" className="object-cover" />
                    </li>
                  ))}
                </ul>
                <p className="min-w-0 flex-1 truncate type-body-sm text-muted">{order.items.map((item) => item.name).join(", ")}</p>
                <ButtonLink href={`/account/orders/${order.id}`} size="sm" variant="outline">
                  View &amp; Track
                </ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AccountOrderDetail({ orderId }: { orderId: string }) {
  const { state, retry } = useAccountResource((token) => getOrder(orderId, token), orderId);

  if (state.status === "loading") return <ListSkeleton rows={3} height="h-48" />;
  if (state.status === "error") {
    if (state.code === "not_found") {
      return (
        <EmptyState icon={PackageIcon} title="Order not found" description="This order isn't linked to your account." className="border border-line bg-porcelain px-6" headingLevel={1}>
          <ButtonLink href="/account/orders">Back to Orders</ButtonLink>
        </EmptyState>
      );
    }
    return <ResourceError message={state.message} onRetry={retry} />;
  }

  const order: Order = state.data;
  return (
    <div>
      <Link href="/account/orders" className="inline-flex items-center gap-2 type-caption tracking-[0.14em] text-ink-soft hover:text-ink">
        <ArrowLeftIcon size={15} />
        All orders
      </Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="type-h2 text-ink">Order {order.orderNumber}</h1>
          <p className="mt-2 type-body-sm text-muted">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <section aria-labelledby="tracking-title" className="mt-8 border border-line bg-porcelain p-6 md:p-8">
        <h2 id="tracking-title" className="mb-8 type-h3 text-ink">
          Tracking
        </h2>
        <OrderTimeline order={order} />
        {order.trackingNumber && (
          <p className="mt-8 border-t border-line pt-6 type-body-sm text-ink-soft">
            Shipped with <span className="text-ink">{order.carrier}</span> · Tracking number <span className="font-medium text-ink">{order.trackingNumber}</span>
          </p>
        )}
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
        <section aria-labelledby="order-items-title" className="border border-line bg-porcelain p-6 md:p-8">
          <h2 id="order-items-title" className="type-h3 text-ink">
            Items
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-5">
                <Link href={`/product/${item.slug}`} className="relative h-24 w-20 shrink-0 overflow-hidden bg-cream">
                  <Image src={item.image.url} alt={item.name} fill sizes="80px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">{metalPurityLabel(item.metal, item.purity)}</p>
                  <Link href={`/product/${item.slug}`} className="mt-1 block font-serif text-lg leading-snug text-ink hover:text-champagne-deep">
                    {item.name}
                  </Link>
                  <p className="type-body-sm text-muted">
                    SKU {item.sku}
                    {item.size ? ` · Size ${item.size}` : ""} · Qty {item.quantity}
                  </p>
                  {item.customization &&
                    Object.entries(item.customization).map(([key, value]) => (
                      <p key={key} className="type-body-sm text-muted">
                        {key}: “{value}”
                      </p>
                    ))}
                </div>
                <p className="type-body-sm text-ink tabular-nums">{formatINR(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <section aria-labelledby="order-summary-title" className="border border-line bg-porcelain p-6">
            <h2 id="order-summary-title" className="type-h3 text-ink">
              Summary
            </h2>
            <OrderTotals className="mt-5" totals={order.totals} coupon={order.coupon} />
          </section>
          <section aria-labelledby="order-info-title" className="border border-line bg-porcelain p-6">
            <h2 id="order-info-title" className="sr-only">
              Delivery and payment
            </h2>
            <dl className="space-y-5 type-body-sm">
              <div>
                <dt className="type-caption tracking-[0.16em] text-muted">Delivery address</dt>
                <dd className="mt-1 text-ink">
                  {order.shippingAddress.fullName}
                  <br />
                  {formatAddress(order.shippingAddress)}
                </dd>
              </div>
              <div>
                <dt className="type-caption tracking-[0.16em] text-muted">Billing address</dt>
                <dd className="mt-1 text-ink">{formatAddress(order.billingAddress)}</dd>
              </div>
              <div>
                <dt className="type-caption tracking-[0.16em] text-muted">Payment</dt>
                <dd className="mt-1">
                  <PaymentStatusLabel status={order.payment.status} />
                  {order.payment.method && <span className="block text-muted">{order.payment.method}</span>}
                </dd>
              </div>
              <div>
                <dt className="type-caption tracking-[0.16em] text-muted">Invoice</dt>
                <dd className="mt-1">
                  {order.invoiceUrl ? (
                    <a href={order.invoiceUrl} className="inline-flex items-center gap-2 text-ink underline underline-offset-4">
                      <InvoiceIcon size={16} />
                      Download invoice
                    </a>
                  ) : (
                    <span className="text-muted">Available once the order has been processed.</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>
          <ButtonLink href={whatsappUrl(whatsappMessages.order(order.orderNumber))} external variant="whatsapp" fullWidth>
            <WhatsAppIcon size={18} />
            Get Help With This Order
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Addresses                                                           */
/* ------------------------------------------------------------------ */

type EditableAddress = AddressInput & { id?: string };

export function AccountAddresses() {
  const { state, retry, setData } = useAccountResource(getAddresses);
  const ids = useId();
  const [editing, setEditing] = useState<EditableAddress | null>(null);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);

  function toEditable(address: Address): EditableAddress {
    return { ...emptyAddress, ...address };
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const nextErrors = validateAddress(editing);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const token = getAuthToken();
    if (!token) return;
    setSaving(true);
    setSaveError("");
    try {
      setData(await saveAddress(token, editing));
      toast({ title: editing.id ? "Address updated" : "Address added", tone: "success" });
      setEditing(null);
    } catch (error) {
      setSaveError(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function makeDefault(address: Address) {
    const token = getAuthToken();
    if (!token) return;
    try {
      setData(await saveAddress(token, { ...toEditable(address), isDefaultShipping: true }));
      toast({ title: "Default address updated" });
    } catch (error) {
      toast({ title: "Couldn't update address", description: toUserMessage(error), tone: "error" });
    }
  }

  async function onDelete() {
    const token = getAuthToken();
    if (!token || !confirmDelete) return;
    setDeleting(true);
    try {
      setData(await deleteAddress(token, confirmDelete.id));
      toast({ title: "Address removed" });
      setConfirmDelete(null);
    } catch (error) {
      toast({ title: "Couldn't remove address", description: toUserMessage(error), tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageTitle
        title="Addresses"
        description="Saved delivery addresses make checkout quicker."
        action={
          <Button
            size="sm"
            onClick={() => {
              setErrors({});
              setSaveError("");
              setEditing({ ...emptyAddress });
            }}
          >
            <PlusIcon size={16} />
            Add Address
          </Button>
        }
      />
      {state.status === "loading" && <ListSkeleton rows={2} />}
      {state.status === "error" && <ResourceError message={state.message} onRetry={retry} />}
      {state.status === "ready" && state.data.length === 0 && (
        <EmptyState icon={MapPinIcon} title="No saved addresses" description="Add an address to speed up checkout." className="border border-line bg-porcelain px-6">
          <Button onClick={() => setEditing({ ...emptyAddress })}>Add Address</Button>
        </EmptyState>
      )}
      {state.status === "ready" && state.data.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2">
          {state.data.map((address) => (
            <li key={address.id} className={cn("flex flex-col border bg-porcelain p-6", address.isDefaultShipping ? "border-ink" : "border-line")}>
              <div className="flex items-start justify-between gap-3">
                <p className="type-caption tracking-[0.16em] text-ink">{address.label || "Address"}</p>
                {address.isDefaultShipping && <span className="bg-ink px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.14em] text-ivory">Default</span>}
              </div>
              <p className="mt-4 type-body text-ink">{address.fullName}</p>
              <p className="mt-1 type-body-sm text-muted">{formatAddress(address)}</p>
              <p className="mt-1 type-body-sm text-muted">{address.phone}</p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-line pt-4">
                <button type="button" onClick={() => { setErrors({}); setSaveError(""); setEditing(toEditable(address)); }} className="type-caption tracking-[0.14em] text-ink link-underline-static">
                  Edit
                </button>
                {!address.isDefaultShipping && (
                  <button type="button" onClick={() => makeDefault(address)} className="type-caption tracking-[0.14em] text-ink-soft hover:text-ink">
                    Set as default
                  </button>
                )}
                <button type="button" onClick={() => setConfirmDelete(address)} className="type-caption tracking-[0.14em] text-danger hover:underline">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onClose={() => !saving && setEditing(null)} labelledBy={`${ids}-address-title`} className="max-w-2xl">
        <DialogHeader title={editing?.id ? "Edit address" : "Add a new address"} titleId={`${ids}-address-title`} onClose={() => !saving && setEditing(null)} />
        {editing && (
          <form onSubmit={onSave} noValidate className="space-y-6 px-6 py-6 md:px-8 md:py-8">
            {saveError && <FormMessage tone="error">{saveError}</FormMessage>}
            <TextField label="Address label" optional placeholder="Home, Work…" value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
            <AddressFields idPrefix={`${ids}-address`} value={editing} onChange={(value) => setEditing({ ...editing, ...value })} errors={errors} />
            <CheckboxField label="Use as my default delivery address" checked={Boolean(editing.isDefaultShipping)} onChange={(e) => setEditing({ ...editing, isDefaultShipping: e.target.checked })} />
            <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-6">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} loadingText="Saving">
                Save Address
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <Dialog open={confirmDelete !== null} onClose={() => !deleting && setConfirmDelete(null)} labelledBy={`${ids}-delete-title`}>
        <DialogHeader title="Remove this address?" titleId={`${ids}-delete-title`} onClose={() => !deleting && setConfirmDelete(null)} />
        <div className="px-6 py-6 md:px-8">
          <p className="type-body text-muted">{confirmDelete ? formatAddress(confirmDelete) : ""}</p>
          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleting}>
              Keep
            </Button>
            <Button onClick={onDelete} loading={deleting} loadingText="Removing">
              Remove Address
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Enquiries                                                           */
/* ------------------------------------------------------------------ */

const enquiryTypeLabels: Record<Enquiry["type"], string> = {
  product: "Product enquiry",
  custom_jewellery: "Custom jewellery",
  contact: "General enquiry",
};

const enquiryStatusLabels: Record<Enquiry["status"], string> = {
  new: "Received",
  in_progress: "In progress",
  responded: "Responded",
  closed: "Closed",
};

export function AccountEnquiries() {
  const { state, retry } = useAccountResource(getEnquiries);
  return (
    <div>
      <PageTitle title="Enquiries" description="Your product, custom jewellery and general enquiries." />
      {state.status === "loading" && <ListSkeleton rows={2} />}
      {state.status === "error" && <ResourceError message={state.message} onRetry={retry} />}
      {state.status === "ready" && state.data.length === 0 && (
        <EmptyState icon={InboxIcon} title="No enquiries yet" description="Ask about a piece or start a custom design — your enquiries will appear here." className="border border-line bg-porcelain px-6">
          <ButtonLink href="/custom-jewellery">Start a Custom Design</ButtonLink>
          <ButtonLink href="/contact" variant="outline">
            Contact Us
          </ButtonLink>
        </EmptyState>
      )}
      {state.status === "ready" && state.data.length > 0 && (
        <ul className="space-y-4">
          {state.data.map((enquiry) => (
            <li key={enquiry.id} className="border border-line bg-porcelain p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="type-caption tracking-[0.16em] text-ink">
                  {enquiryTypeLabels[enquiry.type]} · <span className="text-muted">{enquiry.reference}</span>
                </p>
                <span className="border border-champagne/50 px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em] text-champagne-deep">
                  {enquiryStatusLabels[enquiry.status]}
                </span>
              </div>
              {enquiry.product && <p className="mt-3 font-serif text-lg text-ink">{enquiry.product.name}</p>}
              <p className="mt-2 type-body text-ink-soft">{enquiry.message}</p>
              <p className="mt-4 type-body-sm text-muted">
                {formatDateTime(enquiry.createdAt)}
                {enquiry.jewelleryType && ` · ${enquiry.jewelleryType}`}
                {enquiry.budgetRange && ` · ${enquiry.budgetRange}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export function AccountProfile() {
  const customer = useCustomer();
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  const [values, setValues] = useState({
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    phone: customer?.phone ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.firstName.trim()) next.firstName = "Enter your first name.";
    if (!values.lastName.trim()) next.lastName = "Enter your last name.";
    if (!isValidIndianMobile(values.phone)) next.phone = "Enter a valid 10-digit mobile number.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const token = getAuthToken();
    if (!token) return;
    setSaving(true);
    setServerError("");
    try {
      const updated = await updateCustomerProfile(token, { firstName: values.firstName.trim(), lastName: values.lastName.trim(), phone: values.phone.trim() });
      updateCustomer(updated);
      toast({ title: "Profile updated", tone: "success" });
    } catch (error) {
      setServerError(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageTitle title="Profile" description="Keep your contact details up to date for order updates." />
      <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-5 border border-line bg-porcelain p-6 md:p-8">
        {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="First name" required autoComplete="given-name" value={values.firstName} onChange={(e) => setValues({ ...values, firstName: e.target.value })} error={errors.firstName} />
          <TextField label="Last name" required autoComplete="family-name" value={values.lastName} onChange={(e) => setValues({ ...values, lastName: e.target.value })} error={errors.lastName} />
        </div>
        <TextField label="Email" value={customer?.email ?? ""} readOnly disabled hint="To change your email address, please contact our team." />
        <TextField label="Mobile number" type="tel" inputMode="tel" required autoComplete="tel" value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} error={errors.phone} />
        <Button type="submit" loading={saving} loadingText="Saving">
          Save Changes
        </Button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function AccountSettings() {
  const customer = useCustomer();
  const updateCustomer = useAuthStore((s) => s.updateCustomer);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [passwordServerError, setPasswordServerError] = useState("");
  const [optIn, setOptIn] = useState(Boolean(customer?.marketingOptIn));
  const [prefsSaving, setPrefsSaving] = useState(false);

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!passwords.current) next.current = "Enter your current password.";
    const issues = passwordIssues(passwords.next);
    if (issues.length) next.next = `Your new password needs ${issues.join(", ")}.`;
    if (passwords.confirm !== passwords.next) next.confirm = "Passwords don't match.";
    setPasswordErrors(next);
    if (Object.keys(next).length) return;
    const token = getAuthToken();
    if (!token) return;
    setPasswordStatus("saving");
    setPasswordServerError("");
    try {
      await changePassword(token, passwords.current, passwords.next);
      setPasswordStatus("saved");
      setPasswords({ current: "", next: "", confirm: "" });
    } catch (error) {
      setPasswordStatus("idle");
      if (isApiError(error) && error.fieldErrors?.currentPassword) setPasswordErrors({ current: error.fieldErrors.currentPassword });
      else setPasswordServerError(toUserMessage(error));
    }
  }

  async function savePreferences() {
    const token = getAuthToken();
    if (!token) return;
    setPrefsSaving(true);
    try {
      updateCustomer(await updateCustomerProfile(token, { marketingOptIn: optIn }));
      toast({ title: "Preferences saved", tone: "success" });
    } catch (error) {
      toast({ title: "Couldn't save preferences", description: toUserMessage(error), tone: "error" });
    } finally {
      setPrefsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle title="Account settings" description="Security and communication preferences." />

      <section aria-labelledby="password-title" className="max-w-2xl border border-line bg-porcelain p-6 md:p-8">
        <h2 id="password-title" className="type-h3 text-ink">
          Change password
        </h2>
        <form onSubmit={onChangePassword} noValidate className="mt-6 space-y-5">
          {passwordServerError && <FormMessage tone="error">{passwordServerError}</FormMessage>}
          {passwordStatus === "saved" && <FormMessage tone="success">Your password has been updated.</FormMessage>}
          <PasswordField label="Current password" required autoComplete="current-password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} error={passwordErrors.current} />
          <PasswordField label="New password" required autoComplete="new-password" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} error={passwordErrors.next} hint="At least 8 characters, including a letter and a number." />
          <PasswordField label="Confirm new password" required autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} error={passwordErrors.confirm} />
          <Button type="submit" loading={passwordStatus === "saving"} loadingText="Updating">
            Update Password
          </Button>
        </form>
      </section>

      <section aria-labelledby="preferences-title" className="max-w-2xl border border-line bg-porcelain p-6 md:p-8">
        <h2 id="preferences-title" className="type-h3 text-ink">
          Communication preferences
        </h2>
        <CheckboxField className="mt-6" label="Email me about new collections, festive edits and offers" description="Order and account updates are always sent." checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
        <Button variant="outline" className="mt-6" onClick={savePreferences} loading={prefsSaving} disabled={optIn === Boolean(customer?.marketingOptIn)}>
          Save Preferences
        </Button>
      </section>

      <section aria-labelledby="close-title" className="max-w-2xl border border-line p-6 md:p-8">
        <h2 id="close-title" className="type-h3 text-ink">
          Close your account
        </h2>
        <p className="mt-3 type-body text-muted">To close your account or request a copy of your data, please contact our team and we&apos;ll assist you.</p>
        <ButtonLink href="/contact" variant="link" className="mt-5">
          Contact Us
        </ButtonLink>
      </section>
    </div>
  );
}
