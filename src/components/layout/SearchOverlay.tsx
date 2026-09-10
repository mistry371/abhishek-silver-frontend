"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertIcon, ArrowRightIcon, ClockIcon, CloseIcon, SearchIcon, WhatsAppIcon } from "@/components/icons";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/primitives";
import { useDebouncedValue } from "@/hooks/useHydrated";
import { getTrendingProducts, searchProducts } from "@/lib/api/services/catalog";
import { metalPurityLabel } from "@/lib/catalog/filters";
import { cn, formatINR } from "@/lib/utils";
import { whatsappUrl } from "@/lib/whatsapp";
import { useRecentSearches, useUIStore } from "@/stores/ui";
import type { ProductSummary, SearchSuggestions } from "@/types/catalog";

const popularSearches = ["Gold rings", "Mangalsutra", "Jhumka", "Silver earrings", "Bangles", "22KT", "Chain", "Pendant"];

const quickCategories = [
  { label: "Rings", href: "/shop/rings" },
  { label: "Earrings", href: "/shop/earrings" },
  { label: "Necklaces", href: "/shop/necklaces" },
  { label: "Bangles", href: "/shop/bangles" },
  { label: "Gold", href: "/shop/gold-jewellery" },
  { label: "Silver", href: "/shop/silver-jewellery" },
];

type SearchState =
  | { status: "idle" }
  | { status: "loading"; previous?: SearchSuggestions }
  | { status: "success"; data: SearchSuggestions }
  | { status: "error" };

type SearchResult =
  | { query: string; attempt: number; status: "success"; data: SearchSuggestions }
  | { query: string; attempt: number; status: "error" };

export function SearchOverlay() {
  const open = useUIStore((s) => s.searchOpen);
  const setOpen = useUIStore((s) => s.setSearchOpen);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [trending, setTrending] = useState<ProductSummary[] | null>(null);
  const debounced = useDebouncedValue(query.trim(), 250);

  const recent = useRecentSearches((s) => s.terms);
  const addRecent = useRecentSearches((s) => s.add);
  const removeRecent = useRecentSearches((s) => s.remove);
  const clearRecent = useRecentSearches((s) => s.clear);

  useEffect(() => {
    if (!open || trending) return;
    let active = true;
    getTrendingProducts(4)
      .then((items) => active && setTrending(items))
      .catch(() => active && setTrending([]));
    return () => {
      active = false;
    };
  }, [open, trending]);

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    searchProducts(debounced, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ query: debounced, attempt, status: "success", data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ query: debounced, attempt, status: "error" });
      });
    return () => controller.abort();
  }, [debounced, attempt]);

  // Derive the visible state from the latest result for the current query.
  const current = result && result.query === debounced && result.attempt === attempt ? result : null;
  const state: SearchState =
    debounced.length < 2
      ? { status: "idle" }
      : current
        ? current.status === "success"
          ? { status: "success", data: current.data }
          : { status: "error" }
        : { status: "loading", previous: result?.status === "success" ? result.data : undefined };

  const close = () => setOpen(false);

  function submit(term: string) {
    const clean = term.trim();
    if (clean.length < 2) return;
    addRecent(clean);
    close();
    router.push(`/search?q=${encodeURIComponent(clean)}`);
  }

  function rememberAndClose() {
    if (query.trim().length >= 2) addRecent(query.trim());
    close();
  }

  const data = state.status === "success" ? state.data : state.status === "loading" ? state.previous : undefined;
  const noResults = state.status === "success" && data && data.total === 0 && data.categories.length === 0 && data.collections.length === 0;
  const statusMessage =
    state.status === "loading"
      ? "Searching…"
      : state.status === "success" && data
        ? `${data.total} ${data.total === 1 ? "piece" : "pieces"} found`
        : state.status === "error"
          ? "Search is unavailable right now."
          : "";

  return (
    <Dialog
      open={open}
      onClose={close}
      variant="fullscreen"
      label="Search"
      initialFocus={inputRef}
      className="md:h-auto md:max-h-[90dvh] md:border-b md:border-line"
    >
      <div className="container-luxe pb-10">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            submit(query);
          }}
          className="mt-2 flex items-center gap-3 border-b border-ink/80 py-4 md:mt-8 md:py-5"
        >
          <SearchIcon size={24} className="shrink-0 text-muted" />
          <label htmlFor="site-search-input" className="sr-only">
            Search jewellery
          </label>
          <input
            ref={inputRef}
            id="site-search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search rings, necklaces, SKU…"
            autoComplete="off"
            enterKeyHint="search"
            aria-describedby="site-search-status"
            className="min-w-0 flex-1 bg-transparent font-serif text-[1.55rem] leading-tight text-ink outline-none placeholder:text-subtle focus-visible:outline-none md:text-[2.4rem] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="shrink-0 type-caption text-muted transition-colors hover:text-ink"
            >
              Clear
            </button>
          )}
          <IconButton label="Close search" onClick={close} className="-mr-2">
            <CloseIcon size={24} />
          </IconButton>
        </form>
        <p id="site-search-status" className="sr-only" aria-live="polite">
          {statusMessage}
        </p>

        <div className="min-h-[40vh] pt-8 md:pt-10">
          {debounced.length < 2 && (
            <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
              <div className="space-y-10">
                {recent.length > 0 && (
                  <section aria-labelledby="recent-searches-title">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 id="recent-searches-title" className="type-eyebrow text-champagne-deep">
                        Recent Searches
                      </h2>
                      <button type="button" onClick={clearRecent} className="type-caption text-muted hover:text-ink">
                        Clear all
                      </button>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {recent.map((term) => (
                        <li key={term} className="flex items-center border border-line bg-porcelain">
                          <button type="button" onClick={() => setQuery(term)} className="flex items-center gap-2 py-2 pl-3.5 pr-2 type-body-sm text-ink-soft hover:text-ink">
                            <ClockIcon size={14} />
                            {term}
                          </button>
                          <button type="button" onClick={() => removeRecent(term)} aria-label={`Remove ${term} from recent searches`} className="px-2 py-2 text-subtle hover:text-ink">
                            <CloseIcon size={13} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <section aria-labelledby="popular-searches-title">
                  <h2 id="popular-searches-title" className="mb-4 type-eyebrow text-champagne-deep">
                    Popular Searches
                  </h2>
                  <ul className="flex flex-wrap gap-2">
                    {popularSearches.map((term) => (
                      <li key={term}>
                        <button
                          type="button"
                          onClick={() => setQuery(term)}
                          className="border border-line px-4 py-2 type-body-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
                        >
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
                <section aria-labelledby="quick-categories-title">
                  <h2 id="quick-categories-title" className="mb-4 type-eyebrow text-champagne-deep">
                    Shop by Category
                  </h2>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                    {quickCategories.map((category) => (
                      <li key={category.href}>
                        <Link href={category.href} onClick={close} className="type-body text-ink link-underline">
                          {category.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              <section aria-labelledby="trending-search-title">
                <h2 id="trending-search-title" className="mb-5 type-eyebrow text-champagne-deep">
                  Trending Now
                </h2>
                <ProductTiles products={trending} onNavigate={close} />
              </section>
            </div>
          )}

          {debounced.length >= 2 && state.status === "error" && (
            <div className="flex flex-col items-start gap-4 py-6">
              <p className="flex items-center gap-2 type-body text-ink">
                <AlertIcon size={18} className="text-danger" />
                We couldn&apos;t load search results. Please try again.
              </p>
              <Button variant="outline" size="sm" onClick={() => setAttempt((a) => a + 1)}>
                Retry
              </Button>
            </div>
          )}

          {debounced.length >= 2 && state.status === "loading" && !data && (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="aspect-[4/5] w-full" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/3" />
                </div>
              ))}
            </div>
          )}

          {debounced.length >= 2 && noResults && (
            <div className="max-w-xl py-4">
              <h2 className="type-h3 text-ink">No pieces match “{debounced}”</h2>
              <p className="mt-3 type-body text-muted">Check the spelling, try a broader term, or explore a popular search.</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {popularSearches.slice(0, 5).map((term) => (
                  <li key={term}>
                    <button type="button" onClick={() => setQuery(term)} className="border border-line px-4 py-2 type-body-sm text-ink-soft hover:border-ink hover:text-ink">
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
              <a
                href={whatsappUrl(`Hello, I'm looking for "${debounced}". Can you help?`)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 type-button text-whatsapp link-underline-static"
              >
                <WhatsAppIcon size={18} />
                Ask us on WhatsApp
              </a>
            </div>
          )}

          {debounced.length >= 2 && data && !noResults && (
            <div className={cn("grid gap-10 transition-opacity md:grid-cols-[13rem_1fr] lg:gap-16", state.status === "loading" && "opacity-60")}>
              <div className="space-y-8">
                {data.categories.length > 0 && (
                  <SuggestionList title="Categories" links={data.categories} onNavigate={rememberAndClose} />
                )}
                {data.collections.length > 0 && (
                  <SuggestionList title="Collections" links={data.collections} onNavigate={rememberAndClose} />
                )}
                {data.categories.length === 0 && data.collections.length === 0 && (
                  <p className="type-body-sm text-muted">Showing products matching “{data.query}”.</p>
                )}
              </div>
              <div>
                <div className="mb-5 flex items-baseline justify-between gap-4">
                  <h2 className="type-eyebrow text-champagne-deep">Products</h2>
                  {data.total > 0 && (
                    <button type="button" onClick={() => submit(debounced)} className="inline-flex items-center gap-2 type-button link-underline-static">
                      View all {data.total}
                      <ArrowRightIcon size={14} />
                    </button>
                  )}
                </div>
                {data.products.length > 0 ? (
                  <ProductTiles products={data.products} onNavigate={rememberAndClose} dense />
                ) : (
                  <p className="type-body-sm text-muted">No individual pieces matched — try the categories on the left.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function SuggestionList({
  title,
  links,
  onNavigate,
}: {
  title: string;
  links: { label: string; href: string; meta?: string }[];
  onNavigate: () => void;
}) {
  return (
    <section>
      <h2 className="mb-4 type-eyebrow text-champagne-deep">{title}</h2>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} onClick={onNavigate} className="group flex items-baseline justify-between gap-3">
              <span className="type-body text-ink link-underline">{link.label}</span>
              {link.meta && <span className="shrink-0 type-body-sm text-subtle">{link.meta}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProductTiles({ products, onNavigate, dense = false }: { products: ProductSummary[] | null; onNavigate: () => void; dense?: boolean }) {
  if (products === null) {
    return (
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-3 h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }
  if (products.length === 0) return <p className="type-body-sm text-muted">Explore our latest pieces in the shop.</p>;
  return (
    <ul className={cn("grid grid-cols-2 gap-x-5 gap-y-8", dense ? "sm:grid-cols-3 xl:grid-cols-6" : "sm:grid-cols-4")}>
      {products.map((product) => (
        <li key={product.id}>
          <Link href={`/product/${product.slug}`} onClick={onNavigate} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden bg-cream">
              <Image
                src={product.images[0].url}
                alt={product.images[0].alt}
                fill
                sizes="(min-width: 1280px) 14vw, (min-width: 640px) 30vw, 45vw"
                className="object-cover transition-transform duration-700 ease-luxe group-hover:scale-[1.04]"
              />
            </div>
            <p className="mt-3 text-[0.625rem] uppercase tracking-[0.16em] text-muted">{metalPurityLabel(product.metal, product.purity)}</p>
            <p className="mt-1 font-serif text-[1.05rem] leading-snug text-ink">{product.name}</p>
            <p className="mt-1 type-body-sm font-medium text-ink tabular-nums">{formatINR(product.finalPrice)}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
