"use client";

import { Children, useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * Native scroll-snap carousel: touch swipe for free, mouse drag, keyboard
 * arrows, prev/next buttons and a progress line. Controls only render when
 * content actually overflows.
 */
export function Carousel({
  label,
  children,
  itemClassName,
  className,
  tone = "dark",
  controlsClassName,
}: {
  label: string;
  children: ReactNode;
  itemClassName: string;
  className?: string;
  tone?: "dark" | "light";
  controlsClassName?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean; pointerId: number } | null>(null);
  const [metrics, setMetrics] = useState({ canPrev: false, canNext: false, progress: 0, visible: 1 });
  const items = Children.toArray(children);

  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setMetrics({
      canPrev: el.scrollLeft > 4,
      canNext: el.scrollLeft < max - 4,
      progress: max > 0 ? el.scrollLeft / max : 0,
      visible: el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = trackRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items.length]);

  function scrollPage(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollPage(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollPage(-1);
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !trackRef.current) return;
    drag.current = { x: event.clientX, left: trackRef.current.scrollLeft, moved: false, pointerId: event.pointerId };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    const el = trackRef.current;
    if (!state || !el) return;
    const delta = event.clientX - state.x;
    if (!state.moved && Math.abs(delta) > 6) {
      state.moved = true;
      el.setPointerCapture(state.pointerId);
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
    }
    if (state.moved) el.scrollLeft = state.left - delta;
  }

  function endDrag() {
    const state = drag.current;
    const el = trackRef.current;
    drag.current = null;
    if (!state?.moved || !el) return;
    if (el.hasPointerCapture(state.pointerId)) el.releasePointerCapture(state.pointerId);
    el.style.scrollSnapType = "";
    el.style.scrollBehavior = "";
    // Swallow the click that follows a drag so cards don't navigate.
    const suppress = (clickEvent: MouseEvent) => {
      clickEvent.preventDefault();
      clickEvent.stopPropagation();
    };
    el.addEventListener("click", suppress, { capture: true });
    window.setTimeout(() => el.removeEventListener("click", suppress, { capture: true }), 60);
  }

  const showControls = metrics.canPrev || metrics.canNext;
  const light = tone === "light";

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className={cn("relative", className)}>
      <div
        ref={trackRef}
        tabIndex={0}
        onScroll={measure}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(event) => event.preventDefault()}
        className={cn(
          "no-scrollbar -mx-[var(--gutter)] flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[var(--gutter)] scroll-px-[var(--gutter)]",
          "md:mx-0 md:gap-6 md:px-0 md:scroll-px-0 focus-visible:outline-offset-8",
        )}
      >
        {items.map((child, index) => (
          <div
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${items.length}`}
            className={cn("shrink-0 snap-start", itemClassName)}
          >
            {child}
          </div>
        ))}
      </div>

      {showControls && (
        <div className={cn("mt-8 flex items-center gap-6 md:mt-10", controlsClassName)}>
          <div className={cn("relative h-px flex-1", light ? "bg-ivory/20" : "bg-line")} aria-hidden="true">
            <div
              className={cn("absolute inset-y-0", light ? "bg-ivory" : "bg-ink")}
              style={{ width: `${metrics.visible * 100}%`, left: `${metrics.progress * (1 - metrics.visible) * 100}%` }}
            />
          </div>
          <div className="flex gap-2">
            {([-1, 1] as const).map((direction) => (
              <button
                key={direction}
                type="button"
                onClick={() => scrollPage(direction)}
                disabled={direction === -1 ? !metrics.canPrev : !metrics.canNext}
                aria-label={direction === -1 ? "Scroll to previous items" : "Scroll to next items"}
                className={cn(
                  "flex h-11 w-11 items-center justify-center border transition-colors duration-300 disabled:cursor-default disabled:opacity-35",
                  light
                    ? "border-ivory/30 text-ivory hover:border-ivory disabled:hover:border-ivory/30"
                    : "border-line text-ink hover:border-ink disabled:hover:border-line",
                )}
              >
                {direction === -1 ? <ChevronLeftIcon size={18} /> : <ChevronRightIcon size={18} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
