import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { CatalogueView } from "@/components/catalog/CatalogueView";
import { JsonLd } from "@/components/seo/JsonLd";
import { getProducts } from "@/lib/api";
import { parseFilters } from "@/lib/catalog/filters";
import { catalogueMetadata, type SearchParams } from "@/lib/catalog/page-helpers";
import { breadcrumbJsonLd } from "@/lib/seo";

const title = "All Jewellery";
const description =
  "Explore the complete collection of gold and silver jewellery — rings, earrings, necklaces, chains, bracelets, bangles, pendants and mangalsutra, with transparent pricing.";

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  return catalogueMetadata({ title, description, path: "/shop", filters });
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const result = await getProducts(filters);
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Shop" }];

  const heading = filters.newArrival ? "New Arrivals" : filters.bestSeller ? "Best Sellers" : title;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <CatalogueHeader breadcrumbs={breadcrumbs} eyebrow="The Collection" title={heading} description={description} />
      <CatalogueView result={result} filters={filters} />
    </>
  );
}
