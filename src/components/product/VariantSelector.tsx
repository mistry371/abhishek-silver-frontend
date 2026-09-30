"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { CheckIcon, ImageOffIcon } from "@/components/icons";
import { cn, formatINR } from "@/lib/utils";
import type { Product, ProductDesignVariant } from "@/types/catalog";

/**
 * The sub-products of this product's group, including the product itself.
 * Entries without a slug or a name (e.g. an older API response) are ignored.
 */
export function designVariants(product: Pick<Product, "variants">): ProductDesignVariant[] {
  return (product.variants ?? []).filter((variant) => Boolean(variant?.slug && (variant.name || variant.label)));
}

const soldOut = (variant: ProductDesignVariant) => variant.availability.status === "out_of_stock" || variant.availability.status === "unavailable";
const cardName = (variant: ProductDesignVariant) => variant.name || variant.label;

/** Above this many options the grid scrolls instead of growing down the page. */
const SCROLL_FROM = 9;

/**
 * Picture cards for switching between the sub-products of one product. Each
 * card is its own product, so choosing one opens that product's page (without
 * jumping the scroll position) — or, when `onSelect` is given, lets the caller
 * decide (the quick view reloads itself in place).
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
  const listRef = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const current = variants.find((variant) => variant.id === currentId);
  const focusIndex = Math.max(0, variants.findIndex((variant) => variant.id === currentId));
  const scrolls = variants.length > SCROLL_FROM;

  const prefetch = !onSelect && variants.length >= 2 ? variants.map((variant) => variant.slug).join("|") : "";

  // Warm up the other options so switching feels instant.
  useEffect(() => {
    if (!prefetch) return;
    for (const slug of prefetch.split("|")) router.prefetch(`/product/${slug}`);
  }, [prefetch, router]);

  // Bring the chosen card into view inside the scroll area, never moving the page.
  useEffect(() => {
    const list = listRef.current;
    const card = cards.current[focusIndex];
    if (!list || !card || list.scrollHeight <= list.clientHeight) return;
    const top = card.offsetTop - list.offsetTop;
    if (top < list.scrollTop || top + card.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = Math.max(0, top - (list.clientHeight - card.offsetHeight) / 2);
    }
  }, [focusIndex]);

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
    cards.current[next]?.focus();
  }

  return (
    <div className={className}>
      <p id={labelId} className="mb-3 type-caption tracking-[0.16em] text-ink-soft">
        Options <span className="text-muted">({variants.length})</span>
        {current && <span className="ml-2 normal-case tracking-normal text-muted">— {cardName(current)}</span>}
      </p>
      <div
        ref={listRef}
        role="radiogroup"
        aria-labelledby={labelId}
        className={cn("grid grid-cols-3 gap-2 sm:grid-cols-4", scrolls && "max-h-[21rem] overflow-y-auto overscroll-contain border border-line p-2")}
      >
        {variants.map((variant, index) => {
          const selected = variant.id === currentId;
          const unavailable = soldOut(variant);
          const name = cardName(variant);
          return (
            <button
              key={variant.id}
              ref={(element) => {
                cards.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${name}${typeof variant.price === "number" ? `, ${formatINR(variant.price)}` : ""}${unavailable ? ", out of stock" : ""}`}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => choose(variant)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "group relative flex flex-col border bg-porcelain text-left transition-colors duration-200",
                "focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink",
                selected ? "border-ink shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line hover:border-ink",
              )}
            >
              <span className="relative block aspect-[4/5] w-full overflow-hidden bg-cream">
                {variant.image ? (
                  <Image
                    src={variant.image.url}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 160px, 33vw"
                    className={cn("object-cover transition-opacity duration-200", unavailable && !selected && "opacity-60")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-subtle" aria-hidden="true">
                    <ImageOffIcon size={18} />
                  </span>
                )}
                {selected && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center bg-ink text-ivory" aria-hidden="true">
                    <CheckIcon size={12} />
                  </span>
                )}
                {unavailable && (
                  <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-0.5 text-center text-[0.5625rem] uppercase tracking-[0.12em] text-ivory">Out of stock</span>
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-2">
                <span className={cn("line-clamp-2 text-[0.75rem] leading-snug", selected ? "font-medium text-ink" : "text-ink-soft")} title={name}>
                  {name}
                </span>
                <span className="text-[0.6875rem] tabular-nums text-muted">{typeof variant.price === "number" ? formatINR(variant.price) : "On request"}</span>
              </span>
            </button>
          );
        })}
      </div>
      {scrolls && <p className="mt-2 text-[0.75rem] text-muted">Scroll the list to see every option.</p>}
    </div>
  );
}
