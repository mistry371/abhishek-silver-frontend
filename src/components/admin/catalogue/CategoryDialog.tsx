"use client";

import { useMemo, useState } from "react";
import { CheckboxInput, ImagesInput, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, AdminDialog } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, type AdminApiError, type ImageAsset } from "@/lib/admin/client";
import { MutationAlert, OptionGroup } from "./shared";
import type { Category } from "./types";
import { asApiError, CATEGORY_GROUP_OPTIONS, changedKeys, fieldError, GENDER_OPTIONS, GENDERS, METAL_OPTIONS, pick, slugify, text, toggle } from "./utils";

const KNOWN = ["slug", "name", "shortName", "description", "image", "group", "listingRule", "seo", "displayOrder", "active"] as const;

interface CategoryFormState {
  name: string;
  slug: string;
  shortName: string;
  description: string;
  images: ImageAsset[];
  group: string;
  ruleMetal: string;
  ruleGenders: string[];
  ruleCustomizable: boolean;
  seoTitle: string;
  seoDescription: string;
  displayOrder: string;
  active: boolean;
}

function toForm(category?: Category): CategoryFormState {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    shortName: category?.shortName ?? "",
    description: category?.description ?? "",
    images: category?.image ? [category.image] : [],
    group: category?.group ?? "type",
    ruleMetal: category?.listingRule?.metal ?? "",
    ruleGenders: [...(category?.listingRule?.genders ?? [])],
    ruleCustomizable: Boolean(category?.listingRule?.customizable),
    seoTitle: category?.seo?.title ?? "",
    seoDescription: category?.seo?.description ?? "",
    displayOrder: category ? text(category.displayOrder) : "0",
    active: category?.active ?? true,
  };
}

function build(form: CategoryFormState, base?: Category): Record<(typeof KNOWN)[number], unknown> {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    shortName: form.shortName.trim() || null,
    description: form.description.trim(),
    image: form.images[0] ?? null,
    group: form.group || null,
    listingRule:
      form.group === "type"
        ? null
        : {
            ...(form.ruleMetal ? { metal: form.ruleMetal } : {}),
            ...(form.ruleGenders.length ? { genders: GENDERS.filter((gender) => form.ruleGenders.includes(gender)) } : {}),
            ...(form.ruleCustomizable ? { customizable: true } : {}),
          },
    seo: { ...(base?.seo ?? {}), title: form.seoTitle.trim() || undefined, description: form.seoDescription.trim() || undefined },
    displayOrder: form.displayOrder.trim() === "" ? 0 : toNumberOrNull(form.displayOrder),
    active: form.active,
  };
}

export function CategoryDialog({ category, onClose, onSaved }: { category?: Category; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(() => toForm(category));
  const [slugTouched, setSlugTouched] = useState(Boolean(category));
  const [error, setError] = useState<AdminApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const baseline = useMemo(() => (category ? build(toForm(category), category) : null), [category]);
  const values = build(form, category);
  const changed = baseline ? changedKeys(values, baseline) : [];
  const fe = (...keys: string[]) => fieldError(error?.fieldErrors, ...keys);
  const set = <K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const groupLocked = Boolean(category && category.productCount > 0);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (category) {
        if (!changed.length) {
          onClose();
          return;
        }
        await adminApi.patch(`/categories/${category.id}`, pick(values, changed));
        toast({ title: "Category updated", tone: "success" });
      } else {
        await adminApi.post("/categories", values);
        toast({ title: "Category created", tone: "success" });
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
      title={category ? `Edit ${category.name}` : "New category"}
      description={category ? `/${category.slug}` : "Jewellery types hold products. Other groups are landing pages that list products by a rule."}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={save} loading={saving} disabled={Boolean(category) && changed.length === 0}>
            {category ? "Save changes" : "Create category"}
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
        <TextInput label="Short name" maxLength={40} value={form.shortName} error={fe("shortName")} hint="Optional. Used in compact menus." onChange={(event) => set("shortName", event.target.value)} />
        <SelectInput
          label="Group"
          required
          options={CATEGORY_GROUP_OPTIONS}
          value={form.group}
          disabled={groupLocked}
          error={fe("group")}
          hint={groupLocked ? "This category has products, so its group can't change." : undefined}
          onChange={(event) => set("group", event.target.value)}
        />
        <TextArea label="Description" maxLength={500} rows={3} containerClassName="sm:col-span-2" value={form.description} error={fe("description")} onChange={(event) => set("description", event.target.value)} />
        <ImagesInput label="Image *" value={form.images} max={1} onChange={(images) => set("images", images)} error={fe("image")} />

        {form.group !== "type" && (
          <OptionGroup legend="Listing rule" hint="Choose which products this page lists — at least one condition." error={fe("listingRule")} className="border border-line p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectInput label="Metal" placeholder="Any metal" options={METAL_OPTIONS} value={form.ruleMetal} onChange={(event) => set("ruleMetal", event.target.value)} />
              <div className="flex items-end pb-2">
                <CheckboxInput label="Personalisable products only" checked={form.ruleCustomizable} onChange={(event) => set("ruleCustomizable", event.target.checked)} />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">Audience</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {GENDER_OPTIONS.map((option) => (
                    <CheckboxInput
                      key={option.value}
                      label={option.label}
                      checked={form.ruleGenders.includes(option.value)}
                      onChange={() => setForm((previous) => ({ ...previous, ruleGenders: toggle(previous.ruleGenders, option.value) }))}
                    />
                  ))}
                </div>
              </div>
            </div>
          </OptionGroup>
        )}

        <TextInput label="SEO title" maxLength={160} value={form.seoTitle} error={fe("seo.title", "seo")} onChange={(event) => set("seoTitle", event.target.value)} />
        <NumberInput label="Display order" min={0} max={1000} step={1} inputMode="numeric" value={form.displayOrder} error={fe("displayOrder")} hint="Lower numbers show first." onChange={(event) => set("displayOrder", event.target.value)} />
        <TextArea label="SEO description" maxLength={320} rows={2} containerClassName="sm:col-span-2" value={form.seoDescription} error={fe("seo.description")} onChange={(event) => set("seoDescription", event.target.value)} />
        <CheckboxInput label="Active" description="Inactive categories are hidden from the website." checked={form.active} onChange={(event) => set("active", event.target.checked)} className="sm:col-span-2" />
        <button type="submit" hidden />
      </form>
    </AdminDialog>
  );
}
