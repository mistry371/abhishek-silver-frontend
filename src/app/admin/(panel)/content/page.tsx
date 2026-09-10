"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ContentIndexRow, PolicySummary } from "@/components/admin/content/types";
import { AdminLinkButton, DataTable, ErrorState, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { ChevronRightIcon } from "@/components/icons";
import { formatDateTime } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";

const documents = [
  { key: "homepage", href: "/admin/content/homepage", title: "Homepage", description: "Hero slides, gold & silver editorials, campaign, festival banner, custom jewellery, brand story and SEO text." },
  { key: "about", href: "/admin/content/about", title: "About page", description: "Story, vision, mission, expertise, craftsmanship, commitments and certifications." },
  { key: "contact", href: "/admin/content/contact", title: "Contact details", description: "Address, phone numbers, WhatsApp, email, opening hours and store photo — also used in the footer." },
  { key: "social", href: "/admin/content/social", title: "Social links", description: "Instagram handle and links to the business's social profiles." },
  { key: "trust", href: "/admin/content/trust", title: "Trust highlights", description: "The short reassurance strip about pricing, payments and service." },
  { key: "instagram", href: "/admin/content/instagram", title: "Instagram gallery", description: "Photos and links shown in the Instagram section." },
] as const;

const collections = [
  { href: "/admin/content/testimonials", title: "Testimonials", description: "Customer quotes. Placeholder quotes stay clearly labelled as samples." },
  { href: "/admin/content/faqs", title: "FAQs", description: "Questions and answers on the FAQ page, in display order." },
  { href: "/admin/content/blog", title: "Blog", description: "Journal articles — drafts, published posts and their content." },
] as const;

function ContentCard({ href, title, description, footer }: { href: string; title: string; description: string; footer: ReactNode }) {
  return (
    <Link href={href} className="group flex flex-col border border-line bg-porcelain p-5 transition-colors hover:border-ink">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-[1.25rem] leading-tight text-ink">{title}</h2>
        <ChevronRightIcon size={16} className="mt-1 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
      </div>
      <p className="mt-1.5 flex-1 text-[0.8125rem] text-muted">{description}</p>
      <div className="mt-4 border-t border-line pt-3 text-[0.75rem] text-muted">{footer}</div>
    </Link>
  );
}

function updatedLine(row: { updatedAt: string | null; updatedByName: string | null } | undefined) {
  if (!row?.updatedAt) return "Not saved yet";
  return `Updated ${formatDateTime(row.updatedAt)}${row.updatedByName ? ` by ${row.updatedByName}` : ""}`;
}

export default function ContentIndexPage() {
  const index = useAdminResource<ContentIndexRow[]>("/content");
  const policies = useAdminResource<PolicySummary[]>("/content/policies");

  if (index.error?.code === "forbidden") {
    return (
      <>
        <PageHeader title="Website content" />
        <ErrorState error={index.error} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Website content" description="Edit the text, images and links customers see on the website. Changes appear on the site shortly after saving." />

      <div className="space-y-8">
        <section aria-labelledby="content-pages">
          <h2 id="content-pages" className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted">
            Pages & sections
          </h2>
          {index.error && <ErrorState error={index.error} onRetry={index.reload} />}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
              <ContentCard
                key={doc.key}
                href={doc.href}
                title={doc.title}
                description={doc.description}
                footer={index.data ? updatedLine(index.data.find((row) => row.key === doc.key)) : index.error ? "—" : "Loading…"}
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="content-collections">
          <h2 id="content-collections" className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted">
            Collections
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((item) => (
              <ContentCard key={item.href} href={item.href} title={item.title} description={item.description} footer="Managed item by item" />
            ))}
          </div>
        </section>

        <Panel title="Policies" description="Shipping, returns, privacy and terms. Placeholder policies must be replaced with wording supplied by the business." flush>
          <div className="-m-px">
            <DataTable<PolicySummary>
              rows={policies.data}
              error={policies.error}
              onRetry={policies.reload}
              getRowKey={(row) => row.slug}
              rowHref={(row) => `/admin/content/policies/${row.slug}`}
              columns={[
                { key: "title", header: "Policy", cell: (row) => <span className="font-medium">{row.title}</span> },
                {
                  key: "status",
                  header: "Status",
                  cell: (row) => (row.isPlaceholder ? <StatusBadge status="placeholder" label="Placeholder" tone="warning" /> : <StatusBadge status="final" label="Final wording" tone="success" />),
                },
                { key: "updated", header: "Last updated", priority: "low", cell: (row) => <span className="text-muted">{updatedLine(row)}</span> },
                {
                  key: "actions",
                  header: <span className="sr-only">Actions</span>,
                  align: "right",
                  cell: (row) => (
                    <AdminLinkButton href={`/admin/content/policies/${row.slug}`} size="sm" variant="ghost">
                      Edit
                    </AdminLinkButton>
                  ),
                },
              ]}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}
