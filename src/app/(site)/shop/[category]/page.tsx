import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { CatalogueView, type LockedFacet } from "@/components/catalog/CatalogueView";
import { ArrowRightIcon } from "@/components/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCategoryBySlug, getProducts } from "@/lib/api";
import { parseFilters } from "@/lib/catalog/filters";
import { catalogueMetadata, type SearchParams } from "@/lib/catalog/page-helpers";
import { breadcrumbJsonLd } from "@/lib/seo";

type Params = Promise<{ category: string }>;

function lockedFor(slug: string, group: string): LockedFacet[] {
  if (slug === "gold-jewellery" || slug === "silver-jewellery") return ["metal"];
  if (group === "audience") return ["gender"];
  if (group === "type") return ["category"];
  return [];
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found", robots: { index: false } };
  const filters = parseFilters(await searchParams, slug);
  return catalogueMetadata({
    title: category.seo?.title ?? category.name,
    description: category.seo?.description ?? category.description,
    path: `/shop/${slug}`,
    filters,
    image: category.image,
  });
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { category: slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const filters = parseFilters(await searchParams, slug);
  const result = await getProducts(filters);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: category.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <CatalogueHeader
        breadcrumbs={breadcrumbs}
        eyebrow={category.group === "metal" ? "Shop by Metal" : category.group === "audience" ? "Shop For" : "Jewellery"}
        title={category.name}
        description={category.description}
        image={category.image}
      >
        {slug === "custom-jewellery" && (
          <Link href="/custom-jewellery" className="mt-6 inline-flex items-center gap-2 type-button link-underline-static">
            Request a bespoke design
            <ArrowRightIcon size={14} />
          </Link>
        )}
      </CatalogueHeader>
      <CatalogueView
        result={result}
        filters={filters}
        lockedFacets={lockedFor(slug, category.group)}
        subcategories={category.subcategories}
      />
    </>
  );
}
