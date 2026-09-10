"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { useCompareStore } from "@/stores/compare";
import { useRecentSearches } from "@/stores/ui";
import { useWishlistStore } from "@/stores/wishlist";

const persistedStores = {
  "storefront-auth": useAuthStore,
  "storefront-cart": useCartStore,
  "storefront-wishlist": useWishlistStore,
  "storefront-compare": useCompareStore,
  "storefront-recent-searches": useRecentSearches,
} as const;

/**
 * Loads persisted client state after hydration (avoids SSR mismatches),
 * re-validates the cart with the server and keeps tabs in sync.
 */
export function StoreHydration() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.all(Object.values(persistedStores).map((store) => store.persist.rehydrate()));
      if (cancelled) return;

      const session = useAuthStore.getState().session;
      if (session && Date.parse(session.expiresAt) <= Date.now()) {
        useAuthStore.getState().clearSession();
      }

      if (useCartStore.getState().lines.length > 0) {
        void useCartStore.getState().refresh();
      } else {
        useCartStore.setState({ status: "ready" });
      }
    })();

    function onStorage(event: StorageEvent) {
      if (!event.key || !(event.key in persistedStores)) return;
      const store = persistedStores[event.key as keyof typeof persistedStores];
      void Promise.resolve(store.persist.rehydrate()).then(() => {
        if (event.key === "storefront-cart") void useCartStore.getState().refresh();
      });
    }

    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
