"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition, type ReactNode } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  SpinnerIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { ProductCard } from "@/components/product/ProductCard";
import { Button, ButtonLink, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/primitives";
import {
  countActiveFilters,
  filtersToSearchParams,
  priceRanges,
  rangeMatches,
  sortOptions,
  weightRanges,
  type RangeOption,
} from "@/lib/catalog/filters";
import { cn, formatINR, pluralize } from "@/lib/utils";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import type { FacetOption, ProductFilters, ProductListResponse, SortOption, Subcategory } from "@/types/catalog";

export type LockedFacet = "category" | "metal" | "gender" | "collection";
type ListKey = "category" | "metal" | "purity" | "gender" | "size";

const gridSizes = "(min-width: 1536px) 20vw, (min-width: 1280px) 24vw, (min-width: 1024px) 34vw, (min-width: 768px) 30vw, 48vw";

export function CatalogueView({
  result,
  filters,
  lockedFacets = [],
  subcategories = [],
}: {
  result: ProductListResponse;
  filters: ProductFilters;
  lockedFacets?: LockedFacet[];
  subcategories?: Subcategory[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const view = searchParams.get("view") === "list" ? "list" : "grid";
  const activeCount = countActiveFilters(filters);

  function hrefFor(next: ProductFilters, nextView: "grid" | "list" = view) {
    const params = filtersToSearchParams({ ...next, base: undefined });
    // Locked facets are part of the page itself (path or collection), never duplicated in the query.
    if (lockedFacets.includes("collection")) params.delete("collection");
    if (nextView === "list") params.set("view", "list");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(next: ProductFilters, nextView?: "grid" | "list") {
    startTransition(() => {
      router.push(hrefFor(next, nextView), { scroll: false });
    });
  }

  const update = (patch: Partial<ProductFilters>) => navigate({ ...filters, ...patch, page: undefined });

  function toggle(key: ListKey, value: string) {
    const current = (filters[key] ?? []) as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update({ [key]: next } as Partial<ProductFilters>);
  }

  function clearAll() {
    navigate({ base: filters.base, collection: filters.collection, q: filters.q, sort: filters.sort });
  }

  const chips = buildChips(filters, result.facets, subcategories, lockedFacets);

  const panel = (
    <FilterPanel
      filters={filters}
      facets={result.facets}
      locked={lockedFacets}
      onToggle={toggle}
      onUpdate={update}
    />
  );

  return (
    <div className="container-luxe pb-24">
      {subcategories.length > 0 && (
        <div className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] pt-8 lg:mx-0 lg:flex-wrap lg:px-0">
          {[{ slug: undefined, name: "All" }, ...subcategories].map((sub) => {
            const active = filters.sub === sub.slug;
            return (
              <button
                key={sub.slug ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => update({ sub: sub.slug })}
                className={cn(
                  "h-10 shrink-0 border px-5 type-caption tracking-[0.14em] transition-colors",
                  active ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink hover:text-ink",
                )}
              >
                {sub.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="sticky top-[var(--header-height)] z-30 -mx-[var(--gutter)] mb-8 border-b border-line bg-ivory/95 px-[var(--gutter)] backdrop-blur-md lg:mx-0 lg:px-0">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-haspopup="dialog"
              className="flex h-10 items-center gap-2 border border-line px-4 type-caption tracking-[0.16em] text-ink transition-colors hover:border-ink lg:hidden"
            >
              <FilterIcon size={16} />
              Filters
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-[0.625rem] tracking-normal text-ivory">
                  {activeCount}
                </span>
              )}
            </button>
            <p className="hidden items-center gap-2 type-body-sm text-muted sm:flex" aria-live="polite">
              {isPending ? (
                <>
                  <SpinnerIcon size={14} className="animate-spin" /> Updating results
                </>
              ) : (
                pluralize(result.total, "piece")
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <label className="flex items-center gap-2.5">
              <span className="hidden type-caption tracking-[0.16em] text-muted md:inline">Sort by</span>
              <span className="relative">
                <select
                  value={filters.sort ?? "featured"}
                  onChange={(event) => update({ sort: event.target.value as SortOption })}
                  aria-label="Sort products"
                  className="h-10 appearance-none border border-line bg-porcelain pl-3 pr-9 type-body-sm text-ink outline-none transition-colors hover:border-line-strong focus:border-ink"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </span>
            </label>
            <div className="hidden border border-line sm:flex" role="group" aria-label="Layout">
              {(["grid", "list"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={view === mode}
                  aria-label={mode === "grid" ? "Grid view" : "List view"}
                  onClick={() => navigate(filters, mode)}
                  className={cn("flex h-10 w-10 items-center justify-center transition-colors", view === mode ? "bg-ink text-ivory" : "text-muted hover:text-ink")}
                >
                  {mode === "grid" ? <GridIcon size={17} /> : <ListIcon size={17} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[16rem_1fr] xl:grid-cols-[17rem_1fr] xl:gap-14">
        <aside aria-label="Product filters" className="hidden lg:block">
          <div className="no-scrollbar sticky top-[calc(var(--header-height)+5rem)] max-h-[calc(100dvh-var(--header-height)-6rem)] overflow-y-auto pb-6 pr-2">
            {panel}
          </div>
        </aside>

        <div className="min-w-0">
          {chips.length > 0 && (
            <div className="mb-8 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => navigate({ ...chip.remove(filters), page: undefined })}
                  className="inline-flex h-9 items-center gap-2 border border-line bg-porcelain pl-3.5 pr-2.5 type-body-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  aria-label={`Remove filter: ${chip.label}`}
                >
                  {chip.label}
                  <CloseIcon size={13} />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="ml-2 type-caption tracking-[0.14em] text-ink link-underline-static">
                Clear all
              </button>
            </div>
          )}

          <div aria-busy={isPending} className={cn("transition-opacity duration-300", isPending && "pointer-events-none opacity-45")}>
            {result.items.length === 0 ? (
              <EmptyState
                icon={SearchIcon}
                title="No pieces match your selection"
                description="Try removing a filter or explore the full collection."
                className="border border-line bg-porcelain px-6"
              >
                {activeCount > 0 && (
                  <Button variant="outline" onClick={clearAll}>
                    Clear Filters
                  </Button>
                )}
                <ButtonLink href="/shop">Browse All Jewellery</ButtonLink>
                <a
                  href={whatsappUrl(whatsappMessages.general())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex w-full items-center justify-center gap-2 type-body-sm text-whatsapp underline-offset-4 hover:underline"
                >
                  <WhatsAppIcon size={16} />
                  Can&apos;t find it? Ask us on WhatsApp
                </a>
              </EmptyState>
            ) : view === "list" ? (
              <ul className="flex flex-col gap-10">
                {result.items.map((product) => (
                  <li key={product.id} className="border-b border-line pb-10 last:border-b-0">
                    <ProductCard product={product} layout="list" headingLevel={2} sizes="(min-width: 768px) 14rem, 9rem" />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {result.items.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard product={product} headingLevel={2} priority={index < 2} sizes={gridSizes} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {result.totalPages > 1 && <Pagination current={result.page} total={result.totalPages} hrefFor={(page) => hrefFor({ ...filters, page })} />}
        </div>
      </div>

      <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} variant="drawer-left" label="Filters">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-line pl-6 pr-3">
          <p className="type-h3 text-ink">Filters</p>
          <IconButton label="Close filters" onClick={() => setDrawerOpen(false)}>
            <CloseIcon size={22} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-6">{panel}</div>
        <div className="safe-bottom grid shrink-0 grid-cols-2 gap-3 border-t border-line bg-porcelain px-6 py-4">
          <Button variant="outline" onClick={clearAll} disabled={activeCount === 0}>
            Clear All
          </Button>
          <Button onClick={() => setDrawerOpen(false)} loading={isPending}>
            Show {result.total}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter panel                                                        */
/* ------------------------------------------------------------------ */

function FilterPanel({
  filters,
  facets,
  locked,
  onToggle,
  onUpdate,
}: {
  filters: ProductFilters;
  facets: ProductListResponse["facets"];
  locked: LockedFacet[];
  onToggle: (key: ListKey, value: string) => void;
  onUpdate: (patch: Partial<ProductFilters>) => void;
}) {
  const listGroup = (title: string, key: ListKey, options: FacetOption[], defaultOpen = true) =>
    options.length > 0 && (
      <FilterGroup title={title} defaultOpen={defaultOpen} activeCount={(filters[key] as string[] | undefined)?.length ?? 0}>
        {options.map((option) => (
          <OptionControl
            key={option.value}
            type="checkbox"
            label={option.label}
            count={option.count}
            checked={((filters[key] as string[] | undefined) ?? []).includes(option.value)}
            onChange={() => onToggle(key, option.value)}
          />
        ))}
      </FilterGroup>
    );

  const rangeGroup = (title: string, options: RangeOption[], min: number | undefined, max: number | undefined, apply: (range?: RangeOption) => void) => (
    <FilterGroup title={title} defaultOpen activeCount={min !== undefined || max !== undefined ? 1 : 0}>
      {options.map((option) => (
        <OptionControl
          key={option.id}
          type="radio"
          name={title}
          label={option.label}
          checked={rangeMatches(option, min, max)}
          onChange={() => apply(rangeMatches(option, min, max) ? undefined : option)}
        />
      ))}
      {(min !== undefined || max !== undefined) && (
        <button type="button" onClick={() => apply(undefined)} className="mt-2 type-body-sm text-muted underline underline-offset-2 hover:text-ink">
          Reset
        </button>
      )}
    </FilterGroup>
  );

  return (
    <div>
      {!locked.includes("category") && listGroup("Category", "category", facets.categories)}
      {!locked.includes("metal") && listGroup("Metal", "metal", facets.metals)}
      {listGroup("Purity", "purity", facets.purities)}
      {rangeGroup("Price", priceRanges, filters.minPrice, filters.maxPrice, (range) => onUpdate({ minPrice: range?.min, maxPrice: range?.max }))}
      {rangeGroup("Weight", weightRanges, filters.minWeight, filters.maxWeight, (range) => onUpdate({ minWeight: range?.min, maxWeight: range?.max }))}
      {listGroup("Size", "size", facets.sizes)}
      {!locked.includes("gender") && listGroup("Gender", "gender", facets.genders, false)}
      {!locked.includes("collection") && facets.collections.length > 0 && (
        <FilterGroup title="Collection" defaultOpen={false} activeCount={filters.collection ? 1 : 0}>
          {facets.collections.map((option) => (
            <OptionControl
              key={option.value}
              type="radio"
              name="collection"
              label={option.label}
              count={option.count}
              checked={filters.collection === option.value}
              onChange={() => onUpdate({ collection: filters.collection === option.value ? undefined : option.value })}
            />
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Availability & Highlights" defaultOpen activeCount={[filters.inStock, filters.newArrival, filters.bestSeller].filter(Boolean).length}>
        <OptionControl type="checkbox" label="In stock only" checked={Boolean(filters.inStock)} onChange={() => onUpdate({ inStock: filters.inStock ? undefined : true })} />
        <OptionControl type="checkbox" label="New arrivals" checked={Boolean(filters.newArrival)} onChange={() => onUpdate({ newArrival: filters.newArrival ? undefined : true })} />
        <OptionControl type="checkbox" label="Best sellers" checked={Boolean(filters.bestSeller)} onChange={() => onUpdate({ bestSeller: filters.bestSeller ? undefined : true })} />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children, defaultOpen = true, activeCount = 0 }: { title: string; children: ReactNode; defaultOpen?: boolean; activeCount?: number }) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0);
  const id = useId();
  return (
    <div className="border-b border-line py-5">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 text-left type-caption tracking-[0.18em] text-ink"
        >
          <span>
            {title}
            {activeCount > 0 && <span className="ml-2 text-champagne-deep">({activeCount})</span>}
          </span>
          <ChevronDownIcon size={14} className={cn("transition-transform duration-300", open && "rotate-180")} />
        </button>
      </h2>
      <div id={id} hidden={!open} className="mt-4 space-y-0.5">
        {children}
      </div>
    </div>
  );
}

function OptionControl({
  type,
  label,
  count,
  checked,
  onChange,
  name,
}: {
  type: "checkbox" | "radio";
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
  name?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="group flex min-h-9 cursor-pointer items-center justify-between gap-3">
      <span className="flex items-center gap-3">
        <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
          <input
            id={id}
            type={type === "radio" ? "checkbox" : "checkbox"}
            role={type === "radio" ? "radio" : undefined}
            aria-checked={checked}
            name={name}
            checked={checked}
            onChange={onChange}
            className={cn(
              "peer absolute inset-0 h-full w-full cursor-pointer appearance-none border border-line-strong bg-porcelain transition-colors checked:border-ink checked:bg-ink",
              type === "radio" && "rounded-full",
            )}
          />
          {type === "checkbox" ? (
            <CheckIcon size={11} strokeWidth={2.2} className="pointer-events-none relative text-ivory opacity-0 peer-checked:opacity-100" />
          ) : (
            <span className="pointer-events-none relative h-1.5 w-1.5 rounded-full bg-ivory opacity-0 peer-checked:opacity-100" />
          )}
        </span>
        <span className={cn("type-body-sm transition-colors", checked ? "text-ink" : "text-ink-soft group-hover:text-ink")}>{label}</span>
      </span>
      {count !== undefined && <span className="type-body-sm text-subtle tabular-nums">{count}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Active filter chips                                                 */
/* ------------------------------------------------------------------ */

interface Chip {
  key: string;
  label: string;
  remove: (filters: ProductFilters) => ProductFilters;
}

function rangeLabel(options: RangeOption[], min?: number, max?: number, format: (n: number) => string = String) {
  const match = options.find((option) => rangeMatches(option, min, max));
  if (match) return match.label;
  if (min !== undefined && max !== undefined) return `${format(min)} – ${format(max)}`;
  if (min !== undefined) return `From ${format(min)}`;
  return `Up to ${format(max!)}`;
}

function buildChips(filters: ProductFilters, facets: ProductListResponse["facets"], subcategories: Subcategory[], locked: LockedFacet[]): Chip[] {
  const chips: Chip[] = [];
  const labelFrom = (options: FacetOption[], value: string) => options.find((o) => o.value === value)?.label ?? value;
  const listChips = (key: ListKey, options: FacetOption[]) => {
    for (const value of (filters[key] as string[] | undefined) ?? []) {
      chips.push({
        key: `${key}-${value}`,
        label: labelFrom(options, value),
        remove: (f) => ({ ...f, [key]: ((f[key] as string[] | undefined) ?? []).filter((v) => v !== value) }),
      });
    }
  };
  if (filters.sub) {
    chips.push({ key: "sub", label: subcategories.find((s) => s.slug === filters.sub)?.name ?? filters.sub, remove: (f) => ({ ...f, sub: undefined }) });
  }
  listChips("category", facets.categories);
  listChips("metal", facets.metals);
  listChips("purity", facets.purities);
  listChips("gender", facets.genders);
  listChips("size", facets.sizes);
  if (filters.collection && !locked.includes("collection")) {
    chips.push({ key: "collection", label: labelFrom(facets.collections, filters.collection), remove: (f) => ({ ...f, collection: undefined }) });
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    chips.push({
      key: "price",
      label: rangeLabel(priceRanges, filters.minPrice, filters.maxPrice, formatINR),
      remove: (f) => ({ ...f, minPrice: undefined, maxPrice: undefined }),
    });
  }
  if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
    chips.push({
      key: "weight",
      label: rangeLabel(weightRanges, filters.minWeight, filters.maxWeight, (n) => `${n} g`),
      remove: (f) => ({ ...f, minWeight: undefined, maxWeight: undefined }),
    });
  }
  if (filters.inStock) chips.push({ key: "inStock", label: "In stock only", remove: (f) => ({ ...f, inStock: undefined }) });
  if (filters.newArrival) chips.push({ key: "new", label: "New arrivals", remove: (f) => ({ ...f, newArrival: undefined }) });
  if (filters.bestSeller) chips.push({ key: "best", label: "Best sellers", remove: (f) => ({ ...f, bestSeller: undefined }) });
  return chips;
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const output: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) output.push("gap");
    output.push(page);
  });
  return output;
}

function Pagination({ current, total, hrefFor }: { current: number; total: number; hrefFor: (page: number) => string }) {
  const linkClass = "flex h-11 min-w-11 items-center justify-center border px-3 type-body-sm transition-colors";
  return (
    <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
      {current > 1 ? (
        <Link href={hrefFor(current - 1)} className={cn(linkClass, "border-line text-ink hover:border-ink")} aria-label="Previous page">
          <ChevronLeftIcon size={16} />
        </Link>
      ) : (
        <span className={cn(linkClass, "border-line text-subtle opacity-50")} aria-hidden="true">
          <ChevronLeftIcon size={16} />
        </span>
      )}
      {pageList(current, total).map((page, index) =>
        page === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-subtle" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={page}
            href={hrefFor(page)}
            aria-current={page === current ? "page" : undefined}
            aria-label={`Page ${page}`}
            className={cn(linkClass, page === current ? "border-ink bg-ink text-ivory" : "border-line text-ink hover:border-ink")}
          >
            {page}
          </Link>
        ),
      )}
      {current < total ? (
        <Link href={hrefFor(current + 1)} className={cn(linkClass, "border-line text-ink hover:border-ink")} aria-label="Next page">
          <ChevronRightIcon size={16} />
        </Link>
      ) : (
        <span className={cn(linkClass, "border-line text-subtle opacity-50")} aria-hidden="true">
          <ChevronRightIcon size={16} />
        </span>
      )}
    </nav>
  );
}
