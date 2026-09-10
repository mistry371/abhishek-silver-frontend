"use client";

import { useAdmin } from "@/components/admin/AdminSession";
import type { BlogListItem } from "@/components/admin/content/types";
import { AdminLinkButton, DataTable, FilterBar, FilterSelect, PageHeader, Pagination, SearchBox, StatusBadge } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const PAGE_SIZE = 20;

export default function BlogPostsPage() {
  const { can } = useAdmin();
  const { values, setFilters, query } = useUrlFilters(["status", "q", "page"] as const);
  const { latest, loading, error, reload } = useAdminResource<Paginated<BlogListItem>>("/blog-posts", { ...query, pageSize: PAGE_SIZE });
  const filtered = Boolean(values.q || values.status);

  return (
    <>
      <PageHeader
        title="Blog"
        description="Journal articles on the website. Drafts are only visible here."
        back={{ href: "/admin/content", label: "Website content" }}
        actions={
          can("content:manage") && (
            <AdminLinkButton href="/admin/content/blog/new" variant="primary">
              <PlusIcon size={15} />
              New post
            </AdminLinkButton>
          )
        }
      />

      <FilterBar>
        <SearchBox value={values.q} onChange={(q) => setFilters({ q })} placeholder="Search title, slug or category" />
        <FilterSelect
          label="Status"
          value={values.status}
          onChange={(status) => setFilters({ status })}
          options={[
            { value: "draft", label: "Draft" },
            { value: "published", label: "Published" },
          ]}
        />
      </FilterBar>

      <DataTable<BlogListItem>
        rows={latest?.items}
        loading={loading}
        error={error}
        onRetry={reload}
        getRowKey={(row) => row.id}
        rowHref={(row) => `/admin/content/blog/${row.id}`}
        empty={
          filtered
            ? { title: "No posts match these filters", description: "Try a different search or status." }
            : { title: "No blog posts yet", action: can("content:manage") ? <AdminLinkButton href="/admin/content/blog/new">Write the first post</AdminLinkButton> : undefined }
        }
        columns={[
          {
            key: "title",
            header: "Post",
            cell: (row) => (
              <div className="min-w-[14rem]">
                <p className="font-medium">{row.title}</p>
                <p className="text-[0.75rem] text-muted">/blog/{row.slug}</p>
              </div>
            ),
          },
          { key: "category", header: "Category", cell: (row) => row.category },
          { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
          { key: "published", header: "Published", cell: (row) => (row.publishedAt ? formatDate(row.publishedAt) : <span className="text-muted">—</span>) },
          { key: "updated", header: "Last updated", priority: "low", cell: (row) => <span className="text-muted">{formatDateTime(row.updatedAt)}</span> },
        ]}
        footer={
          latest && latest.total > 0 ? (
            <Pagination page={latest.page} totalPages={latest.totalPages} total={latest.total} pageSize={latest.pageSize} onPageChange={(page) => setFilters({ page: String(page) }, { resetPage: false })} />
          ) : undefined
        }
      />
    </>
  );
}
