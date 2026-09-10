"use client";

import { FormSection, SelectInput, TextInput } from "@/components/admin/fields";
import { ContentDocumentPage } from "@/components/admin/content/DocumentEditor";
import { ListEditor } from "@/components/admin/content/ListEditor";
import { SOCIAL_PLATFORMS, type SocialDoc, type SocialPlatform } from "@/components/admin/content/types";
import { FacebookIcon, InstagramIcon, PinterestIcon, YouTubeIcon } from "@/components/icons";
import { InlineAlert } from "@/components/admin/ui";

const platformLabels: Record<SocialPlatform, string> = { instagram: "Instagram", facebook: "Facebook", youtube: "YouTube", pinterest: "Pinterest" };
const platformIcons = { instagram: InstagramIcon, facebook: FacebookIcon, youtube: YouTubeIcon, pinterest: PinterestIcon };

const emptySocial = (): SocialDoc => ({ instagramHandle: "", links: [] });

export default function SocialContentPage() {
  return (
    <ContentDocumentPage<SocialDoc>
      path="/content/social"
      title="Social links"
      description="Social media profiles linked from the footer, Contact page and Instagram section."
      emptyValue={emptySocial}
      notice={<InlineAlert tone="info">Open each link after saving to confirm it goes to the business&apos;s official profile.</InlineAlert>}
    >
      {({ value, set, errors }) => (
        <>
          <FormSection title="Instagram handle" description="Shown as “Follow @handle” next to the Instagram gallery.">
            <TextInput label="Handle" maxLength={60} placeholder="@yourstore" value={value.instagramHandle} error={errors.instagramHandle} onChange={(event) => set("instagramHandle", event.target.value)} />
          </FormSection>

          <FormSection title="Profile links">
            <ListEditor
              items={value.links}
              max={8}
              addLabel="Add link"
              error={errors.links}
              emptyText="No social links added."
              onChange={(links) => set("links", links)}
              createItem={() => {
                const used = new Set(value.links.map((link) => link.id));
                const id = SOCIAL_PLATFORMS.find((platform) => !used.has(platform)) ?? "instagram";
                return { id, label: platformLabels[id], href: "" };
              }}
              itemTitle={(link) => {
                const Icon = platformIcons[link.id];
                return (
                  <span className="inline-flex items-center gap-2">
                    <Icon size={14} />
                    {link.label || platformLabels[link.id]}
                  </span>
                );
              }}
              renderItem={(link, index, update) => (
                <div className="grid gap-3 sm:grid-cols-3">
                  <SelectInput
                    label="Platform"
                    value={link.id}
                    error={errors[`links.${index}.id`]}
                    options={SOCIAL_PLATFORMS.map((platform) => ({ value: platform, label: platformLabels[platform] }))}
                    onChange={(event) => {
                      const id = event.target.value as SocialPlatform;
                      update({ ...link, id, label: link.label === platformLabels[link.id] || !link.label ? platformLabels[id] : link.label });
                    }}
                  />
                  <TextInput label="Label" required maxLength={40} value={link.label} error={errors[`links.${index}.label`]} onChange={(event) => update({ ...link, label: event.target.value })} />
                  <TextInput
                    label="Profile URL"
                    required
                    type="url"
                    placeholder="https://www.instagram.com/yourstore/"
                    value={link.href}
                    error={errors[`links.${index}.href`] ? "Enter the full address, starting with https://" : undefined}
                    onChange={(event) => update({ ...link, href: event.target.value.trim() })}
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
