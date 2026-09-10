"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  label = "Quantity",
  size = "md",
  disabled = false,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}) {
  const buttonClass = cn(
    "flex h-full items-center justify-center text-ink transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:text-subtle disabled:hover:bg-transparent",
    size === "md" ? "w-11" : "w-9",
  );
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-stretch border border-line bg-porcelain", size === "md" ? "h-12" : "h-10", className)}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon size={14} />
      </button>
      <output aria-live="polite" className={cn("flex items-center justify-center tabular-nums type-price", size === "md" ? "w-10" : "w-8")}>
        {value}
      </output>
      <button
        type="button"
        className={buttonClass}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Increase quantity"
      >
        <PlusIcon size={14} />
      </button>
    </div>
  );
}
