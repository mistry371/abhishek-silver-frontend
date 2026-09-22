"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EyeIcon } from "@/components/icons";
import { Badge, badgePriority, Price, Skeleton } from "@/components/ui/primitives";
import { metalPurityLabel } from "@/lib/catalog/filters";
import { cn, formatINR, formatWeight } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";
import type { ProductSummary } from "@/types/catalog";
import { cardIconButtonClass, CompareButton, WishlistButton } from "./ProductActions";

const availabilityNote: Record<string, string | null> = {
  in_stock: null,
  low_stock: "Only a few left",
  out_of_stock: "Out of stock",
  unavailable: "Currently unavailable",
};

export interface ProductCardProps {
  product: ProductSummary;
  priority?: boolean;
  sizes?: string;
  layout?: "grid" | "list";
  headingLevel?: 2 | 3;
  className?: string;
}

export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw",
  layout = "grid",
  headingLevel = 3,
  className,
}: ProductCardProps) {
  const [primary, secondary] = product.images;
  const [hovered, setHovered] = useState(false);
  const openQuickView = useUIStore((s) => s.openQuickView);
  const href = `/product/${product.slug}`;
  const Heading = `h${headingLevel}` as "h2" | "h3";
  const badges = badgePriority.filter((badge) => product.badges.includes(badge)).slice(0, 2);
  const original = product.pricing.originalPrice > product.finalPrice ? product.pricing.originalPrice : undefined;
  const note = availabilityNote[product.availability.status];
  const { variantCount = 0, priceFrom: lowest, priceTo: highest } = product.parent ?? {};
  const optionCount = variantCount >= 2 ? variantCount : 0;
  const priceFrom = optionCount && typeof lowest === "number" && typeof highest === "number" && lowest < highest ? lowest : null;
  const optionsNote = optionCount > 0 ? `${optionCount} options` : null;

  const media = (
    <div
      className="relative aspect-[4/5] overflow-hidden bg-cream"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
    >
      <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
        {primary && (
          <Image
            src={primary.url}
            alt={primary.alt}
            fill
            sizes={sizes}
            priority={priority}
            className={cn(
              "object-cover transition-[transform,opacity] duration-[900ms] ease-luxe group-hover:scale-[1.035]",
              secondary && hovered && "group-hover:opacity-0",
            )}
          />
        )}
        {secondary && hovered && (
          <Image
            src={secondary.url}
            alt=""
            fill
            sizes={sizes}
            className="object-cover opacity-0 transition-opacity duration-[900ms] ease-luxe group-hover:opacity-100"
          />
        )}
      </Link>

      {badges.length > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {badges.map((badge) => (
            <Badge key={badge} badge={badge} />
          ))}
        </div>
      )}

      <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5">
        <WishlistButton product={product} />
        <CompareButton
          product={product}
          className="transition-opacity duration-300 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100 pointer-coarse:opacity-100"
        />
        <button
          type="button"
          onClick={() => openQuickView(product.slug)}
          aria-label={`Quick view ${product.name}`}
          className={cn(cardIconButtonClass, "lg:hidden pointer-coarse:flex")}
        >
          <EyeIcon size={17} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => openQuickView(product.slug)}
        className="absolute inset-x-3 bottom-3 hidden h-11 translate-y-2 items-center justify-center bg-porcelain/95 type-button text-ink opacity-0 backdrop-blur-sm transition-[opacity,transform,background-color,color] duration-400 ease-luxe hover:bg-ink hover:text-ivory focus-visible:translate-y-0 focus-visible:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 lg:flex pointer-coarse:hidden"
      >
        Quick View
      </button>
    </div>
  );

  if (layout === "list") {
    return (
      <article className={cn("group grid grid-cols-[8.5rem_1fr] gap-5 sm:grid-cols-[12rem_1fr] md:grid-cols-[14rem_1fr_auto] md:gap-8", className)}>
        {media}
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">
            {metalPurityLabel(product.metal, product.purity)} · {product.category.name}
          </p>
          <Heading className="mt-2 type-product-title text-ink md:text-[1.4rem]">
            <Link href={href} className="transition-colors hover:text-champagne-deep">
              {product.name}
            </Link>
          </Heading>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 type-body-sm text-muted">
            <div className="flex gap-1.5">
              <dt>Gross wt.</dt>
              <dd className="text-ink-soft">{formatWeight(product.grossWeight)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Making</dt>
              <dd className="text-ink-soft">{formatINR(product.makingCharges)}</dd>
            </div>
          </dl>
          {priceFrom !== null ? (
            <p className="mt-3 type-price text-ink">
              <span className="text-[0.8125rem] text-muted">From </span>
              {formatINR(priceFrom)}
            </p>
          ) : (
            <Price amount={product.finalPrice} original={original} className="mt-3" />
          )}
          {optionsNote && <p className="mt-1.5 type-body-sm text-muted">{optionsNote}</p>}
          {note && <p className="mt-1.5 type-body-sm text-muted">{note}</p>}
          <div className="mt-5 flex flex-wrap gap-3 md:hidden">
            <Link href={href} className="type-button link-underline-static">
              View Details
            </Link>
          </div>
        </div>
        <div className="hidden flex-col items-end justify-center gap-3 md:flex">
          <button
            type="button"
            onClick={() => openQuickView(product.slug)}
            className="h-11 border border-ink/80 px-6 type-button text-ink transition-colors hover:bg-ink hover:text-ivory"
          >
            Quick View
          </button>
          <Link href={href} className="type-button link-underline-static">
            View Details
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className={cn("group relative flex flex-col", className)}>
      {media}
      <div className="flex flex-1 flex-col pt-4">
        <p className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">{metalPurityLabel(product.metal, product.purity)}</p>
        <Heading className="mt-1.5 type-product-title text-ink">
          <Link href={href} className="transition-colors duration-300 hover:text-champagne-deep">
            {product.name}
          </Link>
        </Heading>
        {priceFrom !== null ? (
          <p className="mt-2 text-[0.875rem] font-medium tabular-nums text-ink">
            <span className="font-normal text-muted">From </span>
            {formatINR(priceFrom)}
          </p>
        ) : (
          <Price amount={product.finalPrice} original={original} size="sm" showSavings={false} className="mt-2" />
        )}
        {optionsNote && <p className="mt-1 text-[0.75rem] text-muted">{optionsNote}</p>}
        {note && <p className="mt-1 type-body-sm text-muted">{note}</p>}
      </div>
    </article>
  );
}

export function ProductCardSkeleton({ layout = "grid" }: { layout?: "grid" | "list" }) {
  if (layout === "list") {
    return (
      <div className="grid grid-cols-[8.5rem_1fr] gap-5 sm:grid-cols-[12rem_1fr] md:grid-cols-[14rem_1fr] md:gap-8" aria-hidden="true">
        <Skeleton className="aspect-[4/5] w-full" />
        <div className="flex flex-col justify-center gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    );
  }
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-[4/5] w-full" />
      <Skeleton className="mt-4 h-2.5 w-16" />
      <Skeleton className="mt-2.5 h-5 w-4/5" />
      <Skeleton className="mt-2.5 h-4 w-1/3" />
    </div>
  );
}
