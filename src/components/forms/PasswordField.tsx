"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { EyeIcon } from "@/components/icons";
import { FieldShell, inputStyles } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

export function PasswordField({
  label,
  error,
  hint,
  id,
  required,
  className,
  containerClassName,
  ...props
}: { label: ReactNode; error?: string; hint?: ReactNode; containerClassName?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell id={fieldId} label={label} required={required} error={error} hint={hint} className={containerClassName}>
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={inputStyles(!!error, cn("h-12 pr-12", className))}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted transition-colors hover:text-ink"
        >
          <EyeIcon size={18} className={visible ? "text-ink" : undefined} />
        </button>
      </div>
    </FieldShell>
  );
}
