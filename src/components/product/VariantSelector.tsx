"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { cn, formatINR } from "@/lib/utils";
import type { Product, ProductDesignVariant } from "@/types/catalog";

/**
 * Options of a design that the API groups under one parent product. Entries
 * without a slug or label (e.g. an older API response) are ignored.
 */
export function designVariants(product: Pick<Product, "variants">): ProductDesignVariant[] {
  return (product.variants ?? []).filter((variant) => Boolean(variant?.slug && variant.label));
}

const soldOut = (variant: ProductDesignVariant) => variant.availability.status === "out_of_stock" || variant.availability.status === "unavailable";

/**
 * Radio group for switching between the options of one design. Each option is
 * its own product, so choosing one opens that product's page (without jumping
 * the scroll position) — or, when `onSelect` is given, lets the caller decide.
 */
export function VariantSelector({
  variants,
  currentId,
  onSelect,
  className,
}: {
  variants: ProductDesignVariant[];
  currentId: string;
  onSelect?: (variant: ProductDesignVariant) => void;
  className?: string;
}) {
  const router = useRouter();
  const labelId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = variants.find((variant) => variant.id === currentId);
  const focusIndex = Math.max(0, variants.findIndex((variant) => variant.id === currentId));

  const prefetch = !onSelect && variants.length >= 2 ? variants.map((variant) => variant.slug).join("|") : "";

  // Warm up the other options so switching feels instant.
  useEffect(() => {
    if (!prefetch) return;
    for (const slug of prefetch.split("|")) router.prefetch(`/product/${slug}`);
  }, [prefetch, router]);

  if (variants.length < 2) return null;

  function choose(variant: ProductDesignVariant) {
    if (variant.id === currentId) return;
    if (onSelect) onSelect(variant);
    else router.push(`/product/${variant.slug}`, { scroll: false });
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = variants.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    // Focus moves with the arrow keys; Enter or Space opens the option, so
    // browsing the list doesn't load a new page on every key press.
    event.preventDefault();
    buttons.current[next]?.focus();
  }

  return (
    <div className={className}>
      <p id={labelId} className="mb-3 type-caption tracking-[0.16em] text-ink-soft">
        Options{current && <span className="ml-2 normal-case tracking-normal text-muted">— {current.label}</span>}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {variants.map((variant, index) => {
          const selected = variant.id === currentId;
          const unavailable = soldOut(variant);
          return (
            <button
              key={variant.id}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => choose(variant)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "flex min-h-14 flex-col items-start justify-center border px-3 py-2 text-left transition-colors duration-200",
                "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink",
                selected ? "border-ink bg-ink text-ivory" : "border-line text-ink hover:border-ink",
              )}
            >
              <span className={cn("type-body-sm font-medium", unavailable && !selected && "text-muted")}>{variant.label}</span>
              <span className={cn("mt-0.5 text-[0.75rem] tabular-nums", selected ? "text-ivory/75" : "text-muted")}>
                {typeof variant.price === "number" ? formatINR(variant.price) : "Price on request"}
                {unavailable && " · Out of stock"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
