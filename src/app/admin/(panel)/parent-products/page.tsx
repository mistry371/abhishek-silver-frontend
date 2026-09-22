"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PlusIcon } from "@/components/icons";
import { useAdmin } from "@/components/admin/AdminSession";
import { Thumb } from "@/components/admin/catalogue/shared";
import type { ParentProductListItem } from "@/components/admin/catalogue/types";
import { PARENT_STATUS_OPTIONS } from "@/components/admin/catalogue/utils";
import { ImportAction } from "@/components/admin/ImportDialog";
import { AdminButton, AdminLinkButton, DataTable, FilterBar, FilterSelect, PageHeader, Pagination, PermissionDenied, SearchBox, StatusBadge, type Column } from "@/components/admin/ui";
import type { Paginated } from "@/lib/admin/client";
import { formatDate, number } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const FILTER_KEYS = ["search", "status", "page"] as const;
const CLEARED = { search: "", status: "" };
const PAGE_SIZE = 25;

const columns: Column<ParentProductListItem>[] = [
  { key: "image", header: <span className="sr-only">Image</span>, cell: (row) => <Thumb image={row.image} />, className: "w-14" },
  {
    key: "name",
    header: "Design",
    cell: (row) => (
      <div className="min-w-[11rem]">
        <Link href={`/admin/parent-products/${row.id}`} className="font-medium text-ink hover:underline">
          {row.name}
        </Link>
        <p className="mt-0.5 text-[0.75rem] text-muted">/product/{row.slug}</p>
      </div>
    ),
  },
  { key: "category", header: "Category", priority: "low", cell: (row) => row.category?.name ?? <span className="text-muted">—</span> },
  {
    key: "variants",
    header: "Options",
    align: "right",
    cell: (row) => <span className="tabular-nums">{number(row.variantCount)}</span>,
  },
  { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  { key: "updatedAt", header: "Updated", priority: "low", cell: (row) => <span className="whitespace-nowrap text-muted">{formatDate(row.updatedAt)}</span> },
];

export default function ParentProductsPage() {
  const { can } = useAdmin();
  const { values, setFilters, query } = useUrlFilters(FILTER_KEYS);
  const canView = can("products:view");
  const listQuery = useMemo(() => ({ ...query, pageSize: PAGE_SIZE }), [query]);
  const list = useAdminResource<Paginated<ParentProductListItem>>(canView ? "/parent-products" : null, listQuery);

  const data = list.latest;
  const hasFilters = Boolean(values.search || values.status);
  const newButton = can("products:create") ? (
    <AdminLinkButton href="/admin/parent-products/new" variant="primary">
      <PlusIcon size={15} />
      New parent product
    </AdminLinkButton>
  ) : undefined;

  const header = (
    <PageHeader
      title="Parent products"
      description={
        data
          ? `${number(data.total)} ${data.total === 1 ? "design" : "designs"}${hasFilters ? " match these filters" : ""}. Each design groups products that differ only in metal, purity or size, and shows as one piece on the website.`
          : "Group products that are the same design in different metals or purities, so the website shows them as one piece with options."
      }
      actions={
        canView ? (
          <>
            <ImportAction entity="parent-products" onImported={list.reload} />
            {newButton}
          </>
        ) : undefined
      }
    />
  );

  if (!canView) {
    return (
      <>
        {header}
        <PermissionDenied message="Your role can't view products." />
      </>
    );
  }

  return (
    <>
      {header}

      <FilterBar>
        <SearchBox value={values.search} onChange={(search) => setFilters({ search })} placeholder="Search designs by name" />
        <FilterSelect label="Status" value={values.status} onChange={(status) => setFilters({ status })} options={PARENT_STATUS_OPTIONS} />
        {hasFilters && (
          <AdminButton variant="ghost" onClick={() => setFilters(CLEARED)}>
            Clear filters
          </AdminButton>
        )}
      </FilterBar>

      <DataTable
        columns={columns}
        rows={data?.items}
        getRowKey={(row) => row.id}
        loading={list.loading}
        error={list.error}
        onRetry={list.reload}
        rowHref={(row) => `/admin/parent-products/${row.id}`}
        empty={
          hasFilters
            ? { title: "No designs match these filters", action: <AdminButton onClick={() => setFilters(CLEARED)}>Clear filters</AdminButton> }
            : {
                title: "No parent products yet",
                description: "Create one to show a design's gold, silver or purity options together on a single product page.",
                action: newButton,
              }
        }
        footer={
          data && data.total > 0 ? (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={data.pageSize}
              onPageChange={(page) => setFilters({ page: page <= 1 ? "" : String(page) }, { resetPage: false })}
            />
          ) : undefined
        }
      />
    </>
  );
}
