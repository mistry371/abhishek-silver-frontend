"use client";

import { useState } from "react";
import { CheckboxInput, FormSection, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { ContentDocumentPage } from "@/components/admin/content/DocumentEditor";
import { errorAt, scopeErrors, type FieldErrors } from "@/components/admin/content/errors";
import { ContentBlockEditor, CtaField, ImageField, newId, OrderActiveFields, renumber } from "@/components/admin/content/fields";
import { ListEditor, StringListEditor } from "@/components/admin/content/ListEditor";
import type { Banner, BrandStory, ContentBlock, HomepageDoc } from "@/components/admin/content/types";
import { StatusBadge } from "@/components/admin/ui";

const emptyBlock = (id: string, key: string): ContentBlock => ({ id, key, eyebrow: "", title: "", description: "", displayOrder: 0, active: true });

const emptyHomepage = (): HomepageDoc => ({
  hero: [],
  goldEditorial: emptyBlock("gold-editorial", "gold"),
  silverEditorial: emptyBlock("silver-editorial", "silver"),
  campaign: emptyBlock("campaign", "campaign"),
  festival: null,
  customJewellery: emptyBlock("custom-jewellery", "custom"),
  brandStory: { eyebrow: "", title: "", paragraphs: [], image: { url: "", alt: "" }, pillars: [], cta: undefined },
  seoContent: { title: "", paragraphs: [] },
});

const sections = [
  ["hero", "Hero slides"],
  ["editorial", "Gold & silver"],
  ["campaign", "Campaign"],
  ["festival", "Festival"],
  ["custom", "Custom jewellery"],
  ["story", "Brand story"],
  ["seo", "SEO text"],
] as const;

export default function HomepageContentPage() {
  return (
    <ContentDocumentPage<HomepageDoc>
      path="/content/homepage"
      title="Homepage"
      description="Hero slides, editorial sections, brand story and the SEO text at the bottom of the homepage."
      emptyValue={emptyHomepage}
      meta={(value) => value && <StatusBadge status="active" label={`${value.hero.filter((slide) => slide.active).length} active slides`} tone="accent" />}
    >
      {({ value, set, errors }) => (
        <>
          <nav aria-label="Homepage sections" className="flex flex-wrap gap-2">
            {sections.map(([id, label]) => (
              <a key={id} href={`#section-${id}`} className="border border-line bg-porcelain px-3 py-1.5 text-[0.75rem] text-ink-soft hover:border-ink hover:text-ink">
                {label}
              </a>
            ))}
          </nav>

          <div id="section-hero" className="scroll-mt-24">
            <FormSection title="Hero slides" description="The large rotating banner at the top of the homepage. 1 to 8 slides; use the arrows to change their order.">
              <ListEditor<Banner>
                items={value.hero}
                min={1}
                max={8}
                collapsible
                addLabel="Add slide"
                error={errors.hero}
                emptyText="Add at least one slide."
                onChange={(hero, change) => set("hero", change === "move" || change === "add" ? renumber(hero) : hero)}
                createItem={() => ({
                  id: newId("hero"),
                  eyebrow: "",
                  title: "",
                  subtitle: "",
                  description: "",
                  image: { url: "", alt: "" },
                  primaryCta: { label: "", href: "" },
                  tone: "light",
                  align: "left",
                  displayOrder: value.hero.length + 1,
                  active: true,
                })}
                itemTitle={(slide) => (
                  <>
                    {slide.title || <span className="text-muted">Untitled slide</span>}
                    {!slide.active && <StatusBadge status="inactive" className="ml-2" />}
                  </>
                )}
                renderItem={(slide, index, update) => <HeroSlideEditor slide={slide} onChange={update} errors={scopeErrors(errors, `hero.${index}`)} />}
              />
            </FormSection>
          </div>

          <div id="section-editorial" className="grid scroll-mt-24 gap-6 xl:grid-cols-2">
            <BlockSection title="Gold editorial" description="Gold jewellery feature panel." value={value.goldEditorial} errors={scopeErrors(errors, "goldEditorial")} onChange={(next) => set("goldEditorial", next)} />
            <BlockSection title="Silver editorial" description="Silver jewellery feature panel." value={value.silverEditorial} errors={scopeErrors(errors, "silverEditorial")} onChange={(next) => set("silverEditorial", next)} />
          </div>

          <div id="section-campaign" className="scroll-mt-24">
            <BlockSection title="Campaign" description="Full-width campaign banner." value={value.campaign} errors={scopeErrors(errors, "campaign")} onChange={(next) => set("campaign", next)} />
          </div>

          <div id="section-festival" className="scroll-mt-24">
            <FestivalSection value={value.festival} errors={scopeErrors(errors, "festival")} onChange={(next) => set("festival", next)} />
          </div>

          <div id="section-custom" className="scroll-mt-24">
            <BlockSection title="Custom jewellery" description="Promotes the custom jewellery enquiry service." value={value.customJewellery} errors={scopeErrors(errors, "customJewellery")} onChange={(next) => set("customJewellery", next)} />
          </div>

          <div id="section-story" className="scroll-mt-24">
            <BrandStoryEditor value={value.brandStory} errors={scopeErrors(errors, "brandStory")} onChange={(next) => set("brandStory", next)} />
          </div>

          <div id="section-seo" className="scroll-mt-24">
            <FormSection title="SEO text" description="Descriptive copy near the footer that helps search engines understand the store. Write for people first.">
              <TextInput
                label="Heading"
                maxLength={160}
                containerClassName="sm:col-span-2"
                value={value.seoContent.title}
                error={errors["seoContent.title"]}
                onChange={(event) => set("seoContent", { ...value.seoContent, title: event.target.value })}
              />
              <StringListEditor
                label="Paragraphs"
                items={value.seoContent.paragraphs}
                max={6}
                maxLength={1500}
                itemLabel="Paragraph"
                addLabel="Add paragraph"
                errors={scopeErrors(errors, "seoContent.paragraphs")}
                onChange={(paragraphs) => set("seoContent", { ...value.seoContent, paragraphs })}
              />
            </FormSection>
          </div>
        </>
      )}
    </ContentDocumentPage>
  );
}

function HeroSlideEditor({ slide, onChange, errors }: { slide: Banner; onChange: (slide: Banner) => void; errors: FieldErrors }) {
  const set = (patch: Partial<Banner>) => onChange({ ...slide, ...patch });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput label="Eyebrow" maxLength={80} value={slide.eyebrow ?? ""} error={errors.eyebrow} onChange={(event) => set({ eyebrow: event.target.value })} />
      <TextInput label="Title" required maxLength={120} value={slide.title} error={errors.title} onChange={(event) => set({ title: event.target.value })} />
      <TextInput label="Subtitle" maxLength={160} value={slide.subtitle ?? ""} error={errors.subtitle} onChange={(event) => set({ subtitle: event.target.value })} />
      <TextArea label="Description" rows={2} maxLength={300} value={slide.description ?? ""} error={errors.description} onChange={(event) => set({ description: event.target.value })} />
      <ImageField label="Desktop image" required hint="Landscape, around 2400 × 1500." value={slide.image} error={errorAt(errors, "image")} onChange={(image) => set({ image: image ?? { url: "", alt: "" } })} />
      <ImageField label="Mobile image" hint="Optional portrait crop, around 1200 × 1700." value={slide.mobileImage} error={errorAt(errors, "mobileImage")} onChange={(mobileImage) => set({ mobileImage })} />
      <CtaField label="Primary button" value={slide.primaryCta} errors={scopeErrors(errors, "primaryCta")} onChange={(primaryCta) => set({ primaryCta: primaryCta ?? { label: "", href: "" } })} />
      <CtaField label="Secondary button" optional value={slide.secondaryCta} errors={scopeErrors(errors, "secondaryCta")} onChange={(secondaryCta) => set({ secondaryCta })} />
      <SelectInput
        label="Text colour"
        value={slide.tone}
        error={errors.tone}
        hint="Light text for dark photos, dark text for bright photos."
        options={[
          { value: "light", label: "Light text" },
          { value: "dark", label: "Dark text" },
        ]}
        onChange={(event) => set({ tone: event.target.value as Banner["tone"] })}
      />
      <SelectInput
        label="Text alignment"
        value={slide.align}
        error={errors.align}
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Centre" },
        ]}
        onChange={(event) => set({ align: event.target.value as Banner["align"] })}
      />
      <OrderActiveFields displayOrder={slide.displayOrder} active={slide.active} errors={errors} onChange={(patch) => set(patch)} />
    </div>
  );
}

function BlockSection({ title, description, value, onChange, errors }: { title: string; description: string; value: ContentBlock; onChange: (value: ContentBlock) => void; errors: FieldErrors }) {
  return (
    <section className="border border-line bg-porcelain">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-[0.9375rem] font-medium text-ink">{title}</h2>
          <p className="mt-0.5 text-[0.8125rem] text-muted">{description}</p>
        </div>
        {!value.active && <StatusBadge status="inactive" label="Hidden" />}
      </div>
      <div className="p-5">
        <ContentBlockEditor value={value} onChange={onChange} errors={errors} />
      </div>
    </section>
  );
}

function FestivalSection({ value, onChange, errors }: { value: ContentBlock | null; onChange: (value: ContentBlock | null) => void; errors: FieldErrors }) {
  // Remember the last block so switching the section off and on again doesn't lose the copy.
  const [stash, setStash] = useState<ContentBlock | null>(value);
  return (
    <section className="border border-line bg-porcelain">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-3.5">
        <div>
          <h2 className="text-[0.9375rem] font-medium text-ink">Festival campaign</h2>
          <p className="mt-0.5 text-[0.8125rem] text-muted">Seasonal banner. Turn it off outside festive periods to remove the section entirely.</p>
        </div>
        <CheckboxInput
          label="Show festival section"
          checked={value !== null}
          onChange={(event) => {
            if (event.target.checked) onChange(stash ?? { ...emptyBlock("festival-campaign", "festival"), displayOrder: 4 });
            else {
              setStash(value);
              onChange(null);
            }
          }}
        />
      </div>
      <div className="p-5">
        {value ? (
          <ContentBlockEditor value={value} onChange={onChange} errors={errors} />
        ) : (
          <p className="text-[0.8125rem] text-muted">The festival section is hidden on the homepage.</p>
        )}
      </div>
    </section>
  );
}

function BrandStoryEditor({ value, onChange, errors }: { value: BrandStory; onChange: (value: BrandStory) => void; errors: FieldErrors }) {
  const set = (patch: Partial<BrandStory>) => onChange({ ...value, ...patch });
  return (
    <FormSection title="Brand story" description="Keep this to verified facts about the business — no invented history, awards or figures.">
      <TextInput label="Eyebrow" maxLength={80} value={value.eyebrow} error={errors.eyebrow} onChange={(event) => set({ eyebrow: event.target.value })} />
      <TextInput label="Title" required maxLength={160} value={value.title} error={errors.title} onChange={(event) => set({ title: event.target.value })} />
      <StringListEditor
        label="Paragraphs"
        description="1 to 6 paragraphs."
        items={value.paragraphs}
        min={1}
        max={6}
        maxLength={1200}
        itemLabel="Paragraph"
        addLabel="Add paragraph"
        errors={scopeErrors(errors, "paragraphs")}
        onChange={(paragraphs) => set({ paragraphs })}
      />
      <ImageField label="Main image" required value={value.image} error={errorAt(errors, "image")} onChange={(image) => set({ image: image ?? { url: "", alt: "" } })} />
      <ImageField label="Secondary image" value={value.secondaryImage} error={errorAt(errors, "secondaryImage")} onChange={(secondaryImage) => set({ secondaryImage })} />
      <ListEditor
        label="Pillars"
        description="Up to 6 short value statements."
        items={value.pillars}
        max={6}
        layout="grid"
        addLabel="Add pillar"
        error={errors.pillars}
        onChange={(pillars) => set({ pillars })}
        createItem={() => ({ title: "", description: "" })}
        itemTitle={(pillar, index) => pillar.title || `Pillar ${index + 1}`}
        renderItem={(pillar, index, update) => (
          <div className="grid gap-3">
            <TextInput label="Title" required maxLength={80} value={pillar.title} error={errors[`pillars.${index}.title`]} onChange={(event) => update({ ...pillar, title: event.target.value })} />
            <TextArea label="Description" rows={2} maxLength={300} value={pillar.description} error={errors[`pillars.${index}.description`]} onChange={(event) => update({ ...pillar, description: event.target.value })} />
          </div>
        )}
      />
      <CtaField label="Button" optional value={value.cta} errors={scopeErrors(errors, "cta")} onChange={(cta) => set({ cta })} />
    </FormSection>
  );
}
