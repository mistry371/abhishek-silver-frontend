import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon, LockIcon } from "@/components/icons";
import { ClientOverlays } from "@/components/layout/ClientOverlays";
import { Logo } from "@/components/layout/Logo";
import { SkipLink } from "@/components/layout/SiteChrome";
import { siteConfig } from "@/config/site";

/** Distraction-free chrome for checkout: conversion first. */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <SkipLink />
      <header className="border-b border-line bg-porcelain">
        <div className="container-luxe grid h-20 grid-cols-[1fr_auto_1fr] items-center">
          <Link href="/cart" className="inline-flex items-center gap-2 type-caption tracking-[0.14em] text-ink-soft transition-colors hover:text-ink">
            <ArrowLeftIcon size={16} />
            <span className="hidden sm:inline">Back to bag</span>
          </Link>
          <Logo size="sm" />
          <p className="flex items-center justify-end gap-2 type-caption tracking-[0.14em] text-ink-soft">
            <LockIcon size={15} />
            <span className="hidden sm:inline">Secure checkout</span>
          </p>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <footer className="border-t border-line py-8">
        <div className="container-luxe flex flex-col items-center justify-between gap-4 type-body-sm text-muted md:flex-row">
          <p>
            © {new Date().getFullYear()} {siteConfig.legalName}
          </p>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <li>
              <Link href="/shipping" className="hover:text-ink">
                Shipping
              </Link>
            </li>
            <li>
              <Link href="/returns" className="hover:text-ink">
                Returns
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-ink">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-ink">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </footer>
      <ClientOverlays />
    </div>
  );
}
