"use client";

import type { ReactNode } from "react";
import type { ImageAsset } from "@/lib/admin/client";
import { CheckboxInput, ImagesInput, NumberInput, TextArea, TextInput } from "../fields";
import { errorAt, scopeErrors, type FieldErrors } from "./errors";
import type { ContentBlock, CtaLink } from "./types";

/** New item ids — call only from event handlers. */
export function newId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.floor(performance.now()).toString(36);
  return `${prefix}-${random}`;
}

export const toDisplayOrder = (raw: string) => Math.max(0, Math.min(1000, Math.trunc(Number(raw) || 0)));

/** Sets displayOrder to the position in the list (1-based). */
export function renumber<T extends { displayOrder: number }>(items: T[]): T[] {
  return items.map((item, index) => (item.displayOrder === index + 1 ? item : { ...item, displayOrder: index + 1 }));
}

/** Single image with upload, alt text and remove. */
export function ImageField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
}: {
  label: string;
  value: ImageAsset | null | undefined;
  onChange: (image: ImageAsset | undefined) => void;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="min-w-0 sm:col-span-2">
      <ImagesInput label={required ? `${label} *` : label} value={value?.url ? [value] : []} onChange={(images) => onChange(images[0])} max={1} error={error} />
      {hint && !error && <p className="mt-1 text-[0.75rem] text-muted">{hint}</p>}
    </div>
  );
}

/** Button label + link. Optional links get a "Show button" toggle. */
export function CtaField({
  label,
  value,
  onChange,
  optional = false,
  errors = {},
}: {
  label: string;
  value: CtaLink | undefined;
  onChange: (value: CtaLink | undefined) => void;
  optional?: boolean;
  errors?: FieldErrors;
}) {
  const enabled = !optional || Boolean(value);
  return (
    <fieldset className="min-w-0 border border-line bg-porcelain/60 p-3 sm:col-span-2">
      <legend className="px-1 text-[0.75rem] font-medium text-ink-soft">{label}</legend>
      {optional && (
        <CheckboxInput
          label="Show this button"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked ? (value ?? { label: "", href: "" }) : undefined)}
          className="mb-3"
        />
      )}
      {enabled && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Button text" required maxLength={60} value={value?.label ?? ""} error={errors.label ?? errors[""]} onChange={(event) => onChange({ label: event.target.value, href: value?.href ?? "" })} />
          <TextInput
            label="Link"
            required
            maxLength={300}
            placeholder="/shop/gold-jewellery"
            hint="A site path such as /collection/bridal-heritage, or a full https:// URL."
            value={value?.href ?? ""}
            error={errors.href}
            onChange={(event) => onChange({ label: value?.label ?? "", href: event.target.value })}
          />
        </div>
      )}
    </fieldset>
  );
}

/** Display order + active toggle shared by orderable items. */
export function OrderActiveFields({ displayOrder, active, onChange, errors = {} }: { displayOrder: number; active: boolean; onChange: (patch: { displayOrder?: number; active?: boolean }) => void; errors?: FieldErrors }) {
  return (
    <>
      <NumberInput label="Display order" min={0} max={1000} step={1} value={displayOrder} error={errors.displayOrder} hint="Lower numbers show first." onChange={(event) => onChange({ displayOrder: toDisplayOrder(event.target.value) })} />
      <div className="flex items-end pb-2">
        <CheckboxInput label="Active" description="Inactive items are hidden on the website." checked={active} onChange={(event) => onChange({ active: event.target.checked })} />
      </div>
    </>
  );
}

/** Editorial content block (eyebrow, title, description, images, CTA, order, active). */
export function ContentBlockEditor({ value, onChange, errors = {}, titleMax = 160 }: { value: ContentBlock; onChange: (value: ContentBlock) => void; errors?: FieldErrors; titleMax?: number }) {
  const set = (patch: Partial<ContentBlock>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextInput label="Eyebrow" maxLength={80} value={value.eyebrow ?? ""} error={errors.eyebrow} hint="Short line above the title." onChange={(event) => set({ eyebrow: event.target.value })} />
      <TextInput label="Title" required maxLength={titleMax} value={value.title} error={errors.title} onChange={(event) => set({ title: event.target.value })} />
      <TextArea label="Description" rows={3} maxLength={600} containerClassName="sm:col-span-2" value={value.description ?? ""} error={errors.description} onChange={(event) => set({ description: event.target.value })} />
      <ImageField label="Image" value={value.image} error={errorAt(errors, "image")} onChange={(image) => set({ image })} />
      <ImageField label="Mobile image" hint="Optional portrait crop for phones. The main image is used when empty." value={value.mobileImage} error={errorAt(errors, "mobileImage")} onChange={(mobileImage) => set({ mobileImage })} />
      <CtaField label="Button" optional value={value.cta} errors={scopeErrors(errors, "cta")} onChange={(cta) => set({ cta })} />
      <OrderActiveFields displayOrder={value.displayOrder} active={value.active} errors={errors} onChange={(patch) => set(patch)} />
    </div>
  );
}
