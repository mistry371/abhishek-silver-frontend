"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BagIcon, ChevronDownIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/Button";
import { mainNav, type MainNavItem } from "@/config/navigation";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/stores/auth";
import { useCartCount } from "@/stores/cart";
import { useUIStore } from "@/stores/ui";
import { useWishlistStore } from "@/stores/wishlist";
import { Logo } from "./Logo";

const tierVisibility: Record<MainNavItem["tier"], string> = {
  1: "flex",
  2: "hidden xl:flex",
  3: "hidden 3xl:flex",
};

const overflowVisibility: Record<MainNavItem["tier"], string> = {
  1: "hidden",
  2: "xl:hidden",
  3: "",
};

function isActivePath(pathname: string, href: string) {
  const path = href.split("?")[0];
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function CountBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute right-1 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[0.5625rem] font-medium leading-none text-ivory tabular-nums"
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function Header() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const [scrolled, setScrolled] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);

  const cartCount = useCartCount();
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const customer = useCustomer();
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen);

  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const openTimer = useRef(0);
  const closeTimer = useRef(0);

  // Close menus on navigation (derived-state pattern, no effect needed).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenId(null);
  }

  useEffect(() => {
    let frame = 0;
    // Hysteresis: the header's own height change shifts the page, so use separate
    // thresholds for compacting and expanding to avoid oscillating at the boundary.
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled((current) => (current ? y > 40 : y > 120));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Expose the live header height so sticky toolbars and sidebars sit flush beneath it.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty("--header-height", `${Math.round(el.getBoundingClientRect().height)}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!openId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        const trigger = document.getElementById(`nav-trigger-${openId}`);
        setOpenId(null);
        trigger?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openId]);

  function scheduleOpen(id: string) {
    window.clearTimeout(closeTimer.current);
    window.clearTimeout(openTimer.current);
    openTimer.current = window.setTimeout(() => setOpenId(id), openId ? 0 : 120);
  }

  function scheduleClose() {
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenId(null), 180);
  }

  function cancelClose() {
    window.clearTimeout(closeTimer.current);
  }

  function openAndFocus(id: string) {
    setOpenId(id);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#nav-panel-${id} a`)?.focus());
  }

  const overflowItems = mainNav.filter((item) => item.tier > 1);
  const openItem = mainNav.find((item) => item.id === openId && item.mega);

  return (
    <header
      ref={headerRef}
      className={cn(
        "sticky top-0 z-50 transition-[background-color,box-shadow] duration-500 ease-luxe",
        scrolled
          ? "bg-porcelain/95 shadow-[0_1px_0_var(--color-line),0_18px_40px_-34px_rgb(20_18_16/0.45)] backdrop-blur-md"
          : "bg-ivory",
      )}
    >
      <div className="container-luxe">
        <div
          className={cn(
            "grid grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-500 ease-luxe",
            scrolled ? "h-16 lg:h-[4.5rem]" : "h-16 lg:h-[6.25rem]",
          )}
        >
          <div className="-ml-3 flex items-center lg:ml-0">
            <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-haspopup="dialog">
              <MenuIcon size={22} />
            </IconButton>
            <IconButton label="Search" className="lg:hidden" onClick={() => setSearchOpen(true)} aria-haspopup="dialog">
              <SearchIcon size={20} />
            </IconButton>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-haspopup="dialog"
              className="hidden h-10 min-w-[14rem] items-center gap-3 border-b border-line-strong/80 pr-8 text-left type-body-sm text-muted transition-colors duration-300 hover:border-ink hover:text-ink lg:flex"
            >
              <SearchIcon size={17} />
              <span>Search jewellery</span>
            </button>
          </div>

          <Logo compact={scrolled} />

          <div className="-mr-3 flex items-center justify-end">
            <Link
              href={customer ? "/account" : "/login"}
              aria-label={customer ? "My account" : "Sign in"}
              className="hidden h-11 w-11 items-center justify-center text-ink transition-colors hover:text-champagne-deep lg:inline-flex"
            >
              <UserIcon size={21} />
            </Link>
            <Link
              href="/wishlist"
              aria-label={`Wishlist${hydrated && wishlistCount ? `, ${wishlistCount} items` : ""}`}
              className="relative inline-flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-champagne-deep"
            >
              <HeartIcon size={21} />
              {hydrated && wishlistCount > 0 && <CountBadge count={wishlistCount} />}
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-haspopup="dialog"
              aria-label={`Shopping bag${hydrated && cartCount ? `, ${cartCount} items` : ""}`}
              className="relative inline-flex h-11 w-11 items-center justify-center text-ink transition-colors hover:text-champagne-deep"
            >
              <BagIcon size={21} />
              {hydrated && cartCount > 0 && <CountBadge count={cartCount} />}
            </button>
          </div>
        </div>
      </div>

      <nav ref={navRef} aria-label="Main" className="relative hidden border-t border-line/70 lg:block">
        <ul className="mx-auto flex h-12 max-w-[110rem] items-center justify-center gap-x-5 px-[var(--gutter)] 2xl:gap-x-6">
          {mainNav.map((item) => {
            const active = isActivePath(pathname, item.href);
            const open = openId === item.id;
            return (
              <li
                key={item.id}
                className={cn("relative h-full items-center", tierVisibility[item.tier])}
                onMouseEnter={() => (item.mega ? scheduleOpen(item.id) : scheduleClose())}
                onMouseLeave={item.mega ? scheduleClose : undefined}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-full items-center whitespace-nowrap type-nav transition-colors duration-300",
                    "after:absolute after:inset-x-0 after:bottom-3 after:h-px after:origin-left after:bg-ink after:transition-transform after:duration-400 after:ease-luxe",
                    active || open ? "text-ink after:scale-x-100" : "text-ink-soft after:scale-x-0 hover:text-ink hover:after:scale-x-100",
                  )}
                >
                  {item.label}
                </Link>
                {item.mega && (
                  <button
                    id={`nav-trigger-${item.id}`}
                    type="button"
                    aria-expanded={open}
                    aria-controls={`nav-panel-${item.id}`}
                    aria-label={`${item.label} menu`}
                    onClick={() => (open ? setOpenId(null) : openAndFocus(item.id))}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        openAndFocus(item.id);
                      }
                    }}
                    className="absolute -right-4 top-1/2 flex h-6 w-4 -translate-y-1/2 items-center justify-center text-muted opacity-0 focus-visible:opacity-100"
                  >
                    <ChevronDownIcon size={12} />
                  </button>
                )}
              </li>
            );
          })}

          <li
            className="relative flex h-full items-center 3xl:hidden"
            onMouseEnter={() => scheduleOpen("more")}
            onMouseLeave={scheduleClose}
          >
            <button
              id="nav-trigger-more"
              type="button"
              aria-expanded={openId === "more"}
              aria-controls="nav-panel-more"
              onClick={() => (openId === "more" ? setOpenId(null) : openAndFocus("more"))}
              className={cn(
                "flex h-full items-center gap-1.5 type-nav transition-colors",
                openId === "more" ? "text-ink" : "text-ink-soft hover:text-ink",
              )}
            >
              More
              <ChevronDownIcon size={12} className={cn("transition-transform duration-300", openId === "more" && "rotate-180")} />
            </button>
            {openId === "more" && (
              <div
                id="nav-panel-more"
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
                className="absolute right-0 top-full z-40 min-w-[15rem] animate-fade-in border border-line bg-porcelain py-3 shadow-[0_30px_60px_-40px_rgb(20_18_16/0.4)]"
              >
                <ul>
                  {overflowItems.map((item) => (
                    <li key={item.id} className={overflowVisibility[item.tier]}>
                      <Link
                        href={item.href}
                        onClick={() => setOpenId(null)}
                        className="block px-6 py-2.5 type-nav text-ink-soft transition-colors hover:bg-cream hover:text-ink"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        </ul>

        {openItem?.mega && (
          <div
            id={`nav-panel-${openItem.id}`}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="absolute inset-x-0 top-full z-40 animate-fade-in border-t border-line bg-porcelain shadow-[0_40px_70px_-50px_rgb(20_18_16/0.45)]"
          >
            <MegaPanel item={openItem} onNavigate={() => setOpenId(null)} />
          </div>
        )}
      </nav>
    </header>
  );
}

function MegaPanel({ item, onNavigate }: { item: MainNavItem; onNavigate: () => void }) {
  const mega = item.mega!;
  return (
    <div className="mx-auto grid max-w-[96rem] grid-cols-12 gap-10 px-[var(--gutter)] py-10 xl:gap-14">
      <div className={cn("flex flex-col justify-between", mega.promo ? "col-span-6 xl:col-span-5" : "col-span-8 xl:col-span-7")}>
        <div
          className="grid gap-8"
          style={{ gridTemplateColumns: `repeat(${Math.max(mega.columns.length, 3)}, minmax(0, 1fr))` }}
        >
          {mega.columns.map((column) => (
            <div key={column.title}>
              <p className="mb-5 type-eyebrow text-champagne-deep">{column.title}</p>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} onClick={onNavigate} className="type-body-sm text-ink-soft transition-colors link-underline hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link href={mega.viewAll.href} onClick={onNavigate} className="mt-10 self-start type-button link-underline-static">
          {mega.viewAll.label}
        </Link>
      </div>

      {mega.promo && (
        <div className="col-span-2 flex flex-col border-l border-line pl-8 xl:col-span-3">
          <p className="type-eyebrow text-champagne-deep">{mega.promo.eyebrow}</p>
          <p className="mt-4 type-h3 text-ink">{mega.promo.title}</p>
          <p className="mt-3 type-body-sm text-muted">{mega.promo.description}</p>
          <Link href={mega.promo.href} onClick={onNavigate} className="mt-6 self-start type-button link-underline-static">
            {mega.promo.cta}
          </Link>
        </div>
      )}

      <Link
        href={mega.feature.href}
        onClick={onNavigate}
        className={cn("group/feature relative block overflow-hidden bg-cream", mega.promo ? "col-span-4" : "col-span-4 xl:col-span-5")}
      >
        <div className="relative aspect-[16/11] w-full">
          <Image
            src={mega.feature.image.url}
            alt={mega.feature.image.alt}
            fill
            sizes="(min-width: 1536px) 32vw, 34vw"
            className="object-cover transition-transform duration-[1200ms] ease-luxe group-hover/feature:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-onyx/70 via-onyx/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-ivory">
            <p className="type-eyebrow text-champagne-soft">{mega.feature.eyebrow}</p>
            <p className="mt-2 type-h3">{mega.feature.title}</p>
            <span className="mt-4 inline-block type-button link-underline-static">{mega.feature.cta}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
