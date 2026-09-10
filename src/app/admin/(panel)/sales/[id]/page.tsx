"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminSession";
import { TotalsList } from "@/components/admin/billing/TotalsList";
import { channelLabel, methodLabel, round2, type SaleDetail, type StockLocation } from "@/components/admin/billing/types";
import { AdminLinkButton, EmptyNote, ErrorState, KeyValue, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, metalLabels, money, percent, purityLabels, weight } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

const th = "whitespace-nowrap px-4 py-2.5 font-medium";
const td = "px-4 py-3";

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const { data: sale, error, reload } = useAdminResource<SaleDetail>(`/sales/${id}`);
  const locations = useAdminResource<StockLocation[]>(sale?.locationId && can("inventory:view") ? "/locations" : null);
  const back = { href: "/admin/sales", label: "Sales" };

  if (error) {
    return (
      <>
        <PageHeader title="Sale" back={back} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }
  if (!sale) {
    return (
      <>
        <PageHeader title="Sale" back={back} />
        <LoadingBlock rows={8} />
      </>
    );
  }

  const locationName = sale.locationId ? (locations.data?.find((location) => location.id === sale.locationId)?.name ?? sale.locationId) : null;

  return (
    <>
      <PageHeader
        title={sale.saleNumber}
        description={`${channelLabel(sale.channel)} sale · ${formatDateTime(sale.createdAt)}`}
        back={back}
        meta={
          <>
            <StatusBadge status={sale.channel} label={channelLabel(sale.channel)} tone={sale.channel === "online" ? "info" : "accent"} />
            <StatusBadge status={sale.paymentStatus} />
          </>
        }
        actions={
          <>
            {sale.orderId && <AdminLinkButton href={`/admin/orders/${sale.orderId}`}>View order</AdminLinkButton>}
            {sale.invoice && (
              <AdminLinkButton href={`/admin/invoices/${sale.invoice.id}`} variant="primary">
                View invoice
              </AdminLinkButton>
            )}
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Items" flush>
            {sale.items.length === 0 ? (
              <EmptyNote title="No items recorded" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[60rem] border-collapse text-left text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                      <th scope="col" className={th}>Item</th>
                      <th scope="col" className={th}>Metal</th>
                      <th scope="col" className={`${th} text-right`}>Qty</th>
                      <th scope="col" className={`${th} text-right`}>Gross wt</th>
                      <th scope="col" className={`${th} text-right`}>Net wt</th>
                      <th scope="col" className={`${th} text-right`}>Unit price</th>
                      <th scope="col" className={`${th} text-right`}>Discount</th>
                      <th scope="col" className={`${th} text-right`}>Taxable</th>
                      <th scope="col" className={`${th} text-right`}>GST</th>
                      <th scope="col" className={`${th} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item) => (
                      <tr key={item.id} className="border-b border-line align-top last:border-0">
                        <td className={td}>
                          <span className="block font-medium text-ink">
                            {item.productId ? (
                              <Link href={`/admin/products/${item.productId}`} className="hover:underline">
                                {item.name}
                              </Link>
                            ) : (
                              item.name
                            )}
                          </span>
                          <span className="block text-muted">
                            {item.sku}
                            {item.size ? ` · Size ${item.size}` : ""}
                          </span>
                        </td>
                        <td className={`${td} whitespace-nowrap`}>
                          {metalLabels[item.metal] ?? item.metal} · {purityLabels[item.purity] ?? item.purity}
                        </td>
                        <td className={`${td} text-right tabular-nums`}>{item.quantity}</td>
                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{weight(item.grossWeight)}</td>
                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{weight(item.netWeight)}</td>
                        <td className={`${td} text-right tabular-nums`}>{money(item.unitPrice)}</td>
                        <td className={`${td} text-right tabular-nums`}>{item.discount ? money(item.discount) : "—"}</td>
                        <td className={`${td} text-right tabular-nums`}>{money(round2(item.lineTotal - item.gstAmount))}</td>
                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                          {money(item.gstAmount)}
                          <span className="block text-[0.75rem] text-muted">{percent(item.gstRate)}</span>
                        </td>
                        <td className={`${td} text-right font-medium tabular-nums`}>{money(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-line px-5 py-4">
              <TotalsList
                className="ml-auto max-w-xs"
                rows={[
                  { label: "Subtotal", value: money(sale.subtotal) },
                  { label: "Discount", value: sale.discount ? `− ${money(sale.discount)}` : money(0) },
                  { label: "Taxable value", value: money(sale.taxableValue) },
                  { label: "GST", value: money(sale.gst) },
                  { label: "Grand total", value: money(sale.grandTotal), strong: true },
                ]}
              />
            </div>
          </Panel>

          {sale.notes && (
            <Panel title="Notes">
              <p className="whitespace-pre-line text-[0.875rem] text-ink">{sale.notes}</p>
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Sale details">
            <KeyValue
              columns={1}
              items={[
                { label: "Sale number", value: sale.saleNumber },
                { label: "Date", value: formatDateTime(sale.createdAt) },
                { label: "Channel", value: channelLabel(sale.channel) },
                { label: "Stock location", value: locationName, hidden: !locationName },
                { label: "Payment status", value: <StatusBadge status={sale.paymentStatus} /> },
                { label: "Payment method", value: methodLabel(sale.paymentMethod) },
                { label: "Recorded by", value: sale.createdByName },
                {
                  label: "Order",
                  value: sale.orderId ? (
                    <Link href={`/admin/orders/${sale.orderId}`} className="text-champagne-deep hover:underline">
                      View order
                    </Link>
                  ) : null,
                  hidden: !sale.orderId,
                },
              ]}
            />
          </Panel>

          <Panel title="Customer">
            <KeyValue
              columns={1}
              items={[
                {
                  label: "Name",
                  value: sale.customerId ? (
                    <Link href={`/admin/customers/${sale.customerId}`} className="text-champagne-deep hover:underline">
                      {sale.customerName}
                    </Link>
                  ) : (
                    <>
                      {sale.customerName} <span className="text-muted">(walk-in)</span>
                    </>
                  ),
                },
                { label: "Mobile", value: sale.customerPhone, hidden: !sale.customerPhone },
                { label: "Email", value: sale.customerEmail, hidden: !sale.customerEmail },
              ]}
            />
          </Panel>

          <Panel title="Invoice">
            {sale.invoice ? (
              <>
                <KeyValue
                  columns={1}
                  items={[
                    { label: "Invoice number", value: sale.invoice.invoiceNumber ?? "Draft" },
                    { label: "Status", value: <StatusBadge status={sale.invoice.status} /> },
                    { label: "Amount paid", value: money(sale.invoice.amountPaid) },
                    { label: "Balance due", value: <span className={sale.invoice.balanceDue > 0 ? "text-danger" : undefined}>{money(sale.invoice.balanceDue)}</span> },
                  ]}
                />
                <AdminLinkButton href={`/admin/invoices/${sale.invoice.id}`} className="mt-4 w-full">
                  Open invoice
                </AdminLinkButton>
              </>
            ) : (
              <p className="text-[0.8125rem] text-muted">No invoice is linked to this sale.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
