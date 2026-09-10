"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Toaster } from "@/components/ui/Toast";
import { useUIStore } from "@/stores/ui";
import { CompareBar } from "./CompareBar";
import { FloatingUtilities } from "./FloatingUtilities";
import { MobileBottomNav } from "./MobileBottomNav";
import { RevealObserver } from "./RevealObserver";
import { StoreHydration } from "./StoreHydration";

// Overlays are code-split and only fetched the first time they are opened.
const SearchOverlay = dynamic(() => import("./SearchOverlay").then((m) => m.SearchOverlay), { ssr: false });
const MobileMenu = dynamic(() => import("./MobileMenu").then((m) => m.MobileMenu), { ssr: false });
const CartDrawer = dynamic(() => import("@/components/cart/CartDrawer").then((m) => m.CartDrawer), { ssr: false });
const QuickView = dynamic(() => import("@/components/product/QuickView").then((m) => m.QuickView), { ssr: false });

export function ClientOverlays() {
  const searchOpen = useUIStore((s) => s.searchOpen);
  const cartOpen = useUIStore((s) => s.cartOpen);
  const menuOpen = useUIStore((s) => s.mobileMenuOpen);
  const quickViewSlug = useUIStore((s) => s.quickViewSlug);
  const [loaded, setLoaded] = useState({ search: false, cart: false, menu: false, quickView: false });

  // Latch: once an overlay has been opened keep it mounted for exit animations.
  if ((searchOpen && !loaded.search) || (cartOpen && !loaded.cart) || (menuOpen && !loaded.menu) || (quickViewSlug && !loaded.quickView)) {
    setLoaded({
      search: loaded.search || searchOpen,
      cart: loaded.cart || cartOpen,
      menu: loaded.menu || menuOpen,
      quickView: loaded.quickView || Boolean(quickViewSlug),
    });
  }

  return (
    <>
      <StoreHydration />
      <RevealObserver />
      <Toaster />
      {loaded.search && <SearchOverlay />}
      {loaded.menu && <MobileMenu />}
      {loaded.cart && <CartDrawer />}
      {loaded.quickView && <QuickView />}
      <CompareBar />
      <FloatingUtilities />
      <MobileBottomNav />
    </>
  );
}
