"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "@/components/icons";
import { useRecentSearches } from "@/stores/ui";

export function SearchPageForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const addRecent = useRecentSearches((s) => s.add);

  return (
    <form
      role="search"
      className="mt-8 flex max-w-2xl items-center gap-3 border-b border-ink/70 pb-3"
      onSubmit={(event) => {
        event.preventDefault();
        const clean = query.trim();
        if (clean.length < 2) return;
        addRecent(clean);
        router.push(`/search?q=${encodeURIComponent(clean)}`);
      }}
    >
      <SearchIcon size={22} className="shrink-0 text-muted" />
      <label htmlFor="search-page-input" className="sr-only">
        Search jewellery
      </label>
      <input
        id="search-page-input"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, SKU, metal or purity"
        enterKeyHint="search"
        className="min-w-0 flex-1 bg-transparent font-serif text-2xl text-ink outline-none placeholder:text-subtle focus-visible:outline-none md:text-3xl"
      />
      <button type="submit" className="shrink-0 type-button text-ink link-underline-static">
        Search
      </button>
    </form>
  );
}
