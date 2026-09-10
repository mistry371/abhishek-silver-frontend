"use client";

import { useEffect } from "react";

/**
 * One shared IntersectionObserver for every `[data-reveal]` element, so server
 * components can opt into subtle scroll reveals without becoming client components.
 * Elements already in view when the page hydrates are shown immediately (no flash).
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );

    const seen = new WeakSet<Element>();
    function scan() {
      const viewportHeight = window.innerHeight;
      document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        const rect = element.getBoundingClientRect();
        if (!root.classList.contains("reveal-ready") && rect.top < viewportHeight && rect.bottom > 0) {
          element.classList.add("is-revealed");
          return;
        }
        observer.observe(element);
      });
    }

    scan();
    root.classList.add("reveal-ready");

    let frame = 0;
    const mutations = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
