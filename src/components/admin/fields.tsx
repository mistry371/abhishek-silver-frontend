"use client";

import { useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { adminApi, errorMessage, type ImageAsset } from "@/lib/admin/client";
import { cn } from "@/lib/utils";
import { TrashIcon } from "./icons";
import { AdminButton } from "./ui";

export function controlClass(error?: string, className?: string) {
  return cn(
    "w-full border bg-porcelain px-3 text-[0.875rem] text-ink outline-none transition-colors placeholder:text-subtle focus:border-ink disabled:cursor-not-allowed disabled:bg-cream disabled:text-muted",
    error ? "border-danger" : "border-line hover:border-line-strong",
    className,
  );
}

export function Field({ id, label, error, hint, required, children, className }: { id: string; label: ReactNode; error?: string; hint?: ReactNode; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <label htmlFor={id} className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">
        {label}
        {required && <span className="text-champagne-deep"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-[0.75rem] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Base = { label: ReactNode; error?: string; hint?: ReactNode; containerClassName?: string };

export function TextInput({ label, error, hint, containerClassName, className, id, required, ...props }: Base & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field id={fieldId} label={label} error={error} hint={hint} required={required} className={containerClassName}>
      <input id={fieldId} required={required} aria-invalid={error ? true : undefined} className={controlClass(error, cn("h-10", className))} {...props} />
    </Field>
  );
}

export function TextArea({ label, error, hint, containerClassName, className, id, required, rows = 4, ...props }: Base & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field id={fieldId} label={label} error={error} hint={hint} required={required} className={containerClassName}>
      <textarea id={fieldId} rows={rows} required={required} aria-invalid={error ? true : undefined} className={controlClass(error, cn("resize-y py-2 leading-relaxed", className))} {...props} />
    </Field>
  );
}

export function SelectInput({
  label,
  error,
  hint,
  containerClassName,
  className,
  id,
  required,
  options,
  placeholder,
  ...props
}: Base & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[]; placeholder?: string }) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field id={fieldId} label={label} error={error} hint={hint} required={required} className={containerClassName}>
      <select id={fieldId} required={required} aria-invalid={error ? true : undefined} className={controlClass(error, cn("h-10", className))} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckboxInput({ label, description, className, id, ...props }: { label: ReactNode; description?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <label htmlFor={fieldId} className={cn("flex cursor-pointer items-start gap-2.5", className)}>
      <input id={fieldId} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-ink" {...props} />
      <span className="flex flex-col">
        <span className="text-[0.875rem] text-ink">{label}</span>
        {description && <span className="text-[0.75rem] text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function FormSection({ title, description, children, className }: { title: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("border border-line bg-porcelain", className)}>
      <div className="border-b border-line px-5 py-3.5">
        <h2 className="text-[0.9375rem] font-medium text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[0.8125rem] text-muted">{description}</p>}
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** Number field that keeps the raw text while typing; parse with `toNumberOrNull`. */
export function NumberInput(props: Base & InputHTMLAttributes<HTMLInputElement>) {
  return <TextInput type="number" inputMode="decimal" step="any" {...props} />;
}

export const toNumberOrNull = (value: string) => (value.trim() === "" || Number.isNaN(Number(value)) ? null : Number(value));

/** Uploads images to the media library and edits alt text / order. */
export function ImagesInput({ label = "Images", value, onChange, max = 12, error }: { label?: string; value: ImageAsset[]; onChange: (images: ImageAsset[]) => void; max?: number; error?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    const added: ImageAsset[] = [];
    try {
      for (const file of Array.from(files).slice(0, max - value.length)) {
        const form = new FormData();
        form.append("file", file);
        const result = await adminApi.upload<{ url: string }>("/media", form, { kind: "image" });
        added.push({ url: result.url, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") });
      }
    } catch (caught) {
      setUploadError(errorMessage(caught));
    } finally {
      if (added.length) onChange([...value, ...added]);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const move = (index: number, delta: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.75rem] font-medium text-ink-soft">{label}</span>
        <AdminButton size="sm" onClick={() => inputRef.current?.click()} loading={uploading} disabled={value.length >= max}>
          Upload
        </AdminButton>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(event) => upload(event.target.files)} />
      </div>
      {value.length === 0 ? (
        <p className="border border-dashed border-line px-4 py-6 text-center text-[0.8125rem] text-muted">No images yet. The first image is used as the main photo.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((image, index) => (
            <li key={`${image.url}-${index}`} className="border border-line bg-ivory p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt={image.alt} className="aspect-[4/5] w-full bg-cream object-cover" />
              <input
                aria-label={`Alt text for image ${index + 1}`}
                value={image.alt}
                placeholder="Describe the image"
                onChange={(event) => onChange(value.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)))}
                className={controlClass(undefined, "mt-2 h-8 text-[0.8125rem]")}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1">
                  <AdminButton size="sm" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move earlier">
                    ←
                  </AdminButton>
                  <AdminButton size="sm" variant="ghost" disabled={index === value.length - 1} onClick={() => move(index, 1)} aria-label="Move later">
                    →
                  </AdminButton>
                </div>
                <AdminButton size="sm" variant="ghost" onClick={() => onChange(value.filter((_, i) => i !== index))} aria-label="Remove image">
                  <TrashIcon size={14} />
                </AdminButton>
              </div>
            </li>
          ))}
        </ul>
      )}
      {(uploadError || error) && (
        <p role="alert" className="mt-1 text-[0.75rem] text-danger">
          {uploadError ?? error}
        </p>
      )}
    </div>
  );
}
