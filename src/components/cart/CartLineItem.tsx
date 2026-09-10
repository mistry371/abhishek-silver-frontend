"use client";

import Image from "next/image";
import Link from "next/link";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { MAX_LINE_QUANTITY } from "@/lib/cart";
import { metalPurityLabel } from "@/lib/catalog/filters";
import { cn, formatINR, formatWeight } from "@/lib/utils";
import type { CartItem } from "@/types/commerce";

export function CartLineItem({
  item,
  busy = false,
  onQuantityChange,
  onRemove,
  onMoveToWishlist,
  onNavigate,
  variant = "drawer",
}: {
  item: CartItem;
  busy?: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onMoveToWishlist?: () => void;
  onNavigate?: () => void;
  variant?: "drawer" | "page";
}) {
  const { product } = item;
  const href = `/product/${item.slug}`;
  const sizeLabel = item.size ? product.sizes.find((s) => s.value === item.size)?.label ?? item.size : null;
  const unavailable = !item.availability.purchasable;
  const customizations = Object.entries(item.customization ?? {}).map(([key, value]) => ({
    label: product.customization.find((option) => option.id === key)?.label ?? key,
    value,
  }));
  const isPage = variant === "page";

  return (
    <li className={cn("relative flex gap-4 py-6 transition-opacity duration-300 md:gap-6", busy && "opacity-60")} aria-busy={busy}>
      <Link
        href={href}
        onClick={onNavigate}
        className={cn("relative block shrink-0 overflow-hidden bg-cream", isPage ? "h-36 w-28 md:h-44 md:w-36" : "h-[7.5rem] w-24")}
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image src={product.images[0].url} alt="" fill sizes="144px" className={cn("object-cover", unavailable && "grayscale")} />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">{metalPurityLabel(product.metal, product.purity)}</p>
            <h3 className={cn("mt-1 font-serif leading-snug text-ink", isPage ? "text-[1.3rem]" : "text-[1.08rem]")}>
              <Link href={href} onClick={onNavigate} className="transition-colors hover:text-champagne-deep">
                {product.name}
              </Link>
            </h3>
            <p className="mt-1 type-body-sm text-muted">
              {formatWeight(product.grossWeight)}
              {sizeLabel && ` · ${sizeLabel}`}
              {isPage && ` · SKU ${product.sku}`}
            </p>
            {customizations.map((entry) => (
              <p key={entry.label} className="type-body-sm text-muted">
                {entry.label}: <span className="text-ink-soft">“{entry.value}”</span>
              </p>
            ))}
          </div>
          <div className="shrink-0 text-right">
            <p className="type-price tabular-nums">{formatINR(item.lineTotal)}</p>
            {item.quantity > 1 && <p className="type-body-sm text-subtle">{formatINR(item.unitPrice)} each</p>}
          </div>
        </div>

        {unavailable && (
          <p role="alert" className="mt-2 type-body-sm text-danger">
            {item.availability.message ?? "This piece is currently out of stock."} Remove it to continue.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
          <QuantityStepper
            size="sm"
            value={item.quantity}
            max={MAX_LINE_QUANTITY}
            onChange={onQuantityChange}
            disabled={busy || unavailable}
            label={`Quantity for ${product.name}`}
          />
          <div className="flex items-center gap-5">
            {onMoveToWishlist && (
              <button type="button" onClick={onMoveToWishlist} disabled={busy} className="type-caption tracking-[0.14em] text-muted transition-colors hover:text-ink">
                Move to Wishlist
              </button>
            )}
            <button type="button" onClick={onRemove} disabled={busy} className="type-caption tracking-[0.14em] text-muted transition-colors hover:text-ink">
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
