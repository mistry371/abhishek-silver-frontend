import { HeroCarousel } from "@/components/home/HeroCarousel";
import {
  BrandStory,
  CampaignSplit,
  CategoryShowcase,
  CollectionsMosaic,
  CustomJewelleryFeature,
  FestivalCampaign,
  GoldEditorial,
  InstagramGallery,
  MostLoved,
  NewsletterSection,
  ProductRail,
  SeoContent,
  SilverEditorial,
  StoreVisit,
  TrustStrip,
} from "@/components/home/sections";
import { Testimonials } from "@/components/home/Testimonials";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";
import {
  getBestSellers,
  getCategories,
  getCollections,
  getHomepageContent,
  getInstagramPosts,
  getNewArrivals,
  getOffers,
  getProductsByMetal,
  getStoreLocation,
  getTestimonials,
  getTrendingProducts,
  getTrustItems,
} from "@/lib/api";
import { media } from "@/lib/media";
import { buildMetadata, localBusinessJsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

export const metadata = buildMetadata({
  title: siteConfig.tagline,
  description: siteConfig.description,
  path: "/",
  image: media.hero.bridal,
});

export default async function HomePage() {
  const [content, categories, collections, newArrivals, bestSellers, trending, gold, silver, testimonials, instagram, trust, store, offers] =
    await Promise.all([
      getHomepageContent(),
      getCategories(),
      getCollections(),
      getNewArrivals(10),
      getBestSellers(10),
      getTrendingProducts(10),
      getProductsByMetal("gold", 8),
      getProductsByMetal("silver", 6),
      getTestimonials(),
      getInstagramPosts(),
      getTrustItems(),
      getStoreLocation(),
      getOffers(),
    ]);

  const festivalOffer = offers.find((offer) => offer.type === "festival");

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), localBusinessJsonLd(store)]} />
      <h1 className="sr-only">
        {siteConfig.name} — {siteConfig.tagline}
      </h1>

      <HeroCarousel slides={content.hero} />
      <CategoryShowcase categories={categories} />
      <ProductRail
        id="new-arrivals"
        className="pt-0"
        eyebrow="Just Arrived"
        title="New Arrivals"
        description="The latest additions to our gold and silver collections."
        cta={{ label: "View All New Arrivals", href: "/shop?new=true&sort=newest" }}
        products={newArrivals}
      />
      <GoldEditorial block={content.goldEditorial} products={gold} />
      <CollectionsMosaic collections={collections} />
      <MostLoved bestSellers={bestSellers} trending={trending} />
      {content.festival?.active && <FestivalCampaign block={content.festival} offer={festivalOffer} />}
      <SilverEditorial block={content.silverEditorial} products={silver} />
      <CampaignSplit block={content.campaign} />
      <CustomJewelleryFeature block={content.customJewellery} />
      <BrandStory story={content.brandStory} />
      <TrustStrip items={trust} />
      {testimonials.length > 0 && <Testimonials items={testimonials} />}
      <StoreVisit store={store} />
      <InstagramGallery posts={instagram} className="pt-0" />
      <NewsletterSection />
      <SeoContent content={content.seoContent} categories={categories} />
    </>
  );
}
