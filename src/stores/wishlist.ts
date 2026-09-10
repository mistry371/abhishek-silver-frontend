"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addToWishlist, mergeWishlist, removeFromWishlist } from "@/lib/api/services/commerce";
import type { ProductSummary } from "@/types/catalog";
import type { WishlistItem } from "@/types/commerce";
import { getAuthToken } from "./auth";

interface WishlistState {
  items: WishlistItem[];
  pendingIds: string[];
  toggle: (product: ProductSummary) => Promise<"added" | "removed">;
  remove: (productId: string) => Promise<void>;
  /** Merge guest items into the account and adopt the server list. */
  syncWithAccount: () => Promise<void>;
  reset: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      pendingIds: [],

      async toggle(product) {
        const exists = get().items.some((item) => item.productId === product.id);
        const previous = get().items;
        const token = getAuthToken();

        // Optimistic update, reconciled with the server when signed in.
        set({
          items: exists
            ? previous.filter((item) => item.productId !== product.id)
            : [{ productId: product.id, slug: product.slug, addedAt: new Date().toISOString(), product }, ...previous],
          pendingIds: [...get().pendingIds, product.id],
        });

        try {
          if (token) {
            const serverItems = exists ? await removeFromWishlist(token, product.id) : await addToWishlist(token, product.id);
            set({ items: serverItems });
          }
          return exists ? "removed" : "added";
        } catch (error) {
          set({ items: previous });
          throw error;
        } finally {
          set({ pendingIds: get().pendingIds.filter((id) => id !== product.id) });
        }
      },

      async remove(productId) {
        const previous = get().items;
        set({ items: previous.filter((item) => item.productId !== productId) });
        const token = getAuthToken();
        if (!token) return;
        try {
          set({ items: await removeFromWishlist(token, productId) });
        } catch (error) {
          set({ items: previous });
          throw error;
        }
      },

      async syncWithAccount() {
        const token = getAuthToken();
        if (!token) return;
        const merged = await mergeWishlist(token, get().items);
        set({ items: merged });
      },

      reset() {
        set({ items: [], pendingIds: [] });
      },
    }),
    {
      name: "storefront-wishlist",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    },
  ),
);

export function useIsWishlisted(productId: string) {
  return useWishlistStore((state) => state.items.some((item) => item.productId === productId));
}
