"use client";

import Image from "next/image";
import { useRef, useState, type MouseEvent } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, ExpandIcon, PlayIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";
import type { ImageAsset, VideoAsset } from "@/types/common";

type Slide = { type: "image"; image: ImageAsset } | { type: "video"; video: VideoAsset };

export function ProductGallery({
  images,
  video,
  productName,
  variant = "page",
  priority = false,
}: {
  images: ImageAsset[];
  video?: VideoAsset | null;
  productName: string;
  variant?: "page" | "compact";
  priority?: boolean;
}) {
  const slides: Slide[] = [
    ...images.map((image) => ({ type: "image" as const, image })),
    ...(video ? [{ type: "video" as const, video }] : []),
  ];
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = slides.length;

  function goTo(index: number, behavior: ScrollBehavior = "smooth") {
    const next = (index + count) % count;
    setActive(next);
    const el = trackRef.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior });
  }

  function onScroll() {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== active) setActive(index);
  }

  function onZoomMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  if (count === 0) {
    return <div className="aspect-[4/5] w-full bg-cream" aria-hidden="true" />;
  }

  return (
    <div className={cn("grid gap-4", variant === "page" && count > 1 && "md:grid-cols-[4.5rem_1fr] lg:grid-cols-[5.5rem_1fr] lg:gap-5")}>
      {variant === "page" && count > 1 && (
        <ul className="order-2 hidden gap-3 md:order-1 md:flex md:flex-col" aria-label="Product media">
          {slides.map((slide, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Show ${slide.type === "video" ? "video" : `image ${index + 1}`} of ${count}`}
                aria-current={index === active}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden bg-cream outline-offset-2 transition-opacity duration-300",
                  index === active ? "opacity-100 ring-1 ring-ink" : "opacity-60 hover:opacity-100",
                )}
              >
                {slide.type === "image" ? (
                  <Image src={slide.image.url} alt="" fill sizes="96px" className="object-cover" />
                ) : (
                  <>
                    {slide.video.poster && <Image src={slide.video.poster.url} alt="" fill sizes="96px" className="object-cover" />}
                    <span className="absolute inset-0 flex items-center justify-center bg-onyx/30 text-ivory">
                      <PlayIcon size={18} />
                    </span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative order-1 md:order-2">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          aria-roledescription="carousel"
          aria-label={`${productName} media`}
        >
          {slides.map((slide, index) => (
            <div
              key={index}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              className="relative aspect-[4/5] w-full shrink-0 snap-center overflow-hidden bg-cream"
            >
              {slide.type === "image" ? (
                <div
                  className="group/zoom relative h-full w-full cursor-zoom-in"
                  onMouseMove={variant === "page" ? onZoomMove : undefined}
                  onMouseLeave={() => setZoom(null)}
                  onClick={() => setLightboxOpen(true)}
                >
                  <Image
                    src={slide.image.url}
                    alt={slide.image.alt}
                    fill
                    priority={priority && index === 0}
                    sizes={variant === "page" ? "(min-width: 1024px) 48vw, 100vw" : "(min-width: 768px) 45vw, 100vw"}
                    className="object-cover"
                  />
                  {variant === "page" && zoom && index === active && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 hidden animate-fade-in bg-no-repeat pointer-fine:block"
                      style={{
                        backgroundImage: `url(${slide.image.url})`,
                        backgroundSize: "220%",
                        backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                      }}
                    />
                  )}
                </div>
              ) : (
                <video
                  src={slide.video.url}
                  poster={slide.video.poster?.url}
                  controls
                  playsInline
                  preload="none"
                  className="h-full w-full object-cover"
                >
                  <track kind="captions" />
                </video>
              )}
            </div>
          ))}
        </div>

        <IconButton
          label="Open full-screen gallery"
          onClick={() => setLightboxOpen(true)}
          className="absolute right-3 top-3 h-10 w-10 rounded-full bg-porcelain/90 backdrop-blur"
        >
          <ExpandIcon size={17} />
        </IconButton>

        {count > 1 && (
          <>
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden" aria-hidden="true">
              {slides.map((_, index) => (
                <span key={index} className={cn("h-1 rounded-full bg-ink transition-all duration-300", index === active ? "w-5" : "w-1 opacity-30")} />
              ))}
            </div>
            <div className="absolute inset-y-0 left-3 hidden items-center md:flex">
              <IconButton label="Previous image" onClick={() => goTo(active - 1)} className="h-10 w-10 rounded-full bg-porcelain/90 backdrop-blur">
                <ChevronLeftIcon size={18} />
              </IconButton>
            </div>
            <div className="absolute inset-y-0 right-3 hidden items-center md:flex">
              <IconButton label="Next image" onClick={() => goTo(active + 1)} className="h-10 w-10 rounded-full bg-porcelain/90 backdrop-blur">
                <ChevronRightIcon size={18} />
              </IconButton>
            </div>
          </>
        )}
      </div>

      <Lightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        slides={slides}
        startIndex={active}
        productName={productName}
        onIndexChange={(index) => goTo(index, "auto")}
      />
    </div>
  );
}

function Lightbox({
  open,
  onClose,
  slides,
  startIndex,
  productName,
  onIndexChange,
}: {
  open: boolean;
  onClose: () => void;
  slides: Slide[];
  startIndex: number;
  productName: string;
  onIndexChange: (index: number) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [wasOpen, setWasOpen] = useState(open);
  const count = slides.length;

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setIndex(startIndex);
      setZoomed(false);
    }
  }

  function go(next: number) {
    const value = (next + count) % count;
    setIndex(value);
    setZoomed(false);
    onIndexChange(value);
  }

  const slide = slides[index];

  return (
    <Dialog open={open} onClose={onClose} variant="fullscreen" label={`${productName} gallery`} className="flex flex-col bg-onyx text-ivory" zIndexClassName="z-[90]">
      <div
        className="flex h-full flex-col"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(index + 1);
          if (event.key === "ArrowLeft") go(index - 1);
        }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 md:px-8">
          <p className="type-caption text-ivory/70" aria-live="polite">
            {index + 1} / {count}
          </p>
          <IconButton label="Close gallery" tone="light" onClick={onClose}>
            <CloseIcon size={24} />
          </IconButton>
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {slide?.type === "image" ? (
            <button
              type="button"
              aria-label={zoomed ? "Zoom out" : "Zoom in"}
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setOrigin(`${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`);
                setZoomed((z) => !z);
              }}
              className={cn("relative block h-full w-full", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
            >
              <Image
                src={slide.image.url}
                alt={slide.image.alt}
                fill
                sizes="100vw"
                className="object-contain transition-transform duration-500 ease-luxe"
                style={{ transform: zoomed ? "scale(2.2)" : "scale(1)", transformOrigin: origin }}
              />
            </button>
          ) : slide?.type === "video" ? (
            <video src={slide.video.url} poster={slide.video.poster?.url} controls playsInline autoPlay className="h-full w-full object-contain">
              <track kind="captions" />
            </video>
          ) : null}
          {count > 1 && (
            <>
              <IconButton label="Previous image" tone="light" onClick={() => go(index - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 md:left-6">
                <ChevronLeftIcon size={28} />
              </IconButton>
              <IconButton label="Next image" tone="light" onClick={() => go(index + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 md:right-6">
                <ChevronRightIcon size={28} />
              </IconButton>
            </>
          )}
        </div>
        {count > 1 && (
          <ul className="flex shrink-0 justify-center gap-2 px-4 py-4">
            {slides.map((item, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show item ${i + 1}`}
                  aria-current={i === index}
                  className={cn("relative block h-16 w-12 overflow-hidden bg-onyx-soft transition-opacity", i === index ? "opacity-100 ring-1 ring-ivory" : "opacity-50 hover:opacity-90")}
                >
                  {item.type === "image" ? (
                    <Image src={item.image.url} alt="" fill sizes="48px" className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <PlayIcon size={16} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
