"use client";

import { FormSection, TextArea, TextInput } from "@/components/admin/fields";
import { ContentDocumentPage } from "@/components/admin/content/DocumentEditor";
import { errorAt } from "@/components/admin/content/errors";
import { ImageField, newId } from "@/components/admin/content/fields";
import { ListEditor } from "@/components/admin/content/ListEditor";
import type { InstagramDoc } from "@/components/admin/content/types";
import { AdminLinkButton, StatusBadge } from "@/components/admin/ui";

export default function InstagramContentPage() {
  return (
    <ContentDocumentPage<InstagramDoc>
      path="/content/instagram"
      title="Instagram gallery"
      description="Square photos shown in the Instagram section. Each tile links to a post or the profile."
      emptyValue={() => ({ posts: [] })}
      meta={(value) => value && <StatusBadge status="active" label={`${value.posts.length} posts`} tone="accent" />}
      notice={
        <p className="text-[0.8125rem] text-muted">
          The handle shown next to the gallery is managed in <AdminLinkButton href="/admin/content/social" variant="link">Social links</AdminLinkButton>.
        </p>
      }
    >
      {({ value, set, errors }) => (
        <FormSection title="Posts" description="Up to 24. Use square images (around 900 × 900) of the business's own jewellery.">
          <ListEditor
            items={value.posts}
            max={24}
            layout="grid"
            addLabel="Add post"
            error={errors.posts}
            emptyText="No posts added."
            onChange={(posts) => set("posts", posts)}
            createItem={() => ({ id: newId("ig"), image: { url: "", alt: "" }, url: "", caption: "" })}
            itemTitle={(post, index) => post.caption || post.image.alt || `Post ${index + 1}`}
            renderItem={(post, index, update) => (
              <div className="grid gap-3">
                <ImageField label="Image" required value={post.image} error={errorAt(errors, `posts.${index}.image`)} onChange={(image) => update({ ...post, image: image ?? { url: "", alt: "" } })} />
                <TextInput
                  label="Instagram link"
                  required
                  type="url"
                  placeholder="https://www.instagram.com/p/…"
                  value={post.url}
                  error={errors[`posts.${index}.url`] ? "Enter the full address, starting with https://" : undefined}
                  onChange={(event) => update({ ...post, url: event.target.value.trim() })}
                />
                <TextArea label="Caption" rows={2} maxLength={300} value={post.caption ?? ""} error={errors[`posts.${index}.caption`]} onChange={(event) => update({ ...post, caption: event.target.value })} />
              </div>
            )}
          />
        </FormSection>
      )}
    </ContentDocumentPage>
  );
}
