"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "@/components/icons";
import { usePrefersReducedMotion } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";
import type { Testimonial } from "@/types/content";

export function Testimonials({ items }: { items: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const touchX = useRef<number | null>(null);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || hovered || reduceMotion) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), 7000);
    return () => window.clearTimeout(timer);
  }, [index, count, hovered, reduceMotion]);

  if (count === 0) return null;
  const go = (next: number) => setIndex((next + count) % count);

  function onTouchEnd(event: TouchEvent) {
    if (touchX.current === null) return;
    const dx = event.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
  }

  return (
    <section className="section-y bg-cream" aria-labelledby="testimonials-title">
      <div className="container-narrow text-center">
        <p className="type-eyebrow text-champagne-deep">In Their Words</p>
        <h2 id="testimonials-title" className="mt-4 type-h2 text-ink">
          Stories from our clients
        </h2>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Testimonials"
          className="relative mt-12"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setHovered(true)}
          onBlurCapture={() => setHovered(false)}
          onTouchStart={(event) => (touchX.current = event.touches[0].clientX)}
          onTouchEnd={onTouchEnd}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") go(index + 1);
            if (event.key === "ArrowLeft") go(index - 1);
          }}
        >
          <div className="grid">
            {items.map((item, i) => {
              const active = i === index;
              return (
                <figure
                  key={item.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${count}`}
                  aria-hidden={!active}
                  className={cn(
                    "col-start-1 row-start-1 transition-[opacity,transform] duration-700 ease-luxe",
                    active ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
                  )}
                >
                  <span aria-hidden="true" className="block font-serif text-7xl leading-none text-champagne/60">
                    “
                  </span>
                  {item.rating && (
                    <div className="mt-2 flex justify-center gap-1 text-champagne-deep" aria-label={`Rated ${item.rating} out of 5`}>
                      {Array.from({ length: 5 }).map((_, star) => (
                        <StarIcon key={star} size={14} fill={star < item.rating! ? "currentColor" : "none"} />
                      ))}
                    </div>
                  )}
                  <blockquote className="mt-6 font-serif text-[1.55rem] leading-[1.4] text-ink md:text-[2.05rem]">{item.quote}</blockquote>
                  <figcaption className="mt-8 flex flex-col items-center gap-1.5">
                    <span className="type-caption tracking-[0.2em] text-ink">{item.name}</span>
                    {item.location && <span className="type-body-sm text-muted">{item.location}</span>}
                    {item.isSample && (
                      <span className="mt-1 border border-line-strong px-2 py-0.5 text-[0.625rem] uppercase tracking-[0.14em] text-muted">
                        Sample testimonial
                      </span>
                    )}
                  </figcaption>
                </figure>
              );
            })}
          </div>

          {count > 1 && (
            <div className="mt-10 flex items-center justify-center gap-6">
              <button type="button" onClick={() => go(index - 1)} aria-label="Previous testimonial" className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink">
                <ChevronLeftIcon size={18} />
              </button>
              <div className="flex gap-2">
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show testimonial ${i + 1}`}
                    aria-current={i === index}
                    className="flex h-6 items-center"
                  >
                    <span className={cn("block h-px transition-all duration-500", i === index ? "w-8 bg-ink" : "w-4 bg-line-strong")} />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => go(index + 1)} aria-label="Next testimonial" className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink transition-colors hover:border-ink">
                <ChevronRightIcon size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
