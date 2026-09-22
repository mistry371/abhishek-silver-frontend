"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLinkIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { ParentProductForm } from "@/components/admin/catalogue/ParentProductForm";
import { DeleteDialog } from "@/components/admin/catalogue/shared";
import type { ParentProductDetail } from "@/components/admin/catalogue/types";
import { TrashIcon } from "@/components/admin/icons";
import { AdminButton, adminButton, ErrorState, InlineAlert, KeyValue, LoadingBlock, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { formatDateTime, number } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

export default function EditParentProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAdmin();
  const resource = useAdminResource<ParentProductDetail>(`/parent-products/${id}`);
  const parent = resource.data ?? (resource.latest?.id === id ? resource.latest : undefined);
  const [deleting, setDeleting] = useState(false);
  const back = { href: "/admin/parent-products", label: "Parent products" };

  if (!parent) {
    return (
      <>
        <PageHeader title="Parent product" back={back} />
        {resource.error ? <ErrorState error={resource.error} onRetry={resource.error.status === 404 ? undefined : resource.reload} /> : <LoadingBlock rows={8} />}
      </>
    );
  }

  const optionCount = parent.variants.length;

  return (
    <>
      <PageHeader
        title={parent.name}
        back={back}
        description={[parent.category?.name, `${number(optionCount)} ${optionCount === 1 ? "option" : "options"}`].filter(Boolean).join(" · ")}
        meta={
          <>
            <StatusBadge status={parent.status} />
            {resource.loading && <span className="text-[0.75rem] text-muted">Refreshing…</span>}
          </>
        }
        actions={
          <>
            {parent.status === "active" && optionCount > 0 && (
              <a href={`/product/${parent.slug}`} target="_blank" rel="noopener noreferrer" className={adminButton("secondary")}>
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

      <ParentProductForm
        parent={parent}
        onSaved={resource.setData}
        onReload={resource.reload}
        aside={
          <>
            <Panel title="On the website">
              <p className="text-[0.8125rem] text-ink-soft">
                {parent.status !== "active"
                  ? "This design is a draft, so nothing changes on the website — each product shows on its own."
                  : optionCount < 2
                    ? "Active, but a design needs at least two options before customers see a choice."
                    : `Shown as one piece with ${number(optionCount)} options. Customers pick an option on the product page.`}
              </p>
            </Panel>
            {(parent.createdAt || parent.updatedAt) && (
              <Panel title="Record">
                <KeyValue
                  columns={1}
                  items={[
                    { label: "Created", value: formatDateTime(parent.createdAt), hidden: !parent.createdAt },
                    { label: "Last updated", value: formatDateTime(parent.updatedAt), hidden: !parent.updatedAt },
                  ]}
                />
              </Panel>
            )}
          </>
        }
      />

      {deleting && (
        <DeleteDialog
          path={`/parent-products/${parent.id}`}
          title={`Delete ${parent.name}?`}
          description={`Only the grouping is removed. ${optionCount === 1 ? "Its product stays" : `All ${number(optionCount)} products stay`} in your catalogue with their stock, prices and order history, and go back to showing on their own on the website.`}
          successMessage="Parent product deleted — its products are now standalone"
          onClose={() => setDeleting(false)}
          onDeleted={() => router.push("/admin/parent-products")}
        />
      )}
    </>
  );
}
