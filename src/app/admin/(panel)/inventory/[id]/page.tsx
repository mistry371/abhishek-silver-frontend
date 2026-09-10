"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminSession";
import { movementColumns } from "@/components/admin/inventory/movements";
import { metalPurity } from "@/components/admin/inventory/options";
import { StockTransactionPanel } from "@/components/admin/inventory/StockTransactionPanel";
import type { InventoryDetail } from "@/components/admin/inventory/types";
import { AdminLinkButton, DataTable, ErrorState, InlineAlert, KeyValue, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { money, number, weight } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

const back = { href: "/admin/inventory", label: "Inventory" };

export default function InventoryProductPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAdmin();
  const resource = useAdminResource<InventoryDetail>(`/inventory/${id}`);
  // Keep the page (and any half-filled form) mounted while refreshing.
  const detail = resource.latest && resource.latest.product.id === id ? resource.latest : undefined;

  if (!detail) {
    return (
      <>
        <PageHeader title="Product stock" back={back} />
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.reload} /> : <LoadingBlock rows={6} />}
      </>
    );
  }

  const { product } = detail;
  const locationName = (locationId: string) => detail.levels.find((level) => level.locationId === locationId)?.name ?? locationId;

  return (
    <>
      <PageHeader
        title={product.name}
        back={back}
        meta={
          <>
            <span className="text-[0.8125rem] text-muted">{product.sku}</span>
            <StatusBadge status={detail.stockStatus} />
            {product.status !== "active" && <StatusBadge status={product.status} label={`Product ${product.status}`} />}
          </>
        }
        actions={
          <>
            <AdminLinkButton href={`/admin/inventory/stock-movements?productId=${product.id}`}>All movements</AdminLinkButton>
            {can("products:view") && <AdminLinkButton href={`/admin/products/${product.id}`}>View product</AdminLinkButton>}
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Stock by location" description={`Low-stock alert at ${product.lowStockThreshold} units or fewer.`} flush>
            <div className="overflow-x-auto">
              <table className={`w-full text-left text-[0.8125rem] ${resource.loading ? "opacity-60" : ""}`}>
                <thead>
                  <tr className="border-b border-line bg-cream/60 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
                    <th scope="col" className="px-5 py-2.5 font-medium">
                      Location
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right font-medium">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {detail.levels.map((level) => (
                    <tr key={level.locationId} className="border-b border-line">
                      <td className="px-5 py-2.5 text-ink">
                        {level.name}
                        {!level.active && <StatusBadge status="inactive" className="ml-2" />}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{number(level.quantity)}</td>
                    </tr>
                  ))}
                  <tr className="bg-cream/40">
                    <th scope="row" className="px-5 py-3 font-medium text-ink">
                      Total
                    </th>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      <span className="mr-2 align-middle">
                        <StatusBadge status={detail.stockStatus} />
                      </span>
                      {number(detail.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          {can("inventory:adjust") && <StockTransactionPanel key={product.id} detail={detail} onUpdated={resource.setData} onConflict={resource.reload} />}
        </div>

        <Panel title="Product">
          {product.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image.url} alt={product.image.alt} className="mb-4 aspect-square w-full max-w-[14rem] bg-cream object-cover" />
          )}
          <KeyValue
            columns={1}
            items={[
              { label: "SKU", value: product.sku },
              { label: "Barcode", value: product.barcode ?? "—" },
              { label: "Category", value: product.category },
              { label: "Metal / purity", value: metalPurity(product.metal, product.purity) },
              { label: "Net weight", value: weight(product.netWeight) },
              { label: "Gross weight", value: product.grossWeight !== null ? weight(product.grossWeight) : "—" },
              { label: "Product status", value: <StatusBadge status={product.status} /> },
              { label: "Low-stock alert", value: `${product.lowStockThreshold} units` },
              { label: "Purchase price", value: product.purchasePrice === null || product.purchasePrice === undefined ? "Not recorded" : money(product.purchasePrice), hidden: !("purchasePrice" in product) },
            ]}
          />
          {can("products:view") && (
            <Link href={`/admin/products/${product.id}`} className="mt-4 inline-block text-[0.8125rem] text-champagne-deep hover:underline">
              Open product record →
            </Link>
          )}
        </Panel>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[0.9375rem] font-medium text-ink">Movement history</h2>
            <p className="text-[0.8125rem] text-muted">Most recent {detail.movements.length >= 50 ? "50 " : ""}stock changes for this product.</p>
          </div>
          {detail.movements.length >= 50 && (
            <Link href={`/admin/inventory/stock-movements?productId=${product.id}`} className="text-[0.8125rem] text-champagne-deep hover:underline">
              View full history
            </Link>
          )}
        </div>
        <DataTable columns={movementColumns({ locationName })} rows={detail.movements} getRowKey={(movement) => movement.id} loading={resource.loading} empty={{ title: "No stock movements yet" }} />
      </section>
    </>
  );
}
