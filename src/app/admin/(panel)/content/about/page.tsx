"use client";

import { FormSection, ImagesInput, TextArea, TextInput } from "@/components/admin/fields";
import { ContentDocumentPage } from "@/components/admin/content/DocumentEditor";
import { errorAt, scopeErrors, type FieldErrors as FieldErrorsLike } from "@/components/admin/content/errors";
import { ImageField } from "@/components/admin/content/fields";
import { ListEditor, StringListEditor } from "@/components/admin/content/ListEditor";
import type { AboutDoc, AboutTextItem } from "@/components/admin/content/types";
import { InlineAlert } from "@/components/admin/ui";

const emptyAbout = (): AboutDoc => ({
  hero: { eyebrow: "", title: "", description: "" },
  story: { title: "", paragraphs: [] },
  vision: "",
  mission: "",
  expertise: [],
  craftsmanship: { title: "", text: "", images: [], pillars: [] },
  quality: [],
  customerCommitment: [],
  certifications: [],
});

/** Older saved documents may miss sections; keep unknown keys untouched. */
function normalizeAbout(value: AboutDoc): AboutDoc {
  const base = emptyAbout();
  return {
    ...base,
    ...value,
    hero: { ...base.hero, ...value.hero },
    story: { ...base.story, ...value.story, paragraphs: value.story?.paragraphs ?? [] },
    craftsmanship: { ...base.craftsmanship, ...value.craftsmanship, images: value.craftsmanship?.images ?? [], pillars: value.craftsmanship?.pillars ?? [] },
    expertise: value.expertise ?? [],
    quality: value.quality ?? [],
    customerCommitment: value.customerCommitment ?? [],
    certifications: value.certifications ?? [],
  };
}

function TextItemList({ label, description, items, onChange, errors, addLabel, max = 12 }: { label: string; description?: string; items: AboutTextItem[]; onChange: (items: AboutTextItem[]) => void; errors: FieldErrorsLike; addLabel: string; max?: number }) {
  return (
    <ListEditor
      label={label}
      description={description}
      items={items}
      max={max}
      layout="grid"
      addLabel={addLabel}
      onChange={(next) => onChange(next)}
      createItem={() => ({ title: "", text: "" })}
      itemTitle={(item, index) => item.title || `${label} ${index + 1}`}
      renderItem={(item, index, update) => (
        <div className="grid gap-3">
          <TextInput label="Title" value={item.title} error={errors[`${index}.title`]} onChange={(event) => update({ ...item, title: event.target.value })} />
          <TextArea label="Text" rows={2} value={item.text} error={errors[`${index}.text`]} onChange={(event) => update({ ...item, text: event.target.value })} />
        </div>
      )}
    />
  );
}

export default function AboutContentPage() {
  return (
    <ContentDocumentPage<AboutDoc>
      path="/content/about"
      title="About page"
      description="Brand story, vision, mission, expertise, craftsmanship and commitments shown on the About page."
      emptyValue={emptyAbout}
      normalize={normalizeAbout}
      notice={<InlineAlert tone="info">Use the business&apos;s own words. Don&apos;t add founding years, awards, customer numbers or certifications that haven&apos;t been confirmed by the business.</InlineAlert>}
    >
      {({ value, set, errors }) => (
        <>
          <FormSection title="Hero" description="Opening banner of the About page.">
            <TextInput label="Eyebrow" value={value.hero.eyebrow} error={errors["hero.eyebrow"]} onChange={(event) => set("hero", { ...value.hero, eyebrow: event.target.value })} />
            <TextInput label="Title" required value={value.hero.title} error={errors["hero.title"]} onChange={(event) => set("hero", { ...value.hero, title: event.target.value })} />
            <TextArea label="Description" rows={2} containerClassName="sm:col-span-2" value={value.hero.description} error={errors["hero.description"]} onChange={(event) => set("hero", { ...value.hero, description: event.target.value })} />
            <ImageField label="Portrait image" value={value.hero.image} error={errorAt(errors, "hero.image")} onChange={(image) => set("hero", { ...value.hero, image })} />
            <ImageField label="Wide image" hint="Landscape image used on large screens." value={value.hero.wideImage} error={errorAt(errors, "hero.wideImage")} onChange={(wideImage) => set("hero", { ...value.hero, wideImage })} />
          </FormSection>

          <FormSection title="Our story">
            <TextInput label="Title" containerClassName="sm:col-span-2" value={value.story.title} error={errors["story.title"]} onChange={(event) => set("story", { ...value.story, title: event.target.value })} />
            <StringListEditor
              label="Paragraphs"
              items={value.story.paragraphs}
              max={10}
              itemLabel="Paragraph"
              addLabel="Add paragraph"
              errors={scopeErrors(errors, "story.paragraphs")}
              onChange={(paragraphs) => set("story", { ...value.story, paragraphs })}
            />
            <ImageField label="Story image" value={value.story.image} error={errorAt(errors, "story.image")} onChange={(image) => set("story", { ...value.story, image })} />
          </FormSection>

          <FormSection title="Vision & mission">
            <TextArea label="Vision" rows={3} value={value.vision} error={errors.vision} onChange={(event) => set("vision", event.target.value)} />
            <TextArea label="Mission" rows={3} value={value.mission} error={errors.mission} onChange={(event) => set("mission", event.target.value)} />
          </FormSection>

          <FormSection title="Expertise" description="Feature panels, e.g. one for gold and one for silver.">
            <ListEditor
              items={value.expertise}
              max={6}
              collapsible
              addLabel="Add expertise panel"
              onChange={(expertise) => set("expertise", expertise)}
              createItem={(): AboutDoc["expertise"][number] => ({ eyebrow: "", title: "", text: "" })}
              itemTitle={(item, index) => item.title || `Panel ${index + 1}`}
              renderItem={(item, index, update) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Eyebrow" value={item.eyebrow} error={errors[`expertise.${index}.eyebrow`]} onChange={(event) => update({ ...item, eyebrow: event.target.value })} />
                  <TextInput label="Title" value={item.title} error={errors[`expertise.${index}.title`]} onChange={(event) => update({ ...item, title: event.target.value })} />
                  <TextArea label="Text" rows={3} containerClassName="sm:col-span-2" value={item.text} error={errors[`expertise.${index}.text`]} onChange={(event) => update({ ...item, text: event.target.value })} />
                  <ImageField label="Image" value={item.image} error={errorAt(errors, `expertise.${index}.image`)} onChange={(image) => update({ ...item, image })} />
                </div>
              )}
            />
          </FormSection>

          <FormSection title="Craftsmanship">
            <TextInput label="Title" containerClassName="sm:col-span-2" value={value.craftsmanship.title} error={errors["craftsmanship.title"]} onChange={(event) => set("craftsmanship", { ...value.craftsmanship, title: event.target.value })} />
            <TextArea label="Text" rows={3} containerClassName="sm:col-span-2" value={value.craftsmanship.text} error={errors["craftsmanship.text"]} onChange={(event) => set("craftsmanship", { ...value.craftsmanship, text: event.target.value })} />
            <ImagesInput label="Images" max={4} value={value.craftsmanship.images} error={errorAt(errors, "craftsmanship.images")} onChange={(images) => set("craftsmanship", { ...value.craftsmanship, images })} />
            <TextItemList
              label="Pillars"
              items={value.craftsmanship.pillars}
              max={6}
              addLabel="Add pillar"
              errors={scopeErrors(errors, "craftsmanship.pillars")}
              onChange={(pillars) => set("craftsmanship", { ...value.craftsmanship, pillars })}
            />
          </FormSection>

          <FormSection title="Quality promise" description="Short statements about how products are described and priced.">
            <StringListEditor items={value.quality} multiline={false} max={12} itemLabel="Point" addLabel="Add point" errors={scopeErrors(errors, "quality")} onChange={(quality) => set("quality", quality)} />
          </FormSection>

          <FormSection title="Customer commitment">
            <TextItemList label="Commitment" items={value.customerCommitment} addLabel="Add commitment" errors={scopeErrors(errors, "customerCommitment")} onChange={(customerCommitment) => set("customerCommitment", customerCommitment)} />
          </FormSection>

          <FormSection title="Certifications" description="Leave empty until the business supplies its certifications. When empty, the website shows general purity information instead.">
            <InlineAlert tone="warning" className="sm:col-span-2">
              Only add certifications, registrations or hallmark licences the business actually holds and has provided proof of.
            </InlineAlert>
            <ListEditor
              items={value.certifications}
              max={12}
              addLabel="Add certification"
              emptyText="No certifications added."
              onChange={(certifications) => set("certifications", certifications)}
              createItem={(): AboutDoc["certifications"][number] => ({ name: "", description: "" })}
              itemTitle={(item, index) => item.name || `Certification ${index + 1}`}
              renderItem={(item, index, update) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput label="Name" required value={item.name} error={errors[`certifications.${index}.name`]} onChange={(event) => update({ ...item, name: event.target.value })} />
                  <TextArea label="Description" rows={2} value={item.description} error={errors[`certifications.${index}.description`]} onChange={(event) => update({ ...item, description: event.target.value })} />
                  <ImageField label="Certificate image" value={item.image} error={errorAt(errors, `certifications.${index}.image`)} onChange={(image) => update({ ...item, image })} />
                </div>
              )}
            />
          </FormSection>
        </>
      )}
    </ContentDocumentPage>
  );
}
