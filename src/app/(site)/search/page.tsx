import Link from "next/link";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { CatalogueView } from "@/components/catalog/CatalogueView";
import { SearchPageForm } from "@/components/catalog/SearchPageForm";
import { getProducts } from "@/lib/api";
import { parseFilters } from "@/lib/catalog/filters";
import type { SearchParams } from "@/lib/catalog/page-helpers";
import { buildMetadata } from "@/lib/seo";

const popular = ["Gold rings", "Mangalsutra", "Jhumka", "Silver earrings", "Bangles", "22KT", "Chain", "Pendant"];

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const { q } = parseFilters(await searchParams);
  return buildMetadata({
    title: q ? `Search results for “${q}”` : "Search",
    description: "Search our gold and silver jewellery by name, SKU, category, collection, metal or purity.",
    path: "/search",
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const query = filters.q ?? "";
  const result = query ? await getProducts(filters) : null;
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Search" }];

  return (
    <>
      <CatalogueHeader
        breadcrumbs={breadcrumbs}
        title={query ? `Results for “${query}”` : "Search the collection"}
        description={query ? undefined : "Find pieces by name, SKU, category, collection, metal or purity."}
      >
        <SearchPageForm key={query} initialQuery={query} />
        {!query && (
          <div className="mt-8">
            <p className="type-eyebrow text-champagne-deep">Popular searches</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {popular.map((term) => (
                <li key={term}>
                  <Link
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="inline-block border border-line bg-porcelain px-4 py-2 type-body-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
                  >
                    {term}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CatalogueHeader>
      {result && <CatalogueView result={result} filters={filters} />}
    </>
  );
}
