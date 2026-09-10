"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogOutIcon } from "@/components/icons";
import { Breadcrumbs, Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { accountNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore, useCustomer } from "@/stores/auth";
import { usePersistHydrated } from "@/stores/hydration";
import { signOut } from "@/stores/session";

export function AccountShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = usePersistHydrated(useAuthStore);
  const customer = useCustomer();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (hydrated && !customer && !signingOut) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, customer, pathname, router, signingOut]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    toast({ title: "You've been signed out" });
    router.replace("/");
  }

  if (!hydrated || !customer) {
    return (
      <div className="container-luxe pb-24 pt-10" aria-busy="true" aria-label="Checking your session">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-8 h-12 w-72" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_1fr]">
          <Skeleton className="hidden h-80 lg:block" />
          <div className="space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-luxe pb-24 pt-8 md:pt-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "My Account", href: pathname === "/account" ? undefined : "/account" }]} />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <p className="type-eyebrow text-champagne-deep">My Account</p>
          <p className="mt-3 font-serif text-[2.1rem] leading-tight text-ink md:text-[2.6rem]">Hello, {customer.firstName || "there"}</p>
        </div>
        <button type="button" onClick={handleSignOut} className="inline-flex items-center gap-2 type-caption tracking-[0.14em] text-ink-soft transition-colors hover:text-ink lg:hidden">
          <LogOutIcon size={16} />
          Sign out
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[14rem_1fr] lg:gap-16">
        <nav aria-label="Account" className="no-scrollbar -mx-[var(--gutter)] overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:overflow-visible lg:px-0">
          <ul className="flex gap-2 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:flex-col lg:gap-0 lg:border-t lg:border-line">
            {accountNav.map((link) => {
              const active = link.href === "/account" ? pathname === "/account" : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block whitespace-nowrap border px-4 py-2.5 type-caption tracking-[0.14em] transition-colors lg:border-0 lg:border-b lg:border-line lg:px-0 lg:py-4",
                      active ? "border-ink bg-ink text-ivory lg:bg-transparent lg:text-ink" : "border-line text-ink-soft hover:text-ink",
                    )}
                  >
                    {link.label}
                    {active && <span className="ml-2 hidden text-champagne-deep lg:inline">—</span>}
                  </Link>
                </li>
              );
            })}
            <li className="hidden lg:block">
              <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-2 py-4 text-left type-caption tracking-[0.14em] text-muted transition-colors hover:text-ink">
                <LogOutIcon size={15} />
                Sign out
              </button>
            </li>
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
