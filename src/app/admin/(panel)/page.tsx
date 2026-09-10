"use client";

import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminSession";
import { ErrorState, LoadingBlock, PageHeader, Panel, StatCard, StatusBadge } from "@/components/admin/ui";
import { formatDate, formatDateTime, humanize, money, number } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

interface Dashboard {
  financials: { totalSales: number; todaySales: number; monthlySales: number; billedThisMonth: number; expensesThisMonth: number } | null;
  orders: { total: number; pending: number; completed: number } | null;
  customers: { total: number } | null;
  products: { total: number; active: number } | null;
  inventory: { availableUnits: number; lowStock: number; outOfStock: number; valuation?: number; productsMissingCost?: number } | null;
  ordersRequiringAction: { id: string; orderNumber: string; status: string; paymentStatus: string; customerName: string; grandTotal: number; stockCommitted: boolean; createdAt: string }[] | null;
  lowStockList: { id: string; name: string; sku: string; quantity: number; threshold: number }[] | null;
  recentSales: { id: string; saleNumber: string; channel: string; customerName: string; grandTotal: number; createdAt: string }[] | null;
  recentPurchases: { id: string; purchaseNumber: string; vendorName: string; status: string; total: number; purchaseDate: string }[] | null;
  recentEnquiries: { id: string; reference: string; type: string; name: string; status: string; createdAt: string }[] | null;
  recentExpenses: { id: string; expenseNumber: string; category: string; payee: string; totalAmount: number; status: string; expenseDate: string }[] | null;
  recentInvoices: { id: string; invoiceNumber: string | null; status: string; customer: { name: string }; grandTotal: number; createdAt: string }[] | null;
  recentActivity: { id: string; actorName: string; module: string; action: string; entityLabel: string | null; createdAt: string }[] | null;
}

function MiniList<T>({ title, href, rows, render, empty }: { title: string; href: string; rows: T[] | null; render: (row: T) => React.ReactNode; empty: string }) {
  if (!rows) return null;
  return (
    <Panel title={title} actions={<Link href={href} className="text-[0.75rem] text-champagne-deep hover:underline">View all</Link>} flush>
      {rows.length === 0 ? <p className="px-5 py-6 text-[0.8125rem] text-muted">{empty}</p> : <ul className="divide-y divide-line">{rows.map(render)}</ul>}
    </Panel>
  );
}

const rowClass = "flex items-center justify-between gap-3 px-5 py-2.5 text-[0.8125rem] hover:bg-cream/50";

export default function AdminDashboardPage() {
  const { admin } = useAdmin();
  const { data, error, reload } = useAdminResource<Dashboard>("/dashboard");

  return (
    <>
      <PageHeader title={`Welcome, ${admin.name.split(" ")[0]}`} description="Live figures from recorded orders, sales, stock and expenses." />
      {error && <ErrorState error={error} onRetry={reload} />}
      {!data && !error && <LoadingBlock rows={6} />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.financials && (
              <>
                <StatCard label="Total sales" value={money(data.financials.totalSales)} />
                <StatCard label="Today's sales" value={money(data.financials.todaySales)} />
                <StatCard label="This month" value={money(data.financials.monthlySales)} />
                <StatCard label="Billed this month" value={money(data.financials.billedThisMonth)} hint={`Expenses: ${money(data.financials.expensesThisMonth)}`} />
              </>
            )}
            {data.orders && (
              <>
                <StatCard label="Orders" value={number(data.orders.total)} href="/admin/orders" />
                <StatCard label="Pending orders" value={number(data.orders.pending)} href="/admin/orders?status=confirmed,processing,packed,shipped" tone={data.orders.pending ? "warning" : "neutral"} />
                <StatCard label="Completed orders" value={number(data.orders.completed)} />
              </>
            )}
            {data.customers && <StatCard label="Customers" value={number(data.customers.total)} href="/admin/customers" />}
            {data.products && <StatCard label="Products" value={number(data.products.total)} hint={`${data.products.active} active`} href="/admin/products" />}
            {data.inventory && (
              <>
                <StatCard label="Available stock" value={`${number(data.inventory.availableUnits)} units`} href="/admin/inventory" />
                <StatCard label="Low stock" value={number(data.inventory.lowStock)} tone={data.inventory.lowStock ? "warning" : "neutral"} href="/admin/inventory/low-stock" hint={`${data.inventory.outOfStock} out of stock`} />
                {data.inventory.valuation !== undefined && (
                  <StatCard
                    label="Inventory value"
                    value={money(data.inventory.valuation)}
                    hint={data.inventory.productsMissingCost ? `${data.inventory.productsMissingCost} stocked products have no purchase price and are excluded` : "At purchase price"}
                  />
                )}
              </>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <MiniList
              title="Orders requiring action"
              href="/admin/orders"
              rows={data.ordersRequiringAction}
              empty="No orders need action."
              render={(order) => (
                <li key={order.id}>
                  <Link href={`/admin/orders/${order.id}`} className={rowClass}>
                    <span className="min-w-0">
                      <span className="block font-medium">{order.orderNumber}</span>
                      <span className="block truncate text-muted">{order.customerName} · {formatDate(order.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {!order.stockCommitted && order.paymentStatus === "paid" && <StatusBadge status="stock" label="Stock review" tone="danger" />}
                      <StatusBadge status={order.status} />
                      <span className="tabular-nums">{money(order.grandTotal)}</span>
                    </span>
                  </Link>
                </li>
              )}
            />
            <MiniList
              title="Low stock"
              href="/admin/inventory/low-stock"
              rows={data.lowStockList}
              empty="Nothing is running low."
              render={(item) => (
                <li key={item.id}>
                  <Link href={`/admin/inventory/${item.id}`} className={rowClass}>
                    <span className="min-w-0">
                      <span className="block truncate">{item.name}</span>
                      <span className="block text-muted">{item.sku}</span>
                    </span>
                    <StatusBadge status={item.quantity <= 0 ? "out_of_stock" : "low_stock"} label={`${item.quantity} left`} />
                  </Link>
                </li>
              )}
            />
            <MiniList
              title="Recent sales"
              href="/admin/sales"
              rows={data.recentSales}
              empty="No sales yet."
              render={(sale) => (
                <li key={sale.id}>
                  <Link href={`/admin/sales/${sale.id}`} className={rowClass}>
                    <span className="min-w-0">
                      <span className="block font-medium">{sale.saleNumber}</span>
                      <span className="block truncate text-muted">{sale.customerName} · {humanize(sale.channel)}</span>
                    </span>
                    <span className="tabular-nums">{money(sale.grandTotal)}</span>
                  </Link>
                </li>
              )}
            />
            <MiniList
              title="Recent invoices"
              href="/admin/invoices"
              rows={data.recentInvoices}
              empty="No invoices yet."
              render={(invoice) => (
                <li key={invoice.id}>
                  <Link href={`/admin/invoices/${invoice.id}`} className={rowClass}>
                    <span className="min-w-0">
                      <span className="block font-medium">{invoice.invoiceNumber ?? "Draft"}</span>
                      <span className="block truncate text-muted">{invoice.customer.name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={invoice.status} />
                      <span className="tabular-nums">{money(invoice.grandTotal)}</span>
                    </span>
                  </Link>
                </li>
              )}
            />
            <MiniList
              title="Recent purchases"
              href="/admin/purchases"
              rows={data.recentPurchases}
              empty="No purchases yet."
              render={(purchase) => (
                <li key={purchase.id}>
                  <Link href={`/admin/purchases/${purchase.id}`} className={rowClass}>
                    <span className="min-w-0">
                      <span className="block font-medium">{purchase.purchaseNumber}</span>
                      <span className="block truncate text-muted">{purchase.vendorName} · {formatDate(purchase.purchaseDate)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={purchase.status} />
                      <span className="tabular-nums">{money(purchase.total)}</span>
                    </span>
                  </Link>
                </li>
              )}
            />
            <MiniList
              title="Recent enquiries"
              href="/admin/enquiries"
              rows={data.recentEnquiries}
              empty="No enquiries yet."
              render={(enquiry) => (
                <li key={enquiry.id}>
                  <Link href={`/admin/enquiries/${enquiry.id}`} className={rowClass}>
                    <span className="min-w-0">
                      <span className="block font-medium">{enquiry.reference}</span>
                      <span className="block truncate text-muted">{enquiry.name} · {humanize(enquiry.type)}</span>
                    </span>
                    <StatusBadge status={enquiry.status} />
                  </Link>
                </li>
              )}
            />
            <MiniList
              title="Recent expenses"
              href="/admin/expenses"
              rows={data.recentExpenses}
              empty="No expenses yet."
              render={(expense) => (
                <li key={expense.id}>
                  <Link href={`/admin/expenses/${expense.id}`} className={rowClass}>
                    <span className="min-w-0">
                      <span className="block font-medium">{expense.expenseNumber}</span>
                      <span className="block truncate text-muted">{expense.payee} · {expense.category}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={expense.status} />
                      <span className="tabular-nums">{money(expense.totalAmount)}</span>
                    </span>
                  </Link>
                </li>
              )}
            />
            <MiniList
              title="Recent activity"
              href="/admin/settings/audit-log"
              rows={data.recentActivity}
              empty="No activity recorded yet."
              render={(entry) => (
                <li key={entry.id} className={rowClass}>
                  <span className="min-w-0">
                    <span className="block truncate">
                      <span className="font-medium">{entry.actorName}</span> · {humanize(entry.action)}
                    </span>
                    <span className="block truncate text-muted">{entry.entityLabel ?? humanize(entry.module)}</span>
                  </span>
                  <span className="shrink-0 text-[0.75rem] text-muted">{formatDateTime(entry.createdAt)}</span>
                </li>
              )}
            />
          </div>
        </div>
      )}
    </>
  );
}
