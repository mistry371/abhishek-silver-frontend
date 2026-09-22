"use client";

import { useEffect, useState } from "react";
import { AlertIcon, CloseIcon } from "@/components/icons";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/primitives";
import { getProductBySlug } from "@/lib/api/services/catalog";
import { useUIStore } from "@/stores/ui";
import type { Product } from "@/types/catalog";
import { ProductGallery } from "./ProductGallery";
import { PurchasePanel } from "./PurchasePanel";

type QuickViewState = { status: "loading" } | { status: "ready"; product: Product } | { status: "missing" } | { status: "error" };

export function QuickView() {
  const slug = useUIStore((s) => s.quickViewSlug);
  const close = useUIStore((s) => s.closeQuickView);
  const openQuickView = useUIStore((s) => s.openQuickView);
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${slug}::${attempt}`;
  const [result, setResult] = useState<{ key: string; state: QuickViewState } | null>(null);
  const state: QuickViewState = result?.key === requestKey ? result.state : { status: "loading" };

  useEffect(() => {
    if (!slug) return;
    let active = true;
    getProductBySlug(slug)
      .then((product) => {
        if (active) setResult({ key: requestKey, state: product ? { status: "ready", product } : { status: "missing" } });
      })
      .catch(() => {
        if (active) setResult({ key: requestKey, state: { status: "error" } });
      });
    return () => {
      active = false;
    };
  }, [slug, requestKey]);

  return (
    <Dialog
      open={Boolean(slug)}
      onClose={close}
      variant="responsive-sheet"
      labelledBy={state.status === "ready" ? "quick-view-title" : undefined}
      label={state.status === "ready" ? undefined : "Quick view"}
    >
      <div className="sticky top-0 z-10 flex justify-center bg-porcelain pt-2.5 md:hidden" aria-hidden="true">
        <span className="h-1 w-10 rounded-full bg-line-strong" />
      </div>
      <IconButton label="Close quick view" onClick={close} className="absolute right-2 top-2 z-20 md:right-4 md:top-4">
        <CloseIcon size={22} />
      </IconButton>

      {state.status === "loading" && (
        <div className="grid gap-8 p-5 md:grid-cols-2 md:p-8" aria-busy="true" aria-label="Loading product">
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-9 w-4/5" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      )}

      {(state.status === "error" || state.status === "missing") && (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <AlertIcon size={32} className="text-champagne-deep" />
          <p className="mt-4 type-h3 text-ink">{state.status === "missing" ? "This piece is no longer available" : "We couldn't load this piece"}</p>
          <p className="mt-2 type-body text-muted">
            {state.status === "missing" ? "It may have been moved or retired from the collection." : "Please check your connection and try again."}
          </p>
          <div className="mt-6 flex gap-3">
            {state.status === "error" && (
              <Button variant="outline" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </Button>
            )}
            <ButtonLink href="/shop" onClick={close}>
              Explore the Shop
            </ButtonLink>
          </div>
        </div>
      )}

      {state.status === "ready" && (
        <div className="grid md:grid-cols-2">
          <div className="bg-cream md:p-6">
            <ProductGallery key={state.product.id} images={state.product.images} video={state.product.video} productName={state.product.name} variant="compact" />
          </div>
          <div className="px-5 pb-8 pt-6 md:px-10 md:py-10">
            <PurchasePanel
              key={state.product.id}
              product={state.product}
              variant="quickview"
              onNavigate={close}
              onSelectVariant={(option) => openQuickView(option.slug)}
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}
