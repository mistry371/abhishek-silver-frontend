"use client";

import { useId, useState, type ReactNode } from "react";
import { controlClass } from "@/components/admin/fields";
import { SearchIcon } from "@/components/icons";
import type { Paginated, Query } from "@/lib/admin/client";
import { metalLabels, money, purityLabels } from "@/lib/admin/format";
import { useAdminResource, useDebouncedValue } from "@/lib/admin/hooks";
import { cn } from "@/lib/utils";
import type { CustomerOption, ProductOption } from "./types";

interface SearchPickerProps<T> {
  label: string;
  placeholder?: string;
  path: string;
  query?: Query;
  getKey: (row: T) => string;
  renderOption: (row: T) => ReactNode;
  onSelect: (row: T) => void;
  hint?: ReactNode;
  error?: string;
  forbiddenMessage?: string;
  disabled?: boolean;
  minChars?: number;
}

/** Type-ahead search against a paginated admin list endpoint (`?q=`). */
export function SearchPicker<T>({ label, placeholder, path, query, getKey, renderOption, onSelect, hint, error, forbiddenMessage, disabled, minChars = 2 }: SearchPickerProps<T>) {
  const id = useId();
  const [term, setTerm] = useState("");
  const trimmed = term.trim();
  const debounced = useDebouncedValue(trimmed, 300);
  const enabled = debounced.length >= minChars;
  const { data, latest, loading, error: loadError } = useAdminResource<Paginated<T>>(enabled ? path : null, { ...query, q: debounced, pageSize: 8 });
  const rows = enabled ? (data ?? latest)?.items : undefined;
  const open = trimmed.length >= minChars;
  const pending = trimmed !== debounced || loading;

  return (
    <div className="relative flex min-w-0 flex-col">
      <label htmlFor={id} className="mb-1.5 text-[0.75rem] font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id={id}
          type="search"
          autoComplete="off"
          value={term}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
            if (event.key === "Escape") setTerm("");
          }}
          className={controlClass(error, "h-10 pl-9")}
        />
      </div>
      {hint && !error && <p className="mt-1 text-[0.75rem] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto border border-line-strong bg-porcelain shadow-lg">
          {loadError ? (
            <p className="px-3 py-3 text-[0.8125rem] text-danger">{loadError.code === "forbidden" && forbiddenMessage ? forbiddenMessage : loadError.message}</p>
          ) : !rows || (rows.length === 0 && pending) ? (
            <p className="px-3 py-3 text-[0.8125rem] text-muted">Searching…</p>
          ) : rows.length === 0 ? (
            <p className="px-3 py-3 text-[0.8125rem] text-muted">No matches for “{debounced}”.</p>
          ) : (
            <ul aria-label={`${label} results`} className={cn("divide-y divide-line", pending && "opacity-60")}>
              {rows.map((row) => (
                <li key={getKey(row)}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(row);
                      setTerm("");
                    }}
                    className="block w-full px-3 py-2 text-left text-[0.8125rem] hover:bg-cream focus:bg-cream focus:outline-none"
                  >
                    {renderOption(row)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function CustomerSearch({ onSelect, error, label = "Find an existing customer" }: { onSelect: (customer: CustomerOption) => void; error?: string; label?: string }) {
  return (
    <SearchPicker<CustomerOption>
      label={label}
      placeholder="Name, mobile, email or customer code"
      path="/customers"
      getKey={(customer) => customer.id}
      onSelect={onSelect}
      error={error}
      forbiddenMessage="Your role can't search customers. Enter the customer's details instead."
      renderOption={(customer) => (
        <>
          <span className="block font-medium text-ink">{customer.name || "Unnamed customer"}</span>
          <span className="block text-muted">{[customer.phone, customer.email, customer.customerCode].filter(Boolean).join(" · ") || "No contact details"}</span>
        </>
      )}
    />
  );
}

export function ProductSearch({ onSelect, disabled, error }: { onSelect: (product: ProductOption) => void; disabled?: boolean; error?: string }) {
  return (
    <SearchPicker<ProductOption>
      label="Add a product"
      placeholder="Product name, SKU or barcode"
      path="/products"
      query={{ status: "active" }}
      getKey={(product) => product.id}
      onSelect={onSelect}
      disabled={disabled}
      error={error}
      forbiddenMessage="Your role can't search products."
      renderOption={(product) => (
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{product.name}</span>
            <span className="block text-muted">
              {product.sku} · {metalLabels[product.metal] ?? product.metal} {purityLabels[product.purity] ?? product.purity}
            </span>
            {product.pricingError && <span className="block text-danger">{product.pricingError}</span>}
          </span>
          <span className="shrink-0 text-right">
            <span className="block tabular-nums text-ink">{money(product.finalPrice)}</span>
            <span className={cn("block text-[0.75rem]", product.stock <= 0 ? "text-danger" : "text-muted")}>{product.stock} in stock (all locations)</span>
          </span>
        </span>
      )}
    />
  );
}
