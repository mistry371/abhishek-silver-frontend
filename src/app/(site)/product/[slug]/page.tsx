import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductRail } from "@/components/home/sections";
import { ProductGallery } from "@/components/product/ProductGallery";
import { PurchasePanel } from "@/components/product/PurchasePanel";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/primitives";
import { getAllProductSlugs, getProductBySlug, getRelatedProducts } from "@/lib/api";
import { media } from "@/lib/media";
import { breadcrumbJsonLd, buildMetadata, productJsonLd } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  return buildMetadata({
    title: product.seo.title ?? product.name,
    description: product.seo.description ?? product.shortDescription,
    path: `/product/${product.slug}`,
    image: product.images[0],
  });
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, 8);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    { label: product.category.name, href: `/shop/${product.category.slug}` },
    { label: product.name },
  ];

  return (
    <>
      <JsonLd data={[productJsonLd(product), breadcrumbJsonLd(breadcrumbs)]} />

      <div className="container-luxe pt-6 md:pt-8">
        <Breadcrumbs items={breadcrumbs} />
      </div>

      <section className="container-luxe grid gap-10 pb-20 pt-6 md:pt-8 lg:grid-cols-12 lg:gap-12 xl:gap-20">
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)]">
            <ProductGallery key={product.id} images={product.images} video={product.video} productName={product.name} priority />
          </div>
        </div>
        <div className="lg:col-span-5">
          <PurchasePanel key={product.id} product={product} />
        </div>
      </section>

      <ProductRail
        id="related"
        className="border-t border-line"
        eyebrow="You may also like"
        title="Complete the look"
        products={related}
        cta={{ label: `View all ${product.category.name}`, href: `/shop/${product.category.slug}` }}
      />

      <section className="container-luxe pb-20 md:pb-28">
        <div className="on-dark relative isolate grid overflow-hidden bg-onyx text-ivory md:grid-cols-2">
          <div className="relative aspect-[16/11] md:aspect-auto md:min-h-[22rem]">
            <Image src={media.editorial.customDetail.url} alt={media.editorial.customDetail.alt} fill sizes="(min-width: 768px) 48vw, 100vw" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center p-8 md:p-12 lg:p-16">
            <p className="type-eyebrow text-champagne-soft">Custom Jewellery</p>
            <h2 className="mt-4 type-h2">Looking for something truly personal?</h2>
            <p className="mt-4 type-body text-ivory/70">Share your idea and we&apos;ll help you create a piece for your occasion — from metal and purity to the final finish.</p>
            <ButtonLink href="/custom-jewellery" variant="light" className="mt-8 self-start">
              Create Your Jewellery
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
