"use client";

import { useMemo, useState } from "react";
import { CheckboxInput, ImagesInput, NumberInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, AdminDialog } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError, type ImageAsset } from "@/lib/admin/client";
import { MutationAlert } from "./shared";
import type { Collection } from "./types";
import { asApiError, changedKeys, fieldError, pick, slugify, text } from "./utils";

const KNOWN = ["slug", "name", "eyebrow", "description", "image", "mobileImage", "seo", "displayOrder", "active"] as const;

interface CollectionFormState {
  name: string;
  slug: string;
  eyebrow: string;
  description: string;
  images: ImageAsset[];
  mobileImages: ImageAsset[];
  seoTitle: string;
  seoDescription: string;
  displayOrder: string;
  active: boolean;
}

function toForm(collection?: Collection): CollectionFormState {
  return {
    name: collection?.name ?? "",
    slug: collection?.slug ?? "",
    eyebrow: collection?.eyebrow ?? "",
    description: collection?.description ?? "",
    images: collection?.image ? [collection.image] : [],
    mobileImages: collection?.mobileImage ? [collection.mobileImage] : [],
    seoTitle: collection?.seo?.title ?? "",
    seoDescription: collection?.seo?.description ?? "",
    displayOrder: collection ? text(collection.displayOrder) : "0",
    active: collection?.active ?? true,
  };
}

function build(form: CollectionFormState, base?: Collection): Record<(typeof KNOWN)[number], unknown> {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    eyebrow: form.eyebrow.trim() || null,
    description: form.description.trim(),
    image: form.images[0] ?? null,
    mobileImage: form.mobileImages[0] ?? null,
    seo: { ...(base?.seo ?? {}), title: form.seoTitle.trim() || undefined, description: form.seoDescription.trim() || undefined },
    displayOrder: form.displayOrder.trim() === "" ? 0 : toNumberOrNull(form.displayOrder),
    active: form.active,
  };
}

export function CollectionDialog({ collection, onClose, onSaved }: { collection?: Collection; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(() => toForm(collection));
  const [slugTouched, setSlugTouched] = useState(Boolean(collection));
  const [error, setError] = useState<AdminApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const baseline = useMemo(() => (collection ? build(toForm(collection), collection) : null), [collection]);
  const values = build(form, collection);
  const changed = baseline ? changedKeys(values, baseline) : [];
  const fe = (...keys: string[]) => fieldError(error?.fieldErrors, ...keys);
  const set = <K extends keyof CollectionFormState>(key: K, value: CollectionFormState[K]) => setForm((previous) => ({ ...previous, [key]: value }));

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (collection) {
        if (!changed.length) {
          onClose();
          return;
        }
        await adminApi.patch(`/collections/${collection.id}`, pick(values, changed));
        toast({ title: "Collection updated", tone: "success" });
      } else {
        await adminApi.post("/collections", values);
        toast({ title: "Collection created", tone: "success" });
      }
      onSaved();
    } catch (caught) {
      setError(asApiError(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      open
      onClose={onClose}
      size="lg"
      title={collection ? `Edit ${collection.name}` : "New collection"}
      description={collection ? `/${collection.slug}` : "Curated groups of products, shown as collection pages on the website."}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={save} loading={saving} disabled={Boolean(collection) && changed.length === 0}>
            {collection ? "Save changes" : "Create collection"}
          </AdminButton>
        </>
      }
    >
      <form
        noValidate
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <MutationAlert error={error} known={KNOWN} onReload={onSaved} className="sm:col-span-2" />
        <TextInput
          label="Name"
          required
          maxLength={80}
          value={form.name}
          error={fe("name")}
          onChange={(event) => {
            const name = event.target.value;
            setForm((previous) => ({ ...previous, name, slug: slugTouched ? previous.slug : slugify(name) }));
          }}
        />
        <TextInput
          label="Slug"
          required
          maxLength={160}
          value={form.slug}
          error={fe("slug")}
          hint="Lowercase letters, numbers and hyphens."
          onChange={(event) => {
            const slug = event.target.value.toLowerCase();
            setSlugTouched(slug !== "");
            setForm((previous) => ({ ...previous, slug: slug === "" ? slugify(previous.name) : slug }));
          }}
        />
        <TextInput label="Eyebrow" maxLength={80} value={form.eyebrow} error={fe("eyebrow")} hint="Optional small heading above the name." onChange={(event) => set("eyebrow", event.target.value)} />
        <NumberInput label="Display order" min={0} max={1000} step={1} inputMode="numeric" value={form.displayOrder} error={fe("displayOrder")} hint="Lower numbers show first." onChange={(event) => set("displayOrder", event.target.value)} />
        <TextArea label="Description" maxLength={600} rows={3} containerClassName="sm:col-span-2" value={form.description} error={fe("description")} onChange={(event) => set("description", event.target.value)} />
        <ImagesInput label="Image *" value={form.images} max={1} onChange={(images) => set("images", images)} error={fe("image")} />
        <ImagesInput label="Mobile image (optional)" value={form.mobileImages} max={1} onChange={(images) => set("mobileImages", images)} error={fe("mobileImage")} />
        <TextInput label="SEO title" maxLength={160} containerClassName="sm:col-span-2" value={form.seoTitle} error={fe("seo.title", "seo")} onChange={(event) => set("seoTitle", event.target.value)} />
        <TextArea label="SEO description" maxLength={320} rows={2} containerClassName="sm:col-span-2" value={form.seoDescription} error={fe("seo.description")} onChange={(event) => set("seoDescription", event.target.value)} />
        <CheckboxInput label="Active" description="Inactive collections are hidden from the website." checked={form.active} onChange={(event) => set("active", event.target.checked)} className="sm:col-span-2" />
        <button type="submit" hidden />
      </form>
    </AdminDialog>
  );
}
