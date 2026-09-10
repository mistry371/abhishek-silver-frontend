import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { AnnouncementBar } from "./AnnouncementBar";
import { ClientOverlays } from "./ClientOverlays";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-5 focus:py-3 focus:type-button focus:text-ivory"
    >
      Skip to content
    </a>
  );
}

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(var(--mobile-nav-height)+var(--compare-bar-height))]">
      <SkipLink />
      <AnnouncementBar messages={siteConfig.announcements} />
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <Footer />
      <ClientOverlays />
    </div>
  );
}
