"use client";

import { CompareIcon, HeartIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { useHydrated } from "@/hooks/useHydrated";
import { toUserMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { MAX_COMPARE_ITEMS, useCompareStore, useIsCompared } from "@/stores/compare";
import { useIsWishlisted, useWishlistStore } from "@/stores/wishlist";
import type { ProductSummary } from "@/types/catalog";

export const cardIconButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-full bg-porcelain/90 text-ink backdrop-blur-sm transition-colors duration-300 hover:bg-ink hover:text-ivory disabled:opacity-60";

const squareButtonClass =
  "flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-porcelain text-ink transition-colors duration-300 hover:border-ink";

type ActionVariant = "card" | "square";

export function WishlistButton({ product, variant = "card", className }: { product: ProductSummary; variant?: ActionVariant; className?: string }) {
  const hydrated = useHydrated();
  const wishlisted = useIsWishlisted(product.id) && hydrated;
  const toggle = useWishlistStore((s) => s.toggle);
  const pending = useWishlistStore((s) => s.pendingIds.includes(product.id));

  async function onClick() {
    try {
      const result = await toggle(product);
      toast(
        result === "added"
          ? { title: "Added to wishlist", description: product.name, tone: "success", action: { label: "View wishlist", href: "/wishlist" } }
          : { title: "Removed from wishlist", description: product.name },
      );
    } catch (error) {
      toast({ title: "Couldn't update your wishlist", description: toUserMessage(error), tone: "error" });
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
      title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(variant === "card" ? cardIconButtonClass : squareButtonClass, wishlisted && "text-champagne-deep", className)}
    >
      <HeartIcon size={variant === "card" ? 17 : 20} fill={wishlisted ? "currentColor" : "none"} />
    </button>
  );
}

export function CompareButton({
  product,
  variant = "card",
  className,
  withLabel = false,
}: {
  product: ProductSummary;
  variant?: ActionVariant | "text";
  className?: string;
  withLabel?: boolean;
}) {
  const hydrated = useHydrated();
  const compared = useIsCompared(product.id) && hydrated;
  const toggle = useCompareStore((s) => s.toggle);

  function onClick() {
    const result = toggle(product);
    if (result === "full") {
      toast({
        title: `You can compare up to ${MAX_COMPARE_ITEMS} pieces`,
        description: "Remove a piece to add another.",
        tone: "error",
        action: { label: "View comparison", href: "/compare" },
      });
    } else if (result === "added") {
      toast({ title: "Added to compare", description: product.name, action: { label: "Compare now", href: "/compare" } });
    }
  }

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={compared}
        className={cn("inline-flex items-center gap-2 type-caption tracking-[0.16em] text-ink-soft transition-colors hover:text-ink", className)}
      >
        <CompareIcon size={16} />
        {compared ? "Added to compare" : "Compare"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={compared}
      aria-label={compared ? `Remove ${product.name} from comparison` : `Compare ${product.name}`}
      title={compared ? "Remove from compare" : "Compare"}
      className={cn(variant === "card" ? cardIconButtonClass : squareButtonClass, compared && "bg-ink text-ivory", className)}
    >
      <CompareIcon size={variant === "card" ? 16 : 19} />
      {withLabel && <span className="sr-only">Compare</span>}
    </button>
  );
}
