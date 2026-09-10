"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CloseIcon, HeartIcon, PhoneIcon, UserIcon, WhatsAppIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { mainNav } from "@/config/navigation";
import { primaryPhone } from "@/lib/site-contact";
import { cn } from "@/lib/utils";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { useCustomer } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { Logo } from "./Logo";

export function MobileMenu() {
  const open = useUIStore((s) => s.mobileMenuOpen);
  const setOpen = useUIStore((s) => s.setMobileMenuOpen);
  const customer = useCustomer();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    if (open) setOpen(false);
  }

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onClose={close} variant="drawer-left" label="Main menu">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line pl-5 pr-2">
        <Logo size="sm" onClick={close} />
        <IconButton label="Close menu" onClick={close}>
          <CloseIcon size={22} />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="grid grid-cols-2 gap-3 px-5 py-5">
          <Link href="/shop?new=true&sort=newest" onClick={close} className="border border-line px-4 py-4 transition-colors hover:border-ink">
            <span className="block type-eyebrow text-champagne-deep">Just In</span>
            <span className="mt-1.5 block font-serif text-lg text-ink">New Arrivals</span>
          </Link>
          <Link href="/shop?best=true&sort=best_selling" onClick={close} className="border border-line px-4 py-4 transition-colors hover:border-ink">
            <span className="block type-eyebrow text-champagne-deep">Loved</span>
            <span className="mt-1.5 block font-serif text-lg text-ink">Best Sellers</span>
          </Link>
        </div>

        <nav aria-label="Mobile">
          <ul className="border-t border-line">
            {mainNav.map((item) => {
              if (!item.mega) {
                return (
                  <li key={item.id} className="border-b border-line">
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className="flex min-h-14 items-center px-5 text-[0.75rem] font-medium uppercase tracking-[0.16em] text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              }
              const isOpen = expanded === item.id;
              const panelId = `mobile-nav-${item.id}`;
              return (
                <li key={item.id} className="border-b border-line">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                    className="flex min-h-14 w-full items-center justify-between px-5 text-left text-[0.75rem] font-medium uppercase tracking-[0.16em] text-ink"
                  >
                    {item.label}
                    <span className="relative h-3 w-3" aria-hidden="true">
                      <span className="absolute left-0 top-1/2 h-px w-3 bg-current" />
                      <span className={cn("absolute left-1/2 top-0 h-3 w-px bg-current transition-transform duration-300", isOpen && "scale-y-0")} />
                    </span>
                  </button>
                  <div
                    id={panelId}
                    inert={!isOpen}
                    className={cn("grid transition-[grid-template-rows] duration-400 ease-luxe", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                  >
                    <div className="overflow-hidden">
                      <div className="bg-cream/70 px-5 pb-6 pt-2">
                        {item.mega.columns.map((column) => (
                          <div key={column.title} className="pt-4">
                            <p className="mb-3 type-eyebrow text-champagne-deep">{column.title}</p>
                            <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
                              {column.links.map((link) => (
                                <li key={link.href}>
                                  <Link href={link.href} onClick={close} className="type-body-sm text-ink-soft">
                                    {link.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <Link href={item.mega.viewAll.href} onClick={close} className="mt-6 inline-block type-button link-underline-static">
                          {item.mega.viewAll.label}
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="safe-bottom shrink-0 space-y-1 border-t border-line px-5 py-4">
        <Link href={customer ? "/account" : "/login"} onClick={close} className="flex min-h-11 items-center gap-3 type-body-sm text-ink">
          <UserIcon size={19} />
          {customer ? `Hello, ${customer.firstName || "there"}` : "Sign in or create an account"}
        </Link>
        <Link href="/wishlist" onClick={close} className="flex min-h-11 items-center gap-3 type-body-sm text-ink">
          <HeartIcon size={19} />
          Wishlist
        </Link>
        <a
          href={whatsappUrl(whatsappMessages.general())}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-3 type-body-sm text-ink"
        >
          <WhatsAppIcon size={19} />
          Chat on WhatsApp
        </a>
        <a href={primaryPhone().href} className="flex min-h-11 items-center gap-3 type-body-sm text-ink">
          <PhoneIcon size={19} />
          {primaryPhone().display}
        </a>
      </div>
    </Dialog>
  );
}
