"use client";

import { getImageProps } from "next/image";
import { useCallback, useRef, useState, type TouchEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { usePrefersReducedMotion } from "@/hooks/useHydrated";
import { cn } from "@/lib/utils";
import type { Banner } from "@/types/content";

function HeroPicture({ slide, eager, active }: { slide: Banner; eager: boolean; active: boolean }) {
  const desktop = getImageProps({ src: slide.image.url, alt: slide.image.alt, width: 2400, height: 1500, sizes: "100vw" }).props;
  const mobileSource = slide.mobileImage ?? slide.image;
  const mobile = getImageProps({
    src: mobileSource.url,
    alt: slide.image.alt,
    width: 1200,
    height: 1700,
    sizes: "100vw",
    loading: eager ? "eager" : "lazy",
    fetchPriority: eager ? "high" : "auto",
  }).props;

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktop.srcSet} sizes="100vw" />
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img
        {...mobile}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-transform duration-[8000ms] ease-out",
          active ? "scale-100" : "scale-[1.06]",
        )}
      />
    </picture>
  );
}

export function HeroCarousel({ slides }: { slides: Banner[] }) {
  const items = slides.filter((slide) => slide.active).sort((a, b) => a.displayOrder - b.displayOrder);
  const count = items.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [loaded, setLoaded] = useState<number[]>([0]);
  const reduceMotion = usePrefersReducedMotion();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      const target = (next + count) % count;
      setIndex(target);
      setLoaded((current) => Array.from(new Set([...current, target, (target + 1) % count])));
    },
    [count],
  );

  const autoplay = count > 1 && !reduceMotion;
  const running = autoplay && !paused && !interacting;

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(index + (dx < 0 ? 1 : -1));
  }

  if (count === 0) return null;
  const activeTone = items[index].tone;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      className="relative isolate h-[calc(100svh-6.25rem-var(--mobile-nav-height))] max-h-[58rem] min-h-[32rem] overflow-hidden bg-onyx lg:h-[calc(100svh-11.6rem)]"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={() => setInteracting(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(index + 1);
        if (event.key === "ArrowLeft") go(index - 1);
      }}
    >
      {items.map((slide, i) => {
        const active = i === index;
        const light = slide.tone === "light";
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            inert={!active}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1200ms] ease-soft",
              active ? "z-10 opacity-100" : "z-0 opacity-0",
            )}
          >
            {loaded.includes(i) && <HeroPicture slide={slide} eager={i === 0} active={active} />}
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-0",
                light
                  ? "bg-gradient-to-t from-onyx/75 via-onyx/25 to-onyx/10 md:bg-gradient-to-r md:from-onyx/65 md:via-onyx/25 md:to-transparent"
                  : "bg-gradient-to-t from-ivory/85 via-ivory/35 to-transparent md:bg-gradient-to-r md:from-ivory/80 md:via-ivory/30 md:to-transparent",
              )}
            />
            <div className="relative flex h-full items-end pb-28 md:items-center md:pb-0">
              <div className="container-luxe">
                <div key={active ? `active-${index}` : slide.id} className={cn("max-w-2xl", light ? "text-ivory" : "text-ink")}>
                  {slide.eyebrow && (
                    <p className={cn("type-eyebrow", light ? "text-champagne-soft" : "text-champagne-deep", active && "animate-fade-up")}>
                      {slide.eyebrow}
                    </p>
                  )}
                  <h2
                    className={cn("mt-5 type-display-xl text-balance", active && "animate-fade-up")}
                    style={{ animationDelay: "120ms" }}
                  >
                    {slide.title}
                  </h2>
                  {slide.description && (
                    <p
                      className={cn("mt-6 max-w-lg type-body-lg", light ? "text-ivory/85" : "text-ink-soft", active && "animate-fade-up")}
                      style={{ animationDelay: "240ms" }}
                    >
                      {slide.description}
                    </p>
                  )}
                  <div className={cn("mt-9 flex flex-wrap gap-3", active && "animate-fade-up")} style={{ animationDelay: "360ms" }}>
                    <ButtonLink href={slide.primaryCta.href} variant={light ? "light" : "primary"} size="lg">
                      {slide.primaryCta.label}
                    </ButtonLink>
                    {slide.secondaryCta && (
                      <ButtonLink href={slide.secondaryCta.href} variant={light ? "outline-light" : "outline"} size="lg">
                        {slide.secondaryCta.label}
                      </ButtonLink>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {count > 1 && (
        <div className={cn("absolute inset-x-0 bottom-0 z-20 transition-colors duration-700", activeTone === "light" ? "text-ivory" : "text-ink")}>
          <div className="container-luxe flex items-center justify-between gap-6 pb-6 md:pb-10">
            <div className="flex items-center gap-3 sm:gap-5">
              {items.map((slide, i) => {
                const active = i === index;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show slide ${i + 1}: ${slide.title}`}
                    aria-current={active}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className={cn("text-[0.6875rem] tabular-nums tracking-[0.18em] transition-opacity", active ? "opacity-100" : "opacity-55")}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="relative hidden h-px w-10 overflow-hidden bg-current/25 sm:block md:w-16">
                      {active && (
                        <span
                          className={cn("absolute inset-0 origin-left bg-current", autoplay ? "animate-hero-progress" : "")}
                          style={{ animationPlayState: running ? "running" : "paused" }}
                          onAnimationEnd={() => go(index + 1)}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous slide"
                className="hidden h-11 w-11 items-center justify-center rounded-full border border-current/30 transition-colors hover:border-current md:flex"
              >
                <ChevronLeftIcon size={18} />
              </button>
              {autoplay && (
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "Play slideshow" : "Pause slideshow"}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-current/30 transition-colors hover:border-current"
                >
                  {paused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
                </button>
              )}
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next slide"
                className="hidden h-11 w-11 items-center justify-center rounded-full border border-current/30 transition-colors hover:border-current md:flex"
              >
                <ChevronRightIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
