"use client";

import { useParams } from "next/navigation";
import { CheckboxInput, FormSection, TextArea, TextInput } from "@/components/admin/fields";
import { ContentDocumentPage } from "@/components/admin/content/DocumentEditor";
import { scopeErrors } from "@/components/admin/content/errors";
import { ListEditor, StringListEditor } from "@/components/admin/content/ListEditor";
import { POLICY_SLUGS, type PolicyDoc, type PolicySlug } from "@/components/admin/content/types";
import { AdminLinkButton, EmptyNote, InlineAlert, PageHeader, StatusBadge } from "@/components/admin/ui";
import { ExternalLinkIcon } from "@/components/icons";

const policyNames: Record<PolicySlug, string> = { shipping: "Shipping Policy", returns: "Returns & Refund Policy", privacy: "Privacy Policy", terms: "Terms & Conditions" };
/** Storefront routes for each policy. */
const policyPaths: Record<PolicySlug, string> = { shipping: "/shipping", returns: "/returns", privacy: "/privacy", terms: "/terms" };

export default function PolicyContentPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug as PolicySlug;

  if (!POLICY_SLUGS.includes(slug)) {
    return (
      <>
        <PageHeader title="Policy not found" back={{ href: "/admin/content", label: "Website content" }} />
        <div className="border border-line bg-porcelain">
          <EmptyNote title="There is no policy with this address" description="Choose a policy from the Website content page." action={<AdminLinkButton href="/admin/content">Back to content</AdminLinkButton>} />
        </div>
      </>
    );
  }

  return (
    <ContentDocumentPage<PolicyDoc>
      key={slug}
      path={`/content/policies/${slug}`}
      title={policyNames[slug]}
      description="Legal and customer policy text. Final wording must be supplied and reviewed by the business."
      emptyValue={() => ({ slug, title: policyNames[slug], intro: "", sections: [], isPlaceholder: true })}
      normalize={(value) => ({ ...value, sections: value.sections ?? [], isPlaceholder: Boolean(value.isPlaceholder) })}
      prepare={({ title, intro, sections, isPlaceholder }) => ({ title, intro, sections, isPlaceholder })}
      meta={(value) => value?.isPlaceholder && <StatusBadge status="placeholder" label="Placeholder" tone="warning" />}
      notice={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <InlineAlert tone="warning" className="flex-1">
            Policies are legal text. Keep “Placeholder” ticked until the business has supplied and approved the final wording — the website then shows a notice that the policy is being finalised.
          </InlineAlert>
          <a href={policyPaths[slug]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[0.8125rem] text-champagne-deep hover:underline">
            View on website <ExternalLinkIcon size={14} />
          </a>
        </div>
      }
    >
      {({ value, set, errors }) => (
        <>
          <FormSection title="Page">
            <TextInput label="Title" required maxLength={120} value={value.title} error={errors.title} onChange={(event) => set("title", event.target.value)} />
            <div className="flex items-end pb-2">
              <CheckboxInput
                label="Placeholder text"
                description="Untick only once this is the business's approved policy."
                checked={value.isPlaceholder}
                onChange={(event) => set("isPlaceholder", event.target.checked)}
              />
            </div>
            <TextArea label="Introduction" rows={4} maxLength={1500} containerClassName="sm:col-span-2" value={value.intro} error={errors.intro} onChange={(event) => set("intro", event.target.value)} />
          </FormSection>

          <FormSection title="Sections" description="Each section has a heading and one or more paragraphs.">
            <ListEditor
              items={value.sections}
              max={30}
              collapsible
              addLabel="Add section"
              error={errors.sections}
              emptyText="No sections yet."
              onChange={(sections) => set("sections", sections)}
              createItem={() => ({ heading: "", body: [""] })}
              itemTitle={(section, index) => section.heading || `Section ${index + 1}`}
              renderItem={(section, index, update) => (
                <div className="grid gap-4">
                  <TextInput label="Heading" required maxLength={160} value={section.heading} error={errors[`sections.${index}.heading`]} onChange={(event) => update({ ...section, heading: event.target.value })} />
                  <StringListEditor
                    label="Paragraphs"
                    items={section.body}
                    max={20}
                    maxLength={4000}
                    itemLabel="Paragraph"
                    addLabel="Add paragraph"
                    errors={scopeErrors(errors, `sections.${index}.body`)}
                    onChange={(body) => update({ ...section, body })}
                  />
                </div>
              )}
            />
          </FormSection>
        </>
      )}
    </ContentDocumentPage>
  );
}
