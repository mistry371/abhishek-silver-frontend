"use client";

import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { AlertIcon, CheckIcon, ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function inputStyles(hasError?: boolean, className?: string) {
  return cn(
    "block w-full border bg-porcelain px-4 type-body text-ink placeholder:text-subtle outline-none",
    "transition-[border-color,box-shadow] duration-200",
    "focus:border-ink focus:shadow-[0_0_0_1px_var(--color-ink)] focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:bg-cream disabled:text-muted",
    hasError ? "border-danger" : "border-line hover:border-line-strong",
    className,
  );
}

interface FieldShellProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  labelHidden?: boolean;
  children: ReactNode;
}

export function FieldShell({ id, label, required, optional, error, hint, className, labelHidden, children }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <label htmlFor={id} className={cn("mb-2 type-caption tracking-[0.16em] text-ink-soft", labelHidden && "sr-only")}>
        {label}
        {required && (
          <span className="text-champagne-deep" aria-hidden="true">
            {" "}
            *
          </span>
        )}
        {optional && <span className="normal-case tracking-normal text-subtle"> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-2 type-body-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-start gap-1.5 type-body-sm text-danger">
          <AlertIcon size={15} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type BaseFieldProps = {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  labelHidden?: boolean;
  containerClassName?: string;
};

export function TextField({
  label,
  error,
  hint,
  optional,
  labelHidden,
  containerClassName,
  className,
  id,
  required,
  ...props
}: BaseFieldProps & InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      labelHidden={labelHidden}
      className={containerClassName}
    >
      <input
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={inputStyles(!!error, cn("h-12", className))}
        {...props}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  optional,
  labelHidden,
  containerClassName,
  className,
  id,
  required,
  rows = 5,
  ...props
}: BaseFieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      labelHidden={labelHidden}
      className={containerClassName}
    >
      <textarea
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={inputStyles(!!error, cn("resize-y py-3 leading-relaxed", className))}
        {...props}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  labelHidden,
  containerClassName,
  className,
  id,
  required,
  options,
  placeholder,
  ...props
}: BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: { value: string; label: string }[];
    placeholder?: string;
  }) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      optional={optional}
      error={error}
      hint={hint}
      labelHidden={labelHidden}
      className={containerClassName}
    >
      <div className="relative">
        <select
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={inputStyles(!!error, cn("h-12 appearance-none pr-10", className))}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  description,
  error,
  className,
  id,
  ...props
}: { label: ReactNode; description?: ReactNode; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="group flex cursor-pointer items-start gap-3">
        <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          <input
            id={fieldId}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none border border-line-strong bg-porcelain transition-colors checked:border-ink checked:bg-ink focus-visible:outline-offset-2"
            {...props}
          />
          <CheckIcon size={12} strokeWidth={2} className="pointer-events-none relative text-ivory opacity-0 peer-checked:opacity-100" />
        </span>
        <span className="flex flex-col">
          <span className="type-body-sm text-ink-soft">{label}</span>
          {description && <span className="type-body-sm text-muted">{description}</span>}
        </span>
      </label>
      {error && (
        <p id={`${fieldId}-error`} role="alert" className="mt-2 type-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export interface RadioOption {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function RadioGroupField({
  legend,
  name,
  value,
  onChange,
  options,
  error,
  layout = "stack",
  legendHidden,
  className,
}: {
  legend: ReactNode;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  error?: string;
  layout?: "stack" | "inline" | "cards";
  legendHidden?: boolean;
  className?: string;
}) {
  const groupId = useId();
  return (
    <fieldset className={className} aria-describedby={error ? `${groupId}-error` : undefined}>
      <legend className={cn("mb-3 type-caption tracking-[0.16em] text-ink-soft", legendHidden && "sr-only")}>{legend}</legend>
      <div
        className={cn(
          layout === "stack" && "flex flex-col gap-3",
          layout === "inline" && "flex flex-wrap gap-x-6 gap-y-3",
          layout === "cards" && "grid gap-3 sm:grid-cols-2",
        )}
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                "flex cursor-pointer items-start gap-3",
                layout === "cards" &&
                  "border px-4 py-4 transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-ink",
                layout === "cards" && (checked ? "border-ink bg-porcelain" : "border-line hover:border-line-strong"),
                option.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="relative mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                <input
                  id={optionId}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={checked}
                  disabled={option.disabled}
                  onChange={() => onChange(option.value)}
                  className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-full border border-line-strong bg-porcelain checked:border-ink"
                />
                <span className="pointer-events-none relative h-2 w-2 rounded-full bg-ink opacity-0 peer-checked:opacity-100" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="type-body-sm text-ink">{option.label}</span>
                {option.description && <span className="type-body-sm text-muted">{option.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id={`${groupId}-error`} role="alert" className="mt-2 type-body-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Small inline status message used under forms. */
export function FormMessage({ tone, children, className }: { tone: "error" | "success" | "info"; children: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 border px-4 py-3.5 type-body-sm",
        tone === "error" && "border-danger/30 bg-danger/5 text-danger",
        tone === "success" && "border-success/30 bg-success/5 text-success",
        tone === "info" && "border-line bg-cream text-ink-soft",
        className,
      )}
    >
      {children}
    </div>
  );
}
