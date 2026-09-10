"use client";

import { useMemo, useState } from "react";
import { CheckboxInput, NumberInput, SelectInput, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { AdminButton, AdminDialog } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, AdminApiError } from "@/lib/admin/client";
import { MutationAlert } from "./shared";
import type { Category, Subcategory } from "./types";
import { asApiError, changedKeys, fieldError, pick, slugify, text } from "./utils";

const KNOWN = ["categoryId", "slug", "name", "displayOrder", "active"] as const;

interface SubcategoryFormState {
  categoryId: string;
  name: string;
  slug: string;
  displayOrder: string;
  active: boolean;
}

function toForm(subcategory?: Subcategory, defaultCategoryId?: string): SubcategoryFormState {
  return {
    categoryId: subcategory?.categoryId ?? defaultCategoryId ?? "",
    name: subcategory?.name ?? "",
    slug: subcategory?.slug ?? "",
    displayOrder: subcategory ? text(subcategory.displayOrder) : "0",
    active: subcategory?.active ?? true,
  };
}

function build(form: SubcategoryFormState) {
  return {
    slug: form.slug.trim(),
    name: form.name.trim(),
    displayOrder: form.displayOrder.trim() === "" ? 0 : toNumberOrNull(form.displayOrder),
    active: form.active,
  };
}

/** Create (under a jewellery type) or edit a subcategory. */
export function SubcategoryDialog({
  categories,
  subcategory,
  defaultCategoryId,
  onClose,
  onSaved,
}: {
  /** All categories; only "type" ones can receive new subcategories. */
  categories: Category[];
  subcategory?: Subcategory;
  defaultCategoryId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => toForm(subcategory, defaultCategoryId));
  const [slugTouched, setSlugTouched] = useState(Boolean(subcategory));
  const [error, setError] = useState<AdminApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const baseline = useMemo(() => (subcategory ? build(toForm(subcategory)) : null), [subcategory]);
  const values = build(form);
  const changed = baseline ? changedKeys(values, baseline) : [];
  const fe = (...keys: string[]) => fieldError(error?.fieldErrors, ...keys);
  const set = <K extends keyof SubcategoryFormState>(key: K, value: SubcategoryFormState[K]) => setForm((previous) => ({ ...previous, [key]: value }));

  const typeOptions = categories.filter((category) => category.group === "type").map((category) => ({ value: category.id, label: category.name }));
  const parent = categories.find((category) => category.id === form.categoryId);
  if (subcategory && parent && !typeOptions.some((option) => option.value === parent.id)) typeOptions.unshift({ value: parent.id, label: parent.name });

  async function save() {
    if (saving) return;
    setError(null);
    if (!subcategory && !form.categoryId) {
      setError(new AdminApiError(422, { code: "validation_error", message: "Please review the highlighted fields.", fieldErrors: { categoryId: "Choose a jewellery type." } }));
      return;
    }
    setSaving(true);
    try {
      if (subcategory) {
        if (!changed.length) {
          onClose();
          return;
        }
        await adminApi.patch(`/subcategories/${subcategory.id}`, pick(values, changed));
        toast({ title: "Subcategory updated", tone: "success" });
      } else {
        await adminApi.post(`/categories/${form.categoryId}/subcategories`, values);
        toast({ title: "Subcategory created", tone: "success" });
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
      title={subcategory ? `Edit ${subcategory.name}` : "New subcategory"}
      description={parent ? `Under ${parent.name}` : "Subcategories belong to a jewellery type."}
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={save} loading={saving} disabled={Boolean(subcategory) && changed.length === 0}>
            {subcategory ? "Save changes" : "Create subcategory"}
          </AdminButton>
        </>
      }
    >
      <form
        noValidate
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <MutationAlert error={error} known={KNOWN} onReload={onSaved} />
        <SelectInput
          label="Jewellery type"
          required
          placeholder="Choose a type"
          options={typeOptions}
          value={form.categoryId}
          disabled={Boolean(subcategory)}
          error={fe("categoryId")}
          hint={subcategory ? "Subcategories can't move to another type." : typeOptions.length === 0 ? "Create a jewellery type category first." : undefined}
          onChange={(event) => set("categoryId", event.target.value)}
        />
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
          hint="Unique within the jewellery type."
          onChange={(event) => {
            const slug = event.target.value.toLowerCase();
            setSlugTouched(slug !== "");
            setForm((previous) => ({ ...previous, slug: slug === "" ? slugify(previous.name) : slug }));
          }}
        />
        <NumberInput label="Display order" min={0} max={1000} step={1} inputMode="numeric" value={form.displayOrder} error={fe("displayOrder")} onChange={(event) => set("displayOrder", event.target.value)} />
        <CheckboxInput label="Active" description="Inactive subcategories are hidden from the website." checked={form.active} onChange={(event) => set("active", event.target.checked)} />
        <button type="submit" hidden />
      </form>
    </AdminDialog>
  );
}
