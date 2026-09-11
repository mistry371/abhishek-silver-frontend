"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/primitives";
import { SESSION_EXPIRED_EVENT } from "@/lib/admin/client";

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}

export interface PermissionGroup {
  module: string;
  permissions: Record<string, string>;
}

interface AdminSessionValue {
  admin: AdminProfile;
  permissionGroups: PermissionGroup[];
  can: (permission: string) => boolean;
  canAny: (...permissions: string[]) => boolean;
  refresh: () => void;
  signOut: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

type SessionState = { key: number; status: "ready"; admin: AdminProfile; permissionGroups: PermissionGroup[] } | { key: number; status: "error"; message: string; signedOut: boolean };

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [attempt, setAttempt] = useState(0);
  const [session, setSession] = useState<SessionState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.ok) setSession({ key: attempt, status: "ready", admin: data.admin, permissionGroups: data.permissionGroups ?? [] });
        else setSession({ key: attempt, status: "error", message: data.message ?? "We couldn't load your session.", signedOut: response.status === 401 || response.status === 403 });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSession({ key: attempt, status: "error", message: "We couldn't reach the server.", signedOut: false });
      });
    return () => controller.abort();
  }, [attempt]);

  const current = session && session.key === attempt ? session : null;
  const signedOut = current?.status === "error" && current.signedOut;

  useEffect(() => {
    if (signedOut) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [signedOut, router, pathname]);

  useEffect(() => {
    function onExpired() {
      router.replace(`/login?expired=1&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [router]);

  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  const signOut = useCallback(async () => {
    await fetch("/api/admin/session", { method: "DELETE" }).catch(() => undefined);
    router.replace("/login?redirect=/admin");
  }, [router]);

  const value = useMemo<AdminSessionValue | null>(() => {
    if (current?.status !== "ready") return null;
    const granted = new Set(current.admin.permissions);
    return {
      admin: current.admin,
      permissionGroups: current.permissionGroups,
      can: (permission) => granted.has(permission),
      canAny: (...permissions) => permissions.some((permission) => granted.has(permission)),
      refresh,
      signOut,
    };
  }, [current, refresh, signOut]);

  if (current?.status === "error" && !current.signedOut) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-ivory px-6 text-center">
        <Logo compact />
        <p className="type-body text-muted">{current.message}</p>
        <Button onClick={refresh}>Try again</Button>
      </div>
    );
  }

  if (!value) {
    return (
      <div className="flex min-h-dvh bg-ivory" aria-busy="true" aria-label="Loading the admin panel">
        <div className="hidden w-64 shrink-0 bg-onyx lg:block" />
        <div className="flex-1 space-y-6 p-8">
          <Skeleton className="h-9 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdmin must be used inside AdminSessionProvider");
  return value;
}
