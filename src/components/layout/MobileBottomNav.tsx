"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GridIcon, HeartIcon, HomeIcon, SearchIcon, UserIcon } from "@/components/icons";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";
import { useCustomer } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";
import { useWishlistStore } from "@/stores/wishlist";

/** Routes with their own sticky bottom actions hide the tab bar. */
const HIDDEN_ON = ["/product/", "/checkout", "/cart"];

export function MobileBottomNav() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const customer = useCustomer();
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const searchOpen = useUIStore((s) => s.searchOpen);
  const hidden = HIDDEN_ON.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    document.documentElement.classList.toggle("mobile-nav-hidden", hidden);
  }, [hidden]);

  if (hidden) return null;

  const itemClass = (active: boolean) =>
    cn(
      "relative flex h-full flex-col items-center justify-center gap-1 text-[0.5625rem] font-medium uppercase tracking-[0.14em] transition-colors",
      "before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-ink before:transition-transform before:duration-300",
      active ? "text-ink before:scale-x-100" : "text-muted before:scale-x-0",
    );

  return (
    <nav aria-label="Quick navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-porcelain/95 backdrop-blur-md lg:hidden">
      <ul className="grid h-16 grid-cols-5">
        <li>
          <Link href="/" className={itemClass(pathname === "/")} aria-current={pathname === "/" ? "page" : undefined}>
            <HomeIcon size={20} />
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/shop"
            className={itemClass(pathname.startsWith("/shop") || pathname.startsWith("/collection"))}
            aria-current={pathname === "/shop" ? "page" : undefined}
          >
            <GridIcon size={20} />
            Shop
          </Link>
        </li>
        <li>
          <button type="button" onClick={() => setSearchOpen(true)} className={cn(itemClass(searchOpen), "w-full")} aria-haspopup="dialog">
            <SearchIcon size={20} />
            Search
          </button>
        </li>
        <li>
          <Link href="/wishlist" className={itemClass(pathname.startsWith("/wishlist"))} aria-current={pathname === "/wishlist" ? "page" : undefined}>
            <span className="relative">
              <HeartIcon size={20} />
              {hydrated && wishlistCount > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 text-[0.5625rem] leading-none tracking-normal text-ivory">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </span>
            Wishlist
          </Link>
        </li>
        <li>
          <Link
            href={customer ? "/account" : "/login"}
            className={itemClass(pathname.startsWith("/account") || pathname === "/login")}
          >
            <UserIcon size={20} />
            {hydrated && customer ? "Account" : "Sign In"}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
