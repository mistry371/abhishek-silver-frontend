"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CloseIcon, ExternalLinkIcon, LogOutIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/icons";
import { Dialog } from "@/components/ui/Dialog";
import { adminApi } from "@/lib/admin/client";
import { formatDateTime, humanize } from "@/lib/admin/format";
import { useAdminResource, useDebouncedValue } from "@/lib/admin/hooks";
import { adminNav, isNavActive } from "@/lib/admin/navigation";
import { cn } from "@/lib/utils";
import { useAdmin } from "./AdminSession";
import { BellIcon } from "./icons";

function useOutsideClose(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function handle(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [open, onClose]);
  return ref;
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { canAny } = useAdmin();
  return (
    <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-6">
      {adminNav.map((group) => {
        const items = group.items.filter((item) => canAny(...item.permissions));
        if (!items.length) return null;
        return (
          <div key={group.title} className="mt-5">
            <p className="px-3 text-[0.625rem] uppercase tracking-[0.2em] text-ivory/40">{group.title}</p>
            <ul className="mt-1.5 space-y-0.5">
              {items.map((item) => {
                const active = isNavActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-[0.8125rem] transition-colors",
                        active ? "bg-ivory/10 text-ivory" : "text-ivory/65 hover:bg-ivory/5 hover:text-ivory",
                      )}
                    >
                      <Icon size={17} className={active ? "text-champagne-soft" : ""} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="block px-6 py-5">
      <span className="block font-serif text-[1.35rem] leading-none text-ivory">Abhishek Silver</span>
      <span className="mt-1 block text-[0.625rem] uppercase tracking-[0.28em] text-champagne-soft">Admin</span>
    </Link>
  );
}

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query.trim(), 250);
  const { data, loading } = useAdminResource<{ results: SearchResult[] }>(debounced.length >= 2 ? "/search" : null, { q: debounced });
  const ref = useOutsideClose(open, () => setOpen(false));
  const results = data?.results ?? [];

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && results[0]) go(results[0].href);
        }}
        placeholder="Search products, SKU, customers, orders, invoices…"
        aria-label="Global search"
        className="h-10 w-full border border-line bg-porcelain pl-9 pr-3 text-[0.8125rem] outline-none placeholder:text-subtle focus:border-ink"
      />
      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[26rem] overflow-y-auto border border-line bg-porcelain shadow-[0_20px_50px_-20px_rgb(20_18_16/0.35)]">
          {loading && <p className="px-4 py-3 text-[0.8125rem] text-muted">Searching…</p>}
          {!loading && results.length === 0 && <p className="px-4 py-3 text-[0.8125rem] text-muted">No matches for “{debounced}”.</p>}
          {results.map((result) => (
            <button key={`${result.type}-${result.id}`} type="button" onClick={() => go(result.href)} className="flex w-full items-start gap-3 border-b border-line px-4 py-2.5 text-left last:border-0 hover:bg-cream">
              <span className="mt-0.5 w-20 shrink-0 text-[0.625rem] uppercase tracking-[0.14em] text-champagne-deep">{result.type}</span>
              <span className="min-w-0">
                <span className="block truncate text-[0.8125rem] text-ink">{result.title}</span>
                <span className="block truncate text-[0.75rem] text-muted">{result.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

function Notifications() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data, reload } = useAdminResource<{ items: NotificationItem[]; unreadCount: number }>("/notifications");
  const ref = useOutsideClose(open, () => setOpen(false));

  useEffect(() => {
    const timer = window.setInterval(reload, 60_000);
    return () => window.clearInterval(timer);
  }, [reload]);

  async function openItem(item: NotificationItem) {
    setOpen(false);
    if (!item.read) await adminApi.post(`/notifications/${item.id}/read`).catch(() => undefined);
    reload();
    if (item.href) router.push(item.href);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={`Alerts${data?.unreadCount ? `, ${data.unreadCount} unread` : ""}`} className="relative flex h-10 w-10 items-center justify-center text-ink hover:bg-cream">
        <BellIcon size={18} />
        {Boolean(data?.unreadCount) && <span className="absolute right-1.5 top-1.5 min-w-4 bg-champagne-deep px-1 text-center text-[0.625rem] leading-4 text-ivory">{data!.unreadCount > 99 ? "99+" : data!.unreadCount}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[22rem] max-w-[calc(100vw-2rem)] border border-line bg-porcelain shadow-[0_20px_50px_-20px_rgb(20_18_16/0.35)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <p className="text-[0.8125rem] font-medium">Alerts</p>
            <button
              type="button"
              className="text-[0.75rem] text-champagne-deep hover:underline"
              onClick={async () => {
                await adminApi.post("/notifications/read-all").catch(() => undefined);
                reload();
              }}
            >
              Mark all read
            </button>
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {!data?.items.length && <p className="px-4 py-6 text-center text-[0.8125rem] text-muted">You&apos;re all caught up.</p>}
            {data?.items.map((item) => (
              <button key={item.id} type="button" onClick={() => openItem(item)} className={cn("block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-cream", !item.read && "bg-champagne-mist/35")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[0.8125rem] font-medium text-ink">{item.title}</span>
                  {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-champagne-deep" aria-label="Unread" />}
                </span>
                <span className="mt-0.5 block text-[0.75rem] text-ink-soft">{item.body}</span>
                <span className="mt-1 block text-[0.6875rem] text-muted">{formatDateTime(item.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { admin, signOut } = useAdmin();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex h-10 items-center gap-2 px-2 hover:bg-cream" aria-expanded={open}>
        <span className="flex h-8 w-8 items-center justify-center bg-ink font-serif text-[0.9375rem] text-ivory">{admin.name.charAt(0).toUpperCase()}</span>
        <span className="hidden text-left md:block">
          <span className="block text-[0.8125rem] leading-tight text-ink">{admin.name}</span>
          <span className="block text-[0.6875rem] leading-tight text-muted">{admin.roleName}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-56 border border-line bg-porcelain py-1 shadow-[0_20px_50px_-20px_rgb(20_18_16/0.35)]">
          <p className="border-b border-line px-4 py-2 text-[0.75rem] text-muted">{admin.email}</p>
          <Link href="/admin/settings/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-[0.8125rem] hover:bg-cream">
            <UserIcon size={15} /> My profile
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 text-[0.8125rem] hover:bg-cream">
            <ExternalLinkIcon size={15} /> View website
          </a>
          <button type="button" onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2 text-left text-[0.8125rem] text-danger hover:bg-cream">
            <LogOutIcon size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function TopTitle() {
  const pathname = usePathname();
  const item = adminNav.flatMap((group) => group.items).find((entry) => isNavActive(pathname, entry.href));
  return <p className="hidden truncate text-[0.6875rem] uppercase tracking-[0.18em] text-muted xl:block">{item?.label ?? humanize(pathname.split("/")[2] ?? "dashboard")}</p>;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-dvh bg-ivory lg:pl-64 print:bg-white print:pl-0">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-onyx lg:flex print:hidden">
        <Brand />
        <Navigation />
      </aside>

      <Dialog open={menuOpen} onClose={() => setMenuOpen(false)} variant="drawer-left" label="Admin menu" className="bg-onyx">
        <div className="flex items-center justify-between pr-3">
          <Brand />
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="p-2 text-ivory/70 hover:text-ivory">
            <CloseIcon size={20} />
          </button>
        </div>
        <Navigation onNavigate={() => setMenuOpen(false)} />
      </Dialog>

      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-ivory/95 px-4 backdrop-blur md:px-8 print:hidden">
        <button type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center hover:bg-cream lg:hidden">
          <MenuIcon size={20} />
        </button>
        <TopTitle />
        <div className="flex flex-1 justify-end md:justify-center">
          <GlobalSearch />
        </div>
        <Notifications />
        <ProfileMenu />
      </header>

      <main id="admin-main" className="mx-auto w-full max-w-[96rem] px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
