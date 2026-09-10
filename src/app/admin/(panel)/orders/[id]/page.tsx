"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { EditIcon, RefreshIcon } from "@/components/admin/icons";
import { CommunicationsPanel, InternalNotesPanel } from "@/components/admin/orders/OrderNotesPanels";
import { OrderStatusPanel } from "@/components/admin/orders/OrderStatusPanel";
import { RefundsPanel } from "@/components/admin/orders/RefundsPanel";
import { ReturnsPanel } from "@/components/admin/orders/ReturnsPanel";
import { AddressView, ShippingAddressDialog, TrackingDialog } from "@/components/admin/orders/ShippingEditDialogs";
import { DISPATCHED_STATUSES, needsStockReview, whatsappUrl, type OrderDetail } from "@/components/admin/orders/types";
import { AdminButton, ErrorState, InlineAlert, KeyValue, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { formatDateTime, humanize, metalLabels, money, purityLabels, weight } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

const BACK = { href: "/admin/orders", label: "Orders" };

function TotalRow({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between gap-4 border-t border-line pt-2.5 text-[0.9375rem] font-medium text-ink" : "flex justify-between gap-4 text-[0.8125rem] text-ink-soft"}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function ItemsPanel({ order }: { order: OrderDetail }) {
  const { totals, coupon } = order;
  return (
    <Panel title="Items" description={`${totals.itemCount} item${totals.itemCount === 1 ? "" : "s"}`} flush>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-[0.8125rem]">
          <thead>
            <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
              <th scope="col" className="px-4 py-2.5 font-medium">Item</th>
              <th scope="col" className="px-4 py-2.5 font-medium">SKU</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Size</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Personalisation</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Weight</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Qty</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Unit price</th>
              <th scope="col" className="px-4 py-2.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const customization = Object.entries(item.customization ?? {}).filter(([, value]) => value);
              return (
                <tr key={item.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {item.image?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image.url} alt={item.image.alt || item.name} className="h-14 w-12 shrink-0 bg-cream object-cover" loading="lazy" />
                      ) : (
                        <span className="h-14 w-12 shrink-0 bg-cream" aria-hidden="true" />
                      )}
                      <span className="min-w-0">
                        {item.productId ? (
                          <Link href={`/admin/products/${item.productId}`} className="block text-ink hover:text-champagne-deep hover:underline">
                            {item.name}
                          </Link>
                        ) : (
                          <span className="block text-ink">{item.name}</span>
                        )}
                        <span className="block text-[0.75rem] text-muted">
                          {[metalLabels[item.metal] ?? humanize(item.metal), purityLabels[item.purity] ?? item.purity].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{item.sku}</td>
                  <td className="px-4 py-3 text-ink-soft">{item.size ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {customization.length === 0 ? (
                      "—"
                    ) : (
                      <dl className="space-y-0.5">
                        {customization.map(([key, value]) => (
                          <div key={key}>
                            <dt className="inline text-muted">{humanize(key)}: </dt>
                            <dd className="inline break-words text-ink">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{weight(item.grossWeight)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{money(item.unitPrice)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-ink">{money(item.lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <dl className="ml-auto max-w-sm space-y-1.5 border-t border-line px-5 py-4">
        <TotalRow label="Subtotal" value={money(totals.subtotal)} />
        {totals.productSavings > 0 && <TotalRow label="Savings" value={`− ${money(totals.productSavings)}`} />}
        {(totals.couponDiscount > 0 || coupon) && <TotalRow label={coupon ? `Coupon (${coupon.code})` : "Coupon"} value={`− ${money(totals.couponDiscount)}`} />}
        <TotalRow label="GST" value={money(totals.gst)} />
        <TotalRow label="Shipping" value={totals.shipping === 0 ? "Free" : money(totals.shipping)} />
        <TotalRow label="Grand total" value={money(totals.grandTotal)} strong />
      </dl>
    </Panel>
  );
}

function TimelinePanel({ order }: { order: OrderDetail }) {
  const events = [...order.timeline].reverse();
  return (
    <Panel title="Timeline" description="Status history as shown to the customer.">
      {events.length === 0 ? (
        <p className="text-[0.8125rem] text-muted">No status events yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-line pl-5">
          {events.map((event, index) => (
            <li key={`${event.at}-${event.status}-${index}`} className="relative">
              <span className={`absolute -left-[1.6rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-porcelain ${index === 0 ? "bg-champagne-deep" : "bg-line-strong"}`} aria-hidden="true" />
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={event.status} />
                <span className="text-[0.75rem] text-muted">{formatDateTime(event.at)}</span>
              </div>
              {event.note && <p className="mt-1 whitespace-pre-wrap break-words text-[0.8125rem] text-ink-soft">{event.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function StockMovementsPanel({ order }: { order: OrderDetail }) {
  const nameFor = (productId: string) => order.items.find((item) => item.productId === productId)?.name ?? "Product";
  return (
    <Panel title="Stock movements" description="Inventory changes caused by this order and its returns." flush>
      {order.stockMovements.length === 0 ? (
        <p className="px-5 py-5 text-[0.8125rem] text-muted">No stock movements recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-[0.8125rem]">
            <thead>
              <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                <th scope="col" className="px-4 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Product</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Change</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Location</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Reference</th>
                <th scope="col" className="px-4 py-2.5 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {order.stockMovements.map((movement) => (
                <tr key={movement.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-ink-soft">{formatDateTime(movement.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/inventory/${movement.productId}`} className="text-ink hover:text-champagne-deep hover:underline">
                      {nameFor(movement.productId)}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={movement.type} tone={movement.quantityDelta < 0 ? "warning" : "success"} />
                  </td>
                  <td className={`px-4 py-2.5 text-right tabular-nums ${movement.quantityDelta < 0 ? "text-danger" : "text-success"}`}>
                    {movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : movement.quantityDelta}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{movement.locationId}</td>
                  <td className="px-4 py-2.5 text-ink-soft">
                    <span className="block">{movement.referenceLabel ?? "—"}</span>
                    {movement.reason && <span className="block text-[0.75rem] text-muted">{movement.reason}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{movement.actorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function CustomerPanel({ order }: { order: OrderDetail }) {
  const { customer } = order;
  const whatsapp = whatsappUrl(customer.phone);
  const linkClass = "inline-flex items-center gap-1.5 text-champagne-deep hover:underline";
  return (
    <Panel
      title="Customer"
      actions={
        order.customerId ? (
          <Link href={`/admin/customers/${order.customerId}`} className="text-[0.75rem] text-champagne-deep hover:underline">
            View profile
          </Link>
        ) : (
          <span className="text-[0.75rem] text-muted">Guest checkout</span>
        )
      }
    >
      <p className="text-[0.9375rem] font-medium text-ink">{customer.name}</p>
      <ul className="mt-2 space-y-1.5 text-[0.8125rem]">
        {customer.email && (
          <li>
            <a href={`mailto:${customer.email}`} className={`${linkClass} break-all`}>
              <MailIcon size={14} />
              {customer.email}
            </a>
          </li>
        )}
        {customer.phone && (
          <li className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <a href={`tel:${customer.phone}`} className={linkClass}>
              <PhoneIcon size={14} />
              {customer.phone}
            </a>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>
                <WhatsAppIcon size={14} />
                WhatsApp
              </a>
            )}
          </li>
        )}
      </ul>
      {order.notes && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Customer&apos;s note</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[0.8125rem] text-ink">{order.notes}</p>
        </div>
      )}
    </Panel>
  );
}

function LinkedDocumentsPanel({ order }: { order: OrderDetail }) {
  return (
    <Panel title="Linked documents" flush>
      <div className="divide-y divide-line">
        <div className="px-5 py-3.5">
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Invoices</p>
          {order.invoices.length === 0 ? (
            <p className="mt-1 text-[0.8125rem] text-muted">No invoices.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {order.invoices.map((invoice) => (
                <li key={invoice.id} className="flex items-center justify-between gap-3 text-[0.8125rem]">
                  <Link href={`/admin/invoices/${invoice.id}`} className="text-champagne-deep hover:underline">
                    {invoice.invoiceNumber ?? "Draft invoice"}
                  </Link>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={invoice.status} />
                    <span className="tabular-nums">{money(invoice.grandTotal)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-5 py-3.5">
          <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Sales</p>
          {order.sales.length === 0 ? (
            <p className="mt-1 text-[0.8125rem] text-muted">No sales recorded.</p>
          ) : (
            <ul className="mt-1.5 space-y-1.5">
              {order.sales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-3 text-[0.8125rem]">
                  <Link href={`/admin/sales/${sale.id}`} className="text-champagne-deep hover:underline">
                    {sale.saleNumber}
                  </Link>
                  <StatusBadge status={sale.paymentStatus} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const { can } = useAdmin();
  const { latest, error, reload, setData, loading } = useAdminResource<OrderDetail>(id ? `/orders/${id}` : null);
  const [editing, setEditing] = useState<"address" | "tracking" | null>(null);
  // Keep showing the order while refreshing; never show a different order's data.
  const order = latest && latest.id === id ? latest : undefined;

  if (error) {
    return (
      <>
        <PageHeader title="Order" back={BACK} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <PageHeader title="Order" back={BACK} />
        <LoadingBlock rows={8} />
      </>
    );
  }

  const canManage = can("orders:manage");
  const addressEditable = canManage && !DISPATCHED_STATUSES.includes(order.status) && order.status !== "cancelled";

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        back={BACK}
        meta={
          <>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.payment.status} label={`Payment ${humanize(order.payment.status).toLowerCase()}`} />
            {needsStockReview({ paymentStatus: order.payment.status, stockCommitted: order.stockCommitted, status: order.status }) && <StatusBadge status="stock_review" label="Stock review" tone="danger" />}
            <span className="text-[0.8125rem] text-muted">Placed {formatDateTime(order.createdAt)}</span>
          </>
        }
        actions={
          <AdminButton size="sm" variant="ghost" onClick={reload} loading={loading}>
            <RefreshIcon size={14} />
            Refresh
          </AdminButton>
        }
      />

      {needsStockReview({ paymentStatus: order.payment.status, stockCommitted: order.stockCommitted, status: order.status }) && (
        <InlineAlert className="mb-6">
          Payment was received but stock wasn&apos;t deducted for this order — an item may have sold out during checkout. Check inventory before fulfilling it.
        </InlineAlert>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-start-3 xl:row-start-1">
          <OrderStatusPanel order={order} onUpdated={setData} />
          <CustomerPanel order={order} />

          <Panel
            title="Addresses"
            actions={
              addressEditable ? (
                <AdminButton size="sm" variant="ghost" onClick={() => setEditing("address")}>
                  <EditIcon size={14} />
                  Edit shipping
                </AdminButton>
              ) : undefined
            }
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <p className="mb-1.5 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Shipping</p>
                <AddressView address={order.shippingAddress} />
              </div>
              <div>
                <p className="mb-1.5 text-[0.6875rem] uppercase tracking-[0.14em] text-muted">Billing</p>
                <AddressView address={order.billingAddress} />
              </div>
            </div>
            {canManage && !addressEditable && <p className="mt-4 text-[0.75rem] text-muted">The shipping address is locked once an order is dispatched or cancelled.</p>}
          </Panel>

          <Panel title="Payment">
            <KeyValue
              items={[
                { label: "Provider", value: humanize(order.paymentProvider || order.payment.provider) },
                { label: "Method", value: order.payment.method ? humanize(order.payment.method) : "—" },
                { label: "Status", value: <StatusBadge status={order.payment.status} /> },
                { label: "Amount", value: money(order.payment.amount) },
                { label: "Provider order id", value: order.payment.providerOrderId ? <span className="break-all font-mono text-[0.75rem]">{order.payment.providerOrderId}</span> : "—" },
                { label: "Provider payment id", value: order.payment.providerPaymentId ? <span className="break-all font-mono text-[0.75rem]">{order.payment.providerPaymentId}</span> : "—" },
                { label: "Paid at", value: order.payment.paidAt ? formatDateTime(order.payment.paidAt) : "—" },
              ]}
            />
          </Panel>

          <Panel
            title="Shipping"
            actions={
              canManage ? (
                <AdminButton size="sm" variant="ghost" onClick={() => setEditing("tracking")}>
                  <EditIcon size={14} />
                  Edit
                </AdminButton>
              ) : undefined
            }
          >
            <KeyValue
              items={[
                { label: "Carrier", value: order.carrier || "—" },
                { label: "Tracking number", value: order.trackingNumber ? <span className="break-all">{order.trackingNumber}</span> : "—" },
                { label: "Fulfilment location", value: order.fulfilmentLocationId ?? "Default" },
                { label: "Stock deducted", value: order.stockCommitted ? "Yes" : "No" },
              ]}
            />
          </Panel>

          <LinkedDocumentsPanel order={order} />
          <InternalNotesPanel order={order} onChange={setData} />
          <CommunicationsPanel order={order} onChange={setData} />
        </div>

        <div className="min-w-0 space-y-6 xl:col-span-2 xl:col-start-1 xl:row-start-1">
          <ItemsPanel order={order} />
          <TimelinePanel order={order} />
          <ReturnsPanel order={order} onUpdated={setData} />
          <RefundsPanel order={order} onUpdated={setData} />
          <StockMovementsPanel order={order} />
        </div>
      </div>

      {editing === "address" && (
        <ShippingAddressDialog
          order={order}
          onClose={() => setEditing(null)}
          onDone={(updated) => {
            setEditing(null);
            setData(updated);
          }}
        />
      )}
      {editing === "tracking" && (
        <TrackingDialog
          order={order}
          onClose={() => setEditing(null)}
          onDone={(updated) => {
            setEditing(null);
            setData(updated);
          }}
        />
      )}
    </>
  );
}
