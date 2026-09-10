"use client";

import { useId, useState } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CloseIcon, SearchIcon } from "@/components/icons";
import type { Paginated } from "@/lib/admin/client";
import { useAdminResource, useDebouncedValue } from "@/lib/admin/hooks";

interface CustomerOption {
  id: string;
  customerCode: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/** Customer search (`GET /customers?q=`) for reports that need one customer. */
export function CustomerPicker({
  selectedId,
  selectedLabel,
  onSelect,
  onClear,
}: {
  selectedId: string;
  selectedLabel?: string;
  onSelect: (customer: { id: string; label: string }) => void;
  onClear: () => void;
}) {
  const { can } = useAdmin();
  const allowed = can("customers:view");
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const term = useDebouncedValue(query.trim(), 250);
  const searching = allowed && open && term.length >= 2;
  const { data, loading, error } = useAdminResource<Paginated<CustomerOption>>(searching ? "/customers" : null, { q: term, pageSize: 8 });
  const results = data?.items ?? [];

  function choose(customer: CustomerOption) {
    onSelect({ id: customer.id, label: `${customer.customerCode} · ${customer.name || "Unnamed customer"}` });
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex min-w-[16rem] flex-1 flex-col sm:max-w-md">
      <label htmlFor={inputId} className="mb-1 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">
        Customer
      </label>
      {selectedId ? (
        <div className="flex h-10 items-center justify-between gap-2 border border-ink bg-porcelain px-3 text-[0.8125rem] text-ink">
          <span id={inputId} className="truncate">
            {selectedLabel || "Selected customer"}
          </span>
          <button type="button" onClick={onClear} aria-label="Choose a different customer" className="shrink-0 text-muted hover:text-ink">
            <CloseIcon size={15} />
          </button>
        </div>
      ) : !allowed ? (
        <p id={inputId} className="flex min-h-10 items-center border border-line bg-cream px-3 text-[0.8125rem] text-muted">
          Searching customers needs the “View customers” permission.
        </p>
      ) : (
        <div className="relative">
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id={inputId}
            type="search"
            role="combobox"
            aria-expanded={searching}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            value={query}
            placeholder="Search name, mobile, email or customer ID"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
              if (event.key === "Enter") {
                event.preventDefault();
                if (results[0]) choose(results[0]);
              }
            }}
            className="h-10 w-full border border-line bg-porcelain pl-9 pr-3 text-[0.875rem] text-ink outline-none placeholder:text-subtle focus:border-ink"
          />
          {searching && (
            <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto border border-line bg-porcelain text-[0.8125rem] shadow-[0_20px_40px_-20px_rgb(20_18_16/0.35)]">
              {loading && <li className="px-3 py-2.5 text-muted">Searching…</li>}
              {error && <li className="px-3 py-2.5 text-danger">{error.message}</li>}
              {data && results.length === 0 && <li className="px-3 py-2.5 text-muted">No customers match “{term}”.</li>}
              {results.map((customer) => (
                <li key={customer.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(customer)}
                    className="block w-full px-3 py-2.5 text-left hover:bg-cream focus:bg-cream focus:outline-none"
                  >
                    <span className="block font-medium text-ink">{customer.name || "Unnamed customer"}</span>
                    <span className="block text-muted">
                      {[customer.customerCode, customer.phone, customer.email].filter(Boolean).join(" · ")}
                    </span>
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
