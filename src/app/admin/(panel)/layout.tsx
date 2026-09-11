import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AdminSessionProvider } from "@/components/admin/AdminSession";
import { AdminShell } from "@/components/admin/AdminShell";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/admin/server";

/** Protected admin area: no session cookie → sign-in. Permissions are enforced by the API. */
export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  if (!store.get(ACCESS_COOKIE)?.value && !store.get(REFRESH_COOKIE)?.value) redirect("/login?redirect=/admin");
  return (
    <AdminSessionProvider>
      <AdminShell>
        <Suspense>{children}</Suspense>
      </AdminShell>
    </AdminSessionProvider>
  );
}
