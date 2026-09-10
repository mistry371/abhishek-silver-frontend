"use client";

import { logout } from "@/lib/api/services/customer";
import type { AuthSession } from "@/types/customer";
import { getAuthToken, useAuthStore } from "./auth";
import { useWishlistStore } from "./wishlist";

/** Called after any successful sign-in (password, OTP or registration). */
export async function completeSignIn(session: AuthSession) {
  useAuthStore.getState().setSession(session);
  try {
    await useWishlistStore.getState().syncWithAccount();
  } catch {
    // Wishlist merge is best-effort; the guest list remains locally.
  }
}

export async function signOut() {
  const token = getAuthToken();
  useAuthStore.getState().clearSession();
  useWishlistStore.getState().reset();
  try {
    await logout(token);
  } catch {
    // Local session is already cleared.
  }
}

/** Clears an expired/invalid session. Returns true when the error was auth-related. */
export function handleAuthError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code === "unauthorized" || code === "session_expired") {
    useAuthStore.getState().clearSession();
    return true;
  }
  return false;
}
