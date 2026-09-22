"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLinkIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { ProductForm } from "@/components/admin/catalogue/ProductForm";
import { DeleteDialog } from "@/components/admin/catalogue/shared";
import type { ProductDetail } from "@/components/admin/catalogue/types";
import { TrashIcon } from "@/components/admin/icons";
import { AdminButton, adminButton, ErrorState, InlineAlert, KeyValue, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, humanize, number } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAdmin();
  const resource = useAdminResource<ProductDetail>(`/products/${id}`);
  const product = resource.data ?? (resource.latest?.id === id ? resource.latest : undefined);
  const [deleting, setDeleting] = useState(false);
  const back = { href: "/admin/products", label: "Products" };

  if (!product) {
    return (
      <>
        <PageHeader title="Product" back={back} />
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.error.status === 404 ? undefined : resource.reload} /> : <LoadingBlock rows={8} />}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={product.name}
        back={back}
        description={[product.sku, product.category?.name].filter(Boolean).join(" · ")}
        meta={
          <>
            <StatusBadge status={product.status} />
            <StatusBadge status={product.stock.stockStatus} />
            {product.parent && (
              <span className="text-[0.75rem] text-muted">
                Variant of{" "}
                <Link href={`/admin/parent-products/${product.parent.id}`} className="text-champagne-deep hover:underline">
                  {product.parent.name}
                </Link>
                {product.variantLabel && <> · shown as “{product.variantLabel}”</>}
              </span>
            )}
            {resource.loading && <span className="text-[0.75rem] text-muted">Refreshing…</span>}
          </>
        }
        actions={
          <>
            {product.status === "active" && (
              <a href={`/product/${product.slug}`} target="_blank" rel="noopener noreferrer" className={adminButton("secondary")}>
                <ExternalLinkIcon size={15} />
                View on website
              </a>
            )}
            {can("products:delete") && (
              <AdminButton variant="danger" onClick={() => setDeleting(true)}>
                <TrashIcon size={15} />
                Delete
              </AdminButton>
            )}
          </>
        }
      />

      {resource.error && (
        <InlineAlert className="mb-6">
          {resource.error.message}{" "}
          <button type="button" className="underline" onClick={resource.reload}>
            Retry
          </button>
        </InlineAlert>
      )}

      <ProductForm
        product={product}
        onSaved={resource.setData}
        onReload={resource.reload}
        aside={
          <>
            <Panel
              title="Stock"
              actions={
                can("inventory:view") ? (
                  <Link href={`/admin/inventory/${product.id}`} className="text-[0.75rem] text-champagne-deep hover:underline">
                    Manage stock
                  </Link>
                ) : undefined
              }
            >
              <div className="flex items-end justify-between gap-3">
                <p className="font-serif text-[2rem] leading-none tabular-nums text-ink">
                  {number(product.stock.total)}
                  <span className="ml-1.5 font-sans text-[0.8125rem] text-muted">units</span>
                </p>
                <StatusBadge status={product.stock.stockStatus} />
              </div>
              <p className="mt-2 text-[0.75rem] text-muted">Flagged as low at {number(product.lowStockThreshold)} units or fewer.</p>
              {product.stock.levels.length > 0 && (
                <ul className="mt-4 divide-y divide-line border-t border-line text-[0.8125rem]">
                  {product.stock.levels.map((level) => (
                    <li key={level.locationId} className="flex items-center justify-between gap-3 py-2">
                      <span className="text-ink-soft">{humanize(level.locationId)}</span>
                      <span className="tabular-nums text-ink">{number(level.quantity)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Record">
              <KeyValue
                columns={1}
                items={[
                  { label: "Created", value: formatDateTime(product.createdAt) },
                  { label: "Last updated", value: formatDateTime(product.updatedAt) },
                  { label: "Units sold", value: number(product.salesCount) },
                  { label: "Page views", value: number(product.viewsCount) },
                ]}
              />
            </Panel>
          </>
        }
      />

      {deleting && (
        <DeleteDialog
          path={`/products/${product.id}`}
          title={`Delete ${product.name}?`}
          description="The product is removed from the catalogue and the website. Order, sale and stock history are kept. A product that still has stock can't be deleted — reduce its stock to zero first."
          successMessage="Product deleted"
          onClose={() => setDeleting(false)}
          onDeleted={() => router.push("/admin/products")}
        />
      )}
    </>
  );
}
