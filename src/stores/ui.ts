"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UIState {
  cartOpen: boolean;
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  quickViewSlug: string | null;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  openQuickView: (slug: string) => void;
  closeQuickView: () => void;
}

/** Transient UI state shared across distant components (header ↔ drawers). */
export const useUIStore = create<UIState>((set) => ({
  cartOpen: false,
  searchOpen: false,
  mobileMenuOpen: false,
  quickViewSlug: null,
  setCartOpen: (cartOpen) => set({ cartOpen, searchOpen: false, mobileMenuOpen: false }),
  setSearchOpen: (searchOpen) => set({ searchOpen, cartOpen: false, mobileMenuOpen: false }),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  openQuickView: (quickViewSlug) => set({ quickViewSlug }),
  closeQuickView: () => set({ quickViewSlug: null }),
}));

interface RecentSearchState {
  terms: string[];
  add: (term: string) => void;
  remove: (term: string) => void;
  clear: () => void;
}

export const useRecentSearches = create<RecentSearchState>()(
  persist(
    (set, get) => ({
      terms: [],
      add(term) {
        const clean = term.trim();
        if (clean.length < 2) return;
        set({ terms: [clean, ...get().terms.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 6) });
      },
      remove(term) {
        set({ terms: get().terms.filter((t) => t !== term) });
      },
      clear() {
        set({ terms: [] });
      },
    }),
    {
      name: "storefront-recent-searches",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
