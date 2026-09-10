"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { CompareIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AvailabilityLabel, EmptyState, Skeleton } from "@/components/ui/primitives";
import { compareProducts } from "@/lib/api/services/catalog";
import { metalLabels, purityFineness, purityLabels } from "@/lib/catalog/filters";
import { cn, formatINR, formatWeight } from "@/lib/utils";
import { MAX_COMPARE_ITEMS, useCompareStore } from "@/stores/compare";
import { usePersistHydrated } from "@/stores/hydration";
import type { ComparisonItem } from "@/types/commerce";

const rows: { label: string; render: (item: ComparisonItem) => ReactNode }[] = [
  { label: "Price", render: (item) => <span className="font-medium tabular-nums">{formatINR(item.finalPrice)}</span> },
  { label: "Metal", render: (item) => metalLabels[item.metal] },
  { label: "Purity", render: (item) => `${purityLabels[item.purity]} (${purityFineness[item.purity]})` },
  { label: "Gross weight", render: (item) => formatWeight(item.grossWeight) },
  { label: "Net weight", render: (item) => formatWeight(item.netWeight) },
  { label: "Making charges", render: (item) => formatINR(item.makingCharges) },
  { label: "Availability", render: (item) => <AvailabilityLabel status={item.availability.status} /> },
  { label: "SKU", render: (item) => item.sku },
];

export function CompareView() {
  const hydrated = usePersistHydrated(useCompareStore);
  const items = useCompareStore((s) => s.items);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const replaceAll = useCompareStore((s) => s.replaceAll);
  const [fetched, setFetched] = useState<{ key: string; status: "ready" | "error" } | null>(null);
  const idKey = items.map((item) => item.productId).join(",");
  const status = !idKey ? "idle" : fetched?.key === idKey ? fetched.status : "loading";

  useEffect(() => {
    if (!hydrated || !idKey) return;
    let active = true;
    compareProducts(idKey.split(","))
      .then((fresh) => {
        if (!active) return;
        replaceAll(fresh);
        setFetched({ key: fresh.map((item) => item.productId).join(","), status: "ready" });
      })
      .catch(() => {
        if (active) setFetched({ key: idKey, status: "error" });
      });
    return () => {
      active = false;
    };
  }, [hydrated, idKey, replaceAll]);

  if (!hydrated) {
    return <Skeleton className="h-[32rem] w-full" />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CompareIcon}
        title="Nothing to compare yet"
        description={`Tap the compare icon on any piece to add it here — up to ${MAX_COMPARE_ITEMS} at a time.`}
        className="border border-line bg-porcelain px-6"
      >
        <ButtonLink href="/shop">Explore the Collection</ButtonLink>
      </EmptyState>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="type-body-sm text-muted" aria-live="polite">
          {status === "loading" ? "Refreshing prices and availability…" : `Comparing ${items.length} of ${MAX_COMPARE_ITEMS} pieces`}
          {status === "error" && " — showing saved details; live prices couldn't be refreshed."}
        </p>
        <Button variant="link" onClick={clear}>
          Clear all
        </Button>
      </div>
      {items.length === 1 && <p className="mb-6 type-body text-ink-soft">Add at least one more piece to compare side by side.</p>}

      <div className={cn("overflow-x-auto border border-line bg-porcelain transition-opacity", status === "loading" && "opacity-70")}>
        <table className="w-full min-w-[36rem] border-collapse text-left">
          <caption className="sr-only">Comparison of {items.length} pieces</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-32 bg-porcelain p-4 align-bottom type-caption tracking-[0.16em] text-muted md:w-44">
                Piece
              </th>
              {items.map((item) => (
                <th key={item.productId} scope="col" className="min-w-[12rem] border-l border-line p-4 align-top font-normal">
                  <Link href={`/product/${item.slug}`} className="group block">
                    <div className="relative aspect-[4/5] w-full max-w-[12rem] overflow-hidden bg-cream">
                      <Image src={item.image.url} alt="" fill sizes="192px" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <span className="mt-3 block font-serif text-lg leading-snug text-ink group-hover:text-champagne-deep">{item.name}</span>
                  </Link>
                  <button type="button" onClick={() => remove(item.productId)} className="mt-2 type-caption tracking-[0.14em] text-muted hover:text-ink">
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-porcelain p-4 type-caption tracking-[0.14em] text-muted">
                  {row.label}
                </th>
                {items.map((item) => (
                  <td key={item.productId} className="border-l border-line p-4 type-body-sm text-ink">
                    {row.render(item)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-line">
              <th scope="row" className="sticky left-0 z-10 bg-porcelain p-4">
                <span className="sr-only">Actions</span>
              </th>
              {items.map((item) => (
                <td key={item.productId} className="border-l border-line p-4">
                  <ButtonLink href={`/product/${item.slug}`} size="sm" variant="outline">
                    View Details
                  </ButtonLink>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
