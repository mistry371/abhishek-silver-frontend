"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { ExternalLinkIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi, errorMessage, type ImageAsset } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/admin/format";
import { useMutation } from "@/lib/admin/hooks";
import { slugify } from "@/lib/utils";
import { useAdmin } from "../AdminSession";
import { FormSection, SelectInput, TextArea, TextInput } from "../fields";
import { SaveIcon, TrashIcon } from "../icons";
import { AdminButton, ConfirmDialog, InlineAlert, PageHeader, StatusBadge } from "../ui";
import { BlogBlocksEditor } from "./BlogBlocksEditor";
import { ErrorSummary } from "./DocumentEditor";
import { errorAt, scopeErrors } from "./errors";
import { ImageField } from "./fields";
import type { AdminBlogPost, BlogBlock, BlogStatus } from "./types";

/** Existing categories on the website, offered as suggestions. */
const CATEGORY_SUGGESTIONS = ["Gold Education", "Silver Education", "Buying Guides", "Styling", "Festival Collections"];

interface Draft {
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  category: string;
  coverImage?: ImageAsset;
  authorName: string;
  authorRole: string;
  tags: string;
  status: BlogStatus;
  publishedAt: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  content: BlogBlock[];
}

const istParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in India time for a datetime-local input. */
function isoToIstInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(istParts.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

const istInputToIso = (value: string) => `${value}:00+05:30`;
const splitList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

function toDraft(post: AdminBlogPost | null): Draft {
  return {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    slugTouched: Boolean(post),
    excerpt: post?.excerpt ?? "",
    category: post?.category ?? "",
    coverImage: post?.coverImage?.url ? post.coverImage : undefined,
    authorName: post?.author?.name ?? "",
    authorRole: post?.author?.role ?? "",
    tags: (post?.tags ?? []).join(", "),
    status: post?.status ?? "draft",
    publishedAt: isoToIstInput(post?.publishedAt),
    seoTitle: post?.seo?.title ?? "",
    seoDescription: post?.seo?.description ?? "",
    seoKeywords: (post?.seo?.keywords ?? []).join(", "),
    content: post?.content ?? [],
  };
}

function toBody(draft: Draft) {
  return {
    title: draft.title,
    slug: draft.slug.trim(),
    excerpt: draft.excerpt,
    category: draft.category,
    coverImage: draft.coverImage,
    author: { name: draft.authorName, role: draft.authorRole.trim() || undefined },
    content: draft.content,
    tags: splitList(draft.tags),
    status: draft.status,
    // Empty date: drafts clear it; published posts keep their date (or get "now" on first publish).
    publishedAt: draft.publishedAt ? istInputToIso(draft.publishedAt) : draft.status === "draft" ? null : undefined,
    seo: {
      title: draft.seoTitle.trim() || undefined,
      description: draft.seoDescription.trim() || undefined,
      keywords: splitList(draft.seoKeywords),
    },
  };
}

/** Create or edit a blog post. Keyed by `updatedAt` in the edit page so a save re-initialises it. */
export function BlogPostForm({ post, onSaved }: { post: AdminBlogPost | null; onSaved?: (post: AdminBlogPost) => void }) {
  const router = useRouter();
  const { can } = useAdmin();
  const readOnly = !can("content:manage");
  const categoryListId = useId();
  const [draft, setDraft] = useState<Draft>(() => toDraft(post));
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useMutation((body: unknown) => (post ? adminApi.patch<AdminBlogPost>(`/blog-posts/${post.id}`, body) : adminApi.post<AdminBlogPost>("/blog-posts", body)));
  const remove = useMutation(async (id: string) => {
    await adminApi.del(`/blog-posts/${id}`);
    return true as const;
  });
  const errors = save.fieldErrors;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) return;
    const result = await save.run(toBody(draft));
    if (!result) {
      toast({ title: "Post not saved", description: "Please review the highlighted fields.", tone: "error" });
      return;
    }
    setDirty(false);
    if (post) {
      toast({ title: "Post saved", description: result.status === "published" ? "The website will show the update shortly." : undefined, tone: "success" });
      onSaved?.(result);
    } else {
      toast({ title: result.status === "published" ? "Post published" : "Draft created", tone: "success" });
      router.replace(`/admin/content/blog/${result.id}`);
    }
  }

  const publishedOnSite = post?.status === "published";

  return (
    <>
      <form onSubmit={submit} noValidate>
        <PageHeader
          title={post ? post.title : "New blog post"}
          back={{ href: "/admin/content/blog", label: "Blog" }}
          meta={
            post && (
              <>
                <StatusBadge status={post.status} />
                <span className="text-[0.75rem] text-muted">
                  Updated {formatDateTime(post.updatedAt)}
                  {post.publishedAt ? ` · Published ${formatDateTime(post.publishedAt)}` : ""} · {post.readingMinutes} min read
                </span>
              </>
            )
          }
          actions={
            <>
              {publishedOnSite && (
                <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 px-2 text-[0.8125rem] text-champagne-deep hover:underline">
                  View on website <ExternalLinkIcon size={14} />
                </a>
              )}
              {!readOnly && post && (
                <AdminButton variant="danger" onClick={() => setConfirmDelete(true)}>
                  <TrashIcon size={15} />
                  Delete
                </AdminButton>
              )}
              {!readOnly && (
                <AdminButton type="submit" variant="primary" loading={save.pending}>
                  <SaveIcon size={15} />
                  {post ? "Save changes" : draft.status === "published" ? "Publish post" : "Create draft"}
                </AdminButton>
              )}
            </>
          }
        />

        <div className="space-y-6">
          {readOnly && <InlineAlert tone="info">You can view this post but not change it.</InlineAlert>}
          <ErrorSummary error={save.error} />

          <fieldset disabled={readOnly} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-6">
              <FormSection title="Post">
                <TextInput
                  label="Title"
                  required
                  maxLength={200}
                  containerClassName="sm:col-span-2"
                  value={draft.title}
                  error={errors.title}
                  onChange={(event) => set({ title: event.target.value, ...(draft.slugTouched ? {} : { slug: slugify(event.target.value).slice(0, 160).replace(/-+$/, "") }) })}
                />
                <TextInput
                  label="URL slug"
                  required
                  maxLength={160}
                  containerClassName="sm:col-span-2"
                  value={draft.slug}
                  error={errors.slug}
                  hint={
                    <>
                      /blog/<span className="text-ink-soft">{draft.slug || "your-post"}</span>
                      {publishedOnSite ? " — changing this breaks existing links to the post." : " — filled in from the title until you edit it."}
                    </>
                  }
                  onChange={(event) => set({ slug: event.target.value.toLowerCase().replace(/\s+/g, "-"), slugTouched: true })}
                />
                <TextArea
                  label="Excerpt"
                  required
                  rows={3}
                  maxLength={400}
                  containerClassName="sm:col-span-2"
                  hint="One or two sentences shown on the blog list and in search results."
                  value={draft.excerpt}
                  error={errors.excerpt}
                  onChange={(event) => set({ excerpt: event.target.value })}
                />
              </FormSection>

              <section className="border border-line bg-porcelain p-5">
                <BlogBlocksEditor blocks={draft.content} errors={scopeErrors(errors, "content")} onChange={(content) => set({ content })} />
              </section>
            </div>

            <div className="min-w-0 space-y-6">
              <FormSection title="Publishing">
                <SelectInput
                  label="Status"
                  containerClassName="sm:col-span-2"
                  value={draft.status}
                  error={errors.status}
                  hint={draft.status === "published" ? "Visible on the website." : "Only visible in the admin panel."}
                  options={[
                    { value: "draft", label: "Draft" },
                    { value: "published", label: "Published" },
                  ]}
                  onChange={(event) => set({ status: event.target.value as BlogStatus })}
                />
                <TextInput
                  label="Publish date"
                  type="datetime-local"
                  containerClassName="sm:col-span-2"
                  value={draft.publishedAt}
                  error={errors.publishedAt}
                  hint="India time. Leave empty to use the moment the post is first published."
                  onChange={(event) => set({ publishedAt: event.target.value })}
                />
              </FormSection>

              <FormSection title="Details">
                <TextInput label="Category" required maxLength={60} list={categoryListId} containerClassName="sm:col-span-2" value={draft.category} error={errors.category} onChange={(event) => set({ category: event.target.value })} />
                <datalist id={categoryListId}>
                  {CATEGORY_SUGGESTIONS.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
                <ImageField label="Cover image" required hint="Required, including for drafts." value={draft.coverImage} error={errorAt(errors, "coverImage")} onChange={(coverImage) => set({ coverImage })} />
                <TextInput label="Author name" required maxLength={80} containerClassName="sm:col-span-2" placeholder="Editorial Team" value={draft.authorName} error={errors["author.name"]} onChange={(event) => set({ authorName: event.target.value })} />
                <TextInput label="Author role" maxLength={80} containerClassName="sm:col-span-2" value={draft.authorRole} error={errors["author.role"]} onChange={(event) => set({ authorRole: event.target.value })} />
                <TextInput label="Tags" containerClassName="sm:col-span-2" placeholder="gold, buying guide" hint="Separate with commas. Up to 20." value={draft.tags} error={errorAt(errors, "tags")} onChange={(event) => set({ tags: event.target.value })} />
              </FormSection>

              <FormSection title="Search engines" description="Optional. The title and excerpt are used when empty.">
                <TextInput label="SEO title" maxLength={160} containerClassName="sm:col-span-2" value={draft.seoTitle} error={errors["seo.title"]} onChange={(event) => set({ seoTitle: event.target.value })} />
                <TextArea label="SEO description" rows={3} maxLength={320} containerClassName="sm:col-span-2" value={draft.seoDescription} error={errors["seo.description"]} onChange={(event) => set({ seoDescription: event.target.value })} />
                <TextInput label="Keywords" containerClassName="sm:col-span-2" hint="Separate with commas." value={draft.seoKeywords} error={errorAt(errors, "seo.keywords")} onChange={(event) => set({ seoKeywords: event.target.value })} />
              </FormSection>
            </div>
          </fieldset>
        </div>

        {!readOnly && (
          <div className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border border-line bg-porcelain/95 px-4 py-3 backdrop-blur">
            <span className="text-[0.8125rem] text-muted" aria-live="polite">
              {dirty ? "You have unsaved changes." : "No unsaved changes."}
            </span>
            <AdminButton type="submit" variant="primary" loading={save.pending}>
              <SaveIcon size={15} />
              {post ? "Save changes" : draft.status === "published" ? "Publish post" : "Create draft"}
            </AdminButton>
          </div>
        )}
      </form>

      {post && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => {
            setConfirmDelete(false);
            remove.clearError();
          }}
          title="Delete this post?"
          description={`“${post.title}” will be removed${post.status === "published" ? " from the website" : ""}. This can't be undone.`}
          confirmLabel="Delete post"
          tone="danger"
          pending={remove.pending}
          error={remove.error ? errorMessage(remove.error) : null}
          onConfirm={async () => {
            const ok = await remove.run(post.id);
            if (!ok) return;
            setDirty(false);
            toast({ title: "Post deleted", tone: "success" });
            router.push("/admin/content/blog");
          }}
        />
      )}
    </>
  );
}
