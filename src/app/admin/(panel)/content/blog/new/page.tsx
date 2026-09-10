"use client";

import { useAdmin } from "@/components/admin/AdminSession";
import { BlogPostForm } from "@/components/admin/content/BlogPostForm";
import { PageHeader, PermissionDenied } from "@/components/admin/ui";

export default function NewBlogPostPage() {
  const { can } = useAdmin();
  if (!can("content:manage")) {
    return (
      <>
        <PageHeader title="New blog post" back={{ href: "/admin/content/blog", label: "Blog" }} />
        <PermissionDenied message="Creating blog posts needs the “Manage content” permission." />
      </>
    );
  }
  return <BlogPostForm post={null} />;
}
