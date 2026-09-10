"use client";

import { useParams } from "next/navigation";
import { BlogPostForm } from "@/components/admin/content/BlogPostForm";
import type { AdminBlogPost } from "@/components/admin/content/types";
import { ErrorState, LoadingBlock, PageHeader } from "@/components/admin/ui";
import { useAdminResource } from "@/lib/admin/hooks";

export default function EditBlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload, setData } = useAdminResource<AdminBlogPost>(`/blog-posts/${id}`);

  if (error || !data) {
    return (
      <>
        <PageHeader title="Blog post" back={{ href: "/admin/content/blog", label: "Blog" }} />
        {error ? <ErrorState error={error} onRetry={reload} /> : <LoadingBlock rows={8} />}
      </>
    );
  }

  return <BlogPostForm key={data.updatedAt} post={data} onSaved={setData} />;
}
