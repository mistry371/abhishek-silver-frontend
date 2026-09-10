"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { controlClass } from "@/components/admin/fields";
import { SearchIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { number } from "@/lib/admin/format";
import { useAdminResource, useDebouncedValue } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";
import { metalPurity } from "./options";
import type { ProductOption } from "./types";

/** Searches `GET /products?q=` and returns the chosen product. */
export function ProductPicker({ id, onSelect, error, label = "Search product" }: { id?: string; onSelect: (product: ProductOption) => void; error?: string; label?: string }) {
  const auto = useId();
  const inputId = id ?? auto;
  const listId = `${inputId}-results`;
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebouncedValue(term.trim(), 300);
  const searching = open && debounced.length >= 2;
  const results = useAdminResource<Paginated<ProductOption>>(searching ? "/products" : null, { q: debounced, pageSize: 8 });
  const items = searching ? (results.data?.items ?? []) : [];
  const activeIndex = Math.min(active, Math.max(items.length - 1, 0));
  const showList = open && term.trim().length > 0;

  function choose(product: ProductOption) {
    onSelect(product);
    setTerm("");
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (items.length) setActive((activeIndex + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length) setActive((activeIndex - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      // Never submit the surrounding form from the picker.
      event.preventDefault();
      if (showList && items[activeIndex]) choose(items[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <SearchIcon size={15} className="pointer-events-none absolute left-3 top-[1.25rem] -translate-y-1/2 text-muted" />
      <input
        id={inputId}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && items[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete="off"
        value={term}
        placeholder="Search by name, SKU or barcode"
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={controlClass(error, "h-10 pl-9")}
      />
      {showList && (
        <div id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto border border-line-strong bg-porcelain shadow-lg">
          {term.trim().length < 2 ? (
            <p className="px-3 py-2.5 text-[0.8125rem] text-muted">Type at least 2 characters.</p>
          ) : results.error ? (
            <p className="px-3 py-2.5 text-[0.8125rem] text-danger">{results.error.code === "forbidden" ? "You don't have access to search products." : results.error.message}</p>
          ) : !results.data || debounced !== term.trim() ? (
            <p className="px-3 py-2.5 text-[0.8125rem] text-muted">Searching…</p>
          ) : items.length === 0 ? (
            <p className="px-3 py-2.5 text-[0.8125rem] text-muted">No products match “{debounced}”.</p>
          ) : (
            items.map((product, index) => (
              <div
                key={product.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(product)}
                className={cn("flex cursor-pointer items-center justify-between gap-3 border-b border-line px-3 py-2 text-[0.8125rem] last:border-0", index === activeIndex && "bg-cream")}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{product.name}</span>
                  <span className="block truncate text-[0.75rem] text-muted">
                    {product.sku} · {metalPurity(product.metal, product.purity)}
                    {product.status !== "active" && ` · ${product.status}`}
                  </span>
                </span>
                <span className="shrink-0 text-[0.75rem] tabular-nums text-muted">{number(product.stock)} in stock</span>
              </div>
            ))
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
