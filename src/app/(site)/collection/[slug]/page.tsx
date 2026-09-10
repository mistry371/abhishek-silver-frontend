import { notFound } from "next/navigation";
import { CollectionHero } from "@/components/catalog/CatalogueHeader";
import { CatalogueView } from "@/components/catalog/CatalogueView";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCollectionBySlug, getCollections, getProducts } from "@/lib/api";
import { parseFilters } from "@/lib/catalog/filters";
import { catalogueMetadata, type SearchParams } from "@/lib/catalog/page-helpers";
import { breadcrumbJsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return { title: "Collection not found", robots: { index: false } };
  const filters = parseFilters(await searchParams);
  return catalogueMetadata({
    title: collection.seo?.title ?? `${collection.name} Collection`,
    description: collection.seo?.description ?? collection.description,
    path: `/collection/${slug}`,
    filters,
    image: collection.image,
  });
}

export default async function CollectionPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const filters = { ...parseFilters(await searchParams), collection: slug };
  const result = await getProducts(filters);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Collections", href: "/shop" },
    { label: collection.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <CollectionHero
        breadcrumbs={breadcrumbs}
        eyebrow={collection.eyebrow}
        title={collection.name}
        description={collection.description}
        image={collection.image}
        mobileImage={collection.mobileImage}
      />
      <CatalogueView result={result} filters={filters} lockedFacets={["collection"]} />
    </>
  );
}
