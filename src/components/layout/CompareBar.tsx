"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CloseIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { useHydrated } from "@/hooks/useHydrated";
import { MAX_COMPARE_ITEMS, useCompareStore } from "@/stores/compare";

const HIDDEN_ON = ["/compare", "/checkout", "/product/"];

export function CompareBar() {
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const pathname = usePathname();
  const hydrated = useHydrated();
  const visible = hydrated && items.length > 0 && !HIDDEN_ON.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    document.documentElement.classList.toggle("compare-bar-visible", visible);
    return () => document.documentElement.classList.remove("compare-bar-visible");
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Compare pieces"
      className="fixed inset-x-0 z-40 animate-fade-up border-t border-line bg-porcelain/97 shadow-[0_-18px_40px_-36px_rgb(20_18_16/0.5)] backdrop-blur-md transition-[bottom] duration-500"
      style={{ bottom: "var(--mobile-nav-height)" }}
    >
      <div className="container-luxe flex h-[4.25rem] items-center gap-3 md:h-[5.5rem] md:gap-6">
        <p className="hidden shrink-0 type-caption tracking-[0.16em] text-ink md:block">
          Compare <span className="text-muted">({items.length}/{MAX_COMPARE_ITEMS})</span>
        </p>
        <ul className="no-scrollbar flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto py-2 md:gap-3">
          {Array.from({ length: MAX_COMPARE_ITEMS }).map((_, index) => {
            const item = items[index];
            if (!item) {
              return <li key={`empty-${index}`} aria-hidden="true" className="hidden h-16 w-[3.25rem] shrink-0 border border-dashed border-line-strong md:block" />;
            }
            return (
              <li key={item.productId} className="relative h-12 w-10 shrink-0 bg-cream md:h-16 md:w-[3.25rem]">
                <Image src={item.image.url} alt={item.name} fill sizes="52px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => remove(item.productId)}
                  aria-label={`Remove ${item.name} from comparison`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-ivory"
                >
                  <CloseIcon size={10} strokeWidth={2} />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={clear} className="shrink-0 type-caption tracking-[0.14em] text-muted transition-colors hover:text-ink">
          Clear
        </button>
        <ButtonLink href="/compare" size="sm" className="shrink-0">
          Compare{items.length > 1 ? ` (${items.length})` : ""}
        </ButtonLink>
      </div>
    </div>
  );
}
