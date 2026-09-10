"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpIcon, WhatsAppIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";

export function FloatingUtilities() {
  const pathname = usePathname();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setShowBackToTop(window.scrollY > 900));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (pathname.startsWith("/checkout")) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 z-40 flex flex-col items-end gap-3 transition-[bottom] duration-500 ease-luxe md:right-8"
      style={{ bottom: "calc(var(--mobile-nav-height) + var(--sticky-bar-height) + var(--compare-bar-height) + 1rem)" }}
    >
      <button
        type="button"
        onClick={() => {
          const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        }}
        aria-label="Back to top"
        tabIndex={showBackToTop ? 0 : -1}
        aria-hidden={!showBackToTop}
        className={cn(
          "flex h-11 w-11 items-center justify-center border border-line bg-porcelain/95 text-ink backdrop-blur transition-[opacity,transform,border-color] duration-500 ease-luxe hover:border-ink",
          showBackToTop ? "pointer-events-auto translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <ArrowUpIcon size={18} />
      </button>
      <a
        href={whatsappUrl(whatsappMessages.general())}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="group pointer-events-auto flex h-[3.25rem] items-center rounded-full bg-onyx px-3.5 text-ivory shadow-[0_16px_34px_-14px_rgb(20_18_16/0.6)] transition-colors duration-500 hover:bg-whatsapp"
      >
        <WhatsAppIcon size={24} />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-[0.6875rem] font-medium uppercase tracking-[0.16em] transition-[max-width,margin] duration-500 ease-luxe group-hover:ml-2.5 group-hover:max-w-40">
          Chat with us
        </span>
      </a>
    </div>
  );
}
