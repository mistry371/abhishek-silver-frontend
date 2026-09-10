import Link from "next/link";
import { JsonLd } from "@/components/seo/JsonLd";
import { FormMessage } from "@/components/ui/Field";
import { PageIntro } from "@/components/ui/PageIntro";
import { breadcrumbJsonLd } from "@/lib/seo";
import { formatDate, slugify } from "@/lib/utils";
import type { PolicyPage } from "@/types/content";

export function PolicyView({ policy }: { policy: PolicyPage }) {
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: policy.title }];
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <PageIntro breadcrumbs={breadcrumbs} eyebrow="Customer Care" title={policy.title} description={policy.intro} />
      <div className="container-luxe grid items-start gap-12 pb-24 lg:grid-cols-12 lg:gap-16">
        <nav aria-label="On this page" className="hidden lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:col-span-3 lg:block">
          <p className="type-caption tracking-[0.16em] text-muted">On this page</p>
          <ol className="mt-5 space-y-3 border-l border-line pl-5">
            {policy.sections.map((section) => (
              <li key={section.heading}>
                <a href={`#${slugify(section.heading)}`} className="type-body-sm text-ink-soft transition-colors hover:text-ink">
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <article className="lg:col-span-8 lg:col-start-5">
          {policy.isPlaceholder && (
            <FormMessage tone="info" className="mb-12">
              <span>
                This policy is being finalised. If you have a question in the meantime, please{" "}
                <Link href="/contact" className="underline underline-offset-2">
                  contact our team
                </Link>
                .
              </span>
            </FormMessage>
          )}
          <div className="prose-luxe">
            {policy.sections.map((section) => (
              <section key={section.heading} id={slugify(section.heading)} className="scroll-mt-40">
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>
          {policy.updatedAt && <p className="mt-14 border-t border-line pt-6 type-body-sm text-muted">Last updated {formatDate(policy.updatedAt)}</p>}
        </article>
      </div>
    </>
  );
}
