"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ProductSummary } from "@/types/catalog";
import type { ComparisonItem } from "@/types/commerce";

export const MAX_COMPARE_ITEMS = 4;

export function toComparisonItem(product: ProductSummary): ComparisonItem {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0],
    sku: product.sku,
    metal: product.metal,
    purity: product.purity,
    grossWeight: product.grossWeight,
    netWeight: product.netWeight,
    makingCharges: product.makingCharges,
    finalPrice: product.finalPrice,
    availability: product.availability,
  };
}

interface CompareState {
  items: ComparisonItem[];
  toggle: (product: ProductSummary) => "added" | "removed" | "full";
  remove: (productId: string) => void;
  replaceAll: (items: ComparisonItem[]) => void;
  clear: () => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      toggle(product) {
        const items = get().items;
        if (items.some((item) => item.productId === product.id)) {
          set({ items: items.filter((item) => item.productId !== product.id) });
          return "removed";
        }
        if (items.length >= MAX_COMPARE_ITEMS) return "full";
        set({ items: [...items, toComparisonItem(product)] });
        return "added";
      },
      remove(productId) {
        set({ items: get().items.filter((item) => item.productId !== productId) });
      },
      replaceAll(items) {
        set({ items });
      },
      clear() {
        set({ items: [] });
      },
    }),
    {
      name: "storefront-compare",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

export function useIsCompared(productId: string) {
  return useCompareStore((state) => state.items.some((item) => item.productId === productId));
}
