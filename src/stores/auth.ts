"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSession, Customer } from "@/types/customer";

interface AuthState {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
  updateCustomer: (customer: Customer) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      setSession: (session) => set({ session }),
      updateCustomer: (customer) => set((state) => (state.session ? { session: { ...state.session, customer } } : state)),
      clearSession: () => set({ session: null }),
    }),
    {
      name: "storefront-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session }),
      skipHydration: true,
    },
  ),
);

/** Returns a valid access token, or null when signed out / expired. */
export function getAuthToken() {
  const session = useAuthStore.getState().session;
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) return null;
  return session.accessToken;
}

export function useCustomer() {
  return useAuthStore((state) => state.session?.customer ?? null);
}
