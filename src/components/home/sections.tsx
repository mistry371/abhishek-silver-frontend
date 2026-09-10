import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import {
  ArrowRightIcon,
  AwardIcon,
  ClockIcon,
  DirectionsIcon,
  GemIcon,
  InstagramIcon,
  MapPinIcon,
  MessageIcon,
  PenIcon,
  PhoneIcon,
  ScaleIcon,
  ShieldIcon,
  SparkleIcon,
  TruckIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ButtonLink } from "@/components/ui/Button";
import { Carousel } from "@/components/ui/Carousel";
import { Tabs } from "@/components/ui/Disclosure";
import { Divider, SectionHeading } from "@/components/ui/primitives";
import { media } from "@/lib/media";
import { getSiteContact, primaryPhone } from "@/lib/site-contact";
import { cn } from "@/lib/utils";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import type { Category, Collection, ProductSummary } from "@/types/catalog";
import type { Offer } from "@/types/commerce";
import type { BrandStory as BrandStoryContent, ContentBlock, InstagramPost, StoreLocation, TrustItem } from "@/types/content";

const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

/* ------------------------------------------------------------------ */
/* Shop by category                                                    */
/* ------------------------------------------------------------------ */

export function CategoryShowcase({ categories }: { categories: Category[] }) {
  return (
    <section className="section-y" aria-labelledby="categories-title">
      <div className="container-luxe">
        <SectionHeading
          id="categories-title"
          eyebrow="Discover"
          title="Shop by Category"
          description="From everyday essentials to heirloom pieces — jewellery for every moment."
          cta={{ label: "View All Jewellery", href: "/shop" }}
        />
        <Carousel
          label="Jewellery categories"
          className="mt-12 md:mt-14"
          itemClassName="w-[44%] sm:w-[30%] md:w-[calc((100%-4.5rem)/4)] xl:w-[calc((100%-7.5rem)/6)]"
        >
          {categories.map((category) => {
            const href = category.slug === "custom-jewellery" ? "/custom-jewellery" : `/shop/${category.slug}`;
            return (
              <Link key={category.id} href={href} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-cream">
                  <Image
                    src={category.image.url}
                    alt={category.image.alt}
                    fill
                    sizes="(min-width: 1280px) 15vw, (min-width: 768px) 23vw, 44vw"
                    className="object-cover transition-transform duration-[1400ms] ease-luxe group-hover:scale-[1.06]"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-[1.15rem] leading-tight text-ink md:text-[1.3rem]">{category.name}</h3>
                  {category.group !== "service" && category.productCount ? (
                    <span className="shrink-0 type-body-sm text-subtle">{category.productCount}</span>
                  ) : null}
                </div>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[0.625rem] uppercase tracking-[0.18em] text-ink-soft">
                  Explore
                  <ArrowRightIcon size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Product rail                                                        */
/* ------------------------------------------------------------------ */

export function ProductRail({
  id,
  eyebrow,
  title,
  description,
  cta,
  products,
  className,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  cta?: { label: string; href: string };
  products: ProductSummary[];
  className?: string;
}) {
  if (products.length === 0) return null;
  return (
    <section className={cn("section-y", className)} aria-labelledby={`${id}-title`}>
      <div className="container-luxe">
        <SectionHeading id={`${id}-title`} eyebrow={eyebrow} title={title} description={description} cta={cta} />
        <ProductCarousel className="mt-12 md:mt-14" label={title} products={products} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Gold editorial                                                      */
/* ------------------------------------------------------------------ */

export function GoldEditorial({ block, products }: { block: ContentBlock; products: ProductSummary[] }) {
  const detail = block.mobileImage ?? media.editorial.goldDetail;
  return (
    <section className="section-y border-t border-line" aria-labelledby="gold-title">
      <div className="container-luxe">
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="relative pb-8 lg:col-span-5 lg:pb-0" data-reveal="">
            <div className="relative aspect-[4/5] overflow-hidden bg-cream">
              {block.image && (
                <Image src={block.image.url} alt={block.image.alt} fill sizes="(min-width: 1024px) 38vw, 100vw" className="object-cover" />
              )}
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-2 right-4 h-36 w-28 overflow-hidden border-[8px] border-ivory bg-cream sm:h-44 sm:w-36 lg:-bottom-10 lg:-right-8 xl:h-56 xl:w-44"
            >
              <Image src={detail.url} alt="" fill sizes="180px" className="object-cover" />
            </div>
          </div>
          <div className="lg:col-span-7">
            <SectionHeading id="gold-title" eyebrow={block.eyebrow} title={block.title} description={block.description} />
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6">
              {products.slice(0, 2).map((product) => (
                <ProductCard key={product.id} product={product} sizes="(min-width: 1024px) 26vw, 50vw" />
              ))}
            </div>
            {block.cta && (
              <ButtonLink href={block.cta.href} variant="outline" className="mt-10">
                {block.cta.label}
              </ButtonLink>
            )}
          </div>
        </div>
        {products.length > 2 && <ProductCarousel className="mt-20 md:mt-24" label="More gold jewellery" products={products.slice(2)} />}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Featured collections                                                */
/* ------------------------------------------------------------------ */

const collectionSpans = [
  "lg:col-span-7 lg:row-span-2",
  "lg:col-span-5",
  "lg:col-span-5",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
];

export function CollectionsMosaic({ collections }: { collections: Collection[] }) {
  const items = collections.slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section className="section-y bg-cream" aria-labelledby="collections-title">
      <div className="container-luxe">
        <SectionHeading
          id="collections-title"
          align="center"
          eyebrow="Curated Collections"
          title="Featured Collections"
          description="Stories told in gold and silver — edits composed for every chapter."
        />
        <ul className="no-scrollbar -mx-[var(--gutter)] mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] scroll-px-[var(--gutter)] md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 lg:grid-cols-12">
          {items.map((collection, index) => {
            const large = index === 0;
            const wide = index === 1 || index === 2;
            return (
              <li key={collection.id} className={cn("w-[80%] shrink-0 snap-start md:w-auto", collectionSpans[index])} data-reveal="" style={delay(index * 80)}>
                <Link href={`/collection/${collection.slug}`} className="group relative block h-full overflow-hidden bg-onyx">
                  <div className={cn("relative h-full w-full", large ? "aspect-[4/5] lg:aspect-auto lg:min-h-[42rem]" : wide ? "aspect-[4/5] lg:aspect-[16/10]" : "aspect-[4/5]")}>
                    <Image
                      src={collection.image.url}
                      alt={collection.image.alt}
                      fill
                      sizes={large ? "(min-width: 1024px) 56vw, 80vw" : "(min-width: 1024px) 34vw, 80vw"}
                      className="object-cover transition-transform duration-[1400ms] ease-luxe group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-onyx/75 via-onyx/15 to-transparent" aria-hidden="true" />
                    <div className={cn("absolute inset-x-0 bottom-0 text-ivory", large ? "p-7 md:p-10" : "p-6 md:p-7")}>
                      {collection.eyebrow && <p className="type-eyebrow text-champagne-soft">{collection.eyebrow}</p>}
                      <h3 className={cn("mt-2", large ? "type-h2" : "type-h3")}>{collection.name}</h3>
                      {large && <p className="mt-3 max-w-md type-body text-ivory/80">{collection.description}</p>}
                      <span className="mt-4 inline-flex items-center gap-2 type-button link-underline-static">
                        Explore
                        <ArrowRightIcon size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Best sellers & trending                                             */
/* ------------------------------------------------------------------ */

export function MostLoved({ bestSellers, trending }: { bestSellers: ProductSummary[]; trending: ProductSummary[] }) {
  return (
    <section className="section-y" aria-labelledby="most-loved-title">
      <div className="container-luxe">
        <div className="text-center" data-reveal="">
          <p className="type-eyebrow text-champagne-deep">Most Loved</p>
          <h2 id="most-loved-title" className="mt-4 type-h2 text-ink">
            Pieces our clients return to
          </h2>
        </div>
        <Tabs
          label="Most loved jewellery"
          className="mt-8"
          listClassName="justify-center gap-10 border-b-0"
          panelClassName="pt-10 md:pt-12"
          tabs={[
            {
              id: "best-sellers",
              label: "Best Sellers",
              content: (
                <>
                  <ProductCarousel label="Best sellers" products={bestSellers} />
                  <div className="mt-10 text-center">
                    <ButtonLink href="/shop?best=true&sort=best_selling" variant="outline">
                      Shop Best Sellers
                    </ButtonLink>
                  </div>
                </>
              ),
            },
            {
              id: "trending",
              label: "Trending Now",
              content: (
                <>
                  <ProductCarousel label="Trending products" products={trending} />
                  <div className="mt-10 text-center">
                    <ButtonLink href="/shop?sort=trending" variant="outline">
                      Shop Trending
                    </ButtonLink>
                  </div>
                </>
              ),
            },
          ]}
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Festival campaign                                                   */
/* ------------------------------------------------------------------ */

export function FestivalCampaign({ block, offer }: { block: ContentBlock; offer?: Offer }) {
  return (
    <section aria-labelledby="festival-title" className="on-dark relative isolate overflow-hidden bg-onyx text-ivory">
      {block.image && (
        <Image src={block.image.url} alt={block.image.alt} fill sizes="100vw" className="hidden object-cover md:block" />
      )}
      {(block.mobileImage ?? block.image) && (
        <Image
          src={(block.mobileImage ?? block.image)!.url}
          alt={(block.mobileImage ?? block.image)!.alt}
          fill
          sizes="100vw"
          className="object-cover md:hidden"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-onyx/55 via-onyx/45 to-onyx/70" aria-hidden="true" />
      <div className="container-luxe relative flex min-h-[38rem] items-center justify-center py-24 text-center md:min-h-[46rem]">
        <div className="max-w-2xl" data-reveal="">
          {block.eyebrow && <p className="type-eyebrow text-champagne-soft">{block.eyebrow}</p>}
          <h2 id="festival-title" className="mt-5 type-display-l text-balance">
            {block.title}
          </h2>
          {block.description && <p className="mx-auto mt-6 max-w-xl type-body-lg text-ivory/80">{block.description}</p>}
          {block.cta && (
            <ButtonLink href={block.cta.href} variant="light" size="lg" className="mt-10">
              {block.cta.label}
            </ButtonLink>
          )}
          {offer && <p className="mt-8 type-body-sm text-ivory/60">{offer.description}</p>}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Silver editorial                                                    */
/* ------------------------------------------------------------------ */

export function SilverEditorial({ block, products }: { block: ContentBlock; products: ProductSummary[] }) {
  return (
    <section className="section-y bg-pearl" aria-labelledby="silver-title">
      <div className="container-luxe grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col lg:col-span-5">
          <SectionHeading id="silver-title" eyebrow={block.eyebrow} title={block.title} description={block.description} />
          <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} sizes="(min-width: 1024px) 19vw, 50vw" />
            ))}
          </div>
          {block.cta && (
            <ButtonLink href={block.cta.href} className="mt-12 self-start">
              {block.cta.label}
            </ButtonLink>
          )}
        </div>
        <div className="order-first lg:order-none lg:col-span-7">
          <div className="relative aspect-[4/5] overflow-hidden bg-mist lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:aspect-[5/6]" data-reveal="fade">
            {block.image && <Image src={block.image.url} alt={block.image.alt} fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />}
            <div className="absolute bottom-0 left-0 max-w-xs bg-pearl/90 px-6 py-5 backdrop-blur-sm">
              <p className="type-eyebrow text-steel">Sterling &amp; Fine Silver</p>
              <p className="mt-2 font-serif text-xl leading-snug text-ink">Crafted for the rhythm of every day</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Editorial campaign                                                  */
/* ------------------------------------------------------------------ */

export function CampaignSplit({ block }: { block: ContentBlock }) {
  return (
    <section className="section-y" aria-labelledby="campaign-title">
      <div className="container-luxe grid items-center gap-12 lg:grid-cols-12 lg:gap-0">
        <div className="relative lg:col-span-6" data-reveal="fade">
          <div className="relative aspect-[4/5] overflow-hidden bg-cream">
            {block.image && <Image src={block.image.url} alt={block.image.alt} fill sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />}
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8" data-reveal="" style={delay(120)}>
          {block.eyebrow && <p className="type-eyebrow text-champagne-deep">{block.eyebrow}</p>}
          <h2 id="campaign-title" className="mt-5 type-display-l text-balance text-ink">
            {block.title}
          </h2>
          <Divider ornament className="my-8 justify-start" />
          {block.description && <p className="max-w-md type-body-lg text-muted">{block.description}</p>}
          {block.cta && (
            <ButtonLink href={block.cta.href} size="lg" className="mt-10">
              {block.cta.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Custom jewellery                                                    */
/* ------------------------------------------------------------------ */

const customSteps = [
  { title: "Share your idea", text: "Send a sketch or reference image, or simply describe the occasion." },
  { title: "Refine the design", text: "We guide you on metal, purity, weight and budget." },
  { title: "Crafted for you", text: "Your piece is made and finished to the design you approve." },
];

export function CustomJewelleryFeature({ block }: { block: ContentBlock }) {
  return (
    <section aria-labelledby="custom-title" className="on-dark section-y bg-onyx text-ivory">
      <div className="container-luxe grid items-center gap-14 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-6 xl:col-span-5">
          {block.eyebrow && <p className="type-eyebrow text-champagne-soft">{block.eyebrow}</p>}
          <h2 id="custom-title" className="mt-5 type-h1 text-balance">
            {block.title}
          </h2>
          {block.description && <p className="mt-6 type-body-lg text-ivory/70">{block.description}</p>}
          <ol className="mt-10 space-y-7 border-l border-onyx-line pl-7">
            {customSteps.map((step, index) => (
              <li key={step.title}>
                <p className="font-serif text-lg text-champagne-soft">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-1 type-h4 text-ivory">{step.title}</p>
                <p className="mt-1 type-body-sm text-ivory/60">{step.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap gap-3">
            {block.cta && (
              <ButtonLink href={block.cta.href} variant="light" size="lg">
                {block.cta.label}
              </ButtonLink>
            )}
            <ButtonLink href={whatsappUrl(whatsappMessages.custom())} external variant="outline-light" size="lg">
              <WhatsAppIcon size={18} />
              Discuss on WhatsApp
            </ButtonLink>
          </div>
        </div>
        <div className="lg:col-span-6 xl:col-span-7" data-reveal="fade">
          <div className="grid grid-cols-5 gap-4 md:gap-6">
            <div className="relative col-span-3 aspect-[3/4] overflow-hidden bg-onyx-soft">
              {block.image && <Image src={block.image.url} alt={block.image.alt} fill sizes="(min-width: 1024px) 32vw, 60vw" className="object-cover" />}
            </div>
            <div className="relative col-span-2 mt-16 aspect-[3/4] overflow-hidden bg-onyx-soft md:mt-24">
              {block.mobileImage && <Image src={block.mobileImage.url} alt={block.mobileImage.alt} fill sizes="(min-width: 1024px) 22vw, 40vw" className="object-cover" />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Brand story                                                         */
/* ------------------------------------------------------------------ */

export function BrandStory({ story }: { story: BrandStoryContent }) {
  return (
    <section id="our-story" className="section-y" aria-labelledby="story-title">
      <div className="container-luxe grid items-center gap-16 lg:grid-cols-12 lg:gap-20">
        <div className="relative pb-[12%] lg:col-span-6" data-reveal="fade">
          <div className="relative aspect-[4/5] w-[78%] overflow-hidden bg-cream">
            <Image src={story.image.url} alt={story.image.alt} fill sizes="(min-width: 1024px) 38vw, 78vw" className="object-cover" />
          </div>
          {story.secondaryImage && (
            <div className="absolute bottom-0 right-0 aspect-[3/4] w-[46%] overflow-hidden border-[10px] border-ivory bg-cream">
              <Image src={story.secondaryImage.url} alt={story.secondaryImage.alt} fill sizes="(min-width: 1024px) 22vw, 46vw" className="object-cover" />
            </div>
          )}
        </div>
        <div className="lg:col-span-6 xl:col-span-5 xl:col-start-8">
          <p className="type-eyebrow text-champagne-deep">{story.eyebrow}</p>
          <h2 id="story-title" className="mt-5 type-h1 text-balance text-ink">
            {story.title}
          </h2>
          <div className="mt-6 space-y-5">
            {story.paragraphs.map((paragraph) => (
              <p key={paragraph} className="type-body-lg text-muted">
                {paragraph}
              </p>
            ))}
          </div>
          <ul className="mt-10 grid gap-7 border-t border-line pt-8 sm:grid-cols-3 sm:gap-6">
            {story.pillars.map((pillar, index) => (
              <li key={pillar.title}>
                <p className="font-serif text-2xl text-champagne-deep">{["I", "II", "III", "IV"][index]}</p>
                <p className="mt-2 type-h4 text-ink">{pillar.title}</p>
                <p className="mt-1 type-body-sm text-muted">{pillar.description}</p>
              </li>
            ))}
          </ul>
          {story.cta && (
            <ButtonLink href={story.cta.href} variant="link" className="mt-10">
              {story.cta.label}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trust                                                               */
/* ------------------------------------------------------------------ */

const trustIcons = {
  shield: ShieldIcon,
  gem: GemIcon,
  sparkle: SparkleIcon,
  message: MessageIcon,
  truck: TruckIcon,
  award: AwardIcon,
  scale: ScaleIcon,
  pen: PenIcon,
} as const;

export function TrustStrip({ items }: { items: TrustItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Why shop with us" className="border-y border-line bg-porcelain">
      <ul className="container-luxe grid grid-cols-2 lg:grid-cols-4">
        {items.slice(0, 4).map((item, index) => {
          const Icon = trustIcons[item.icon];
          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-col items-center gap-3 px-3 py-10 text-center lg:py-14",
                index % 2 === 0 && "border-r border-line",
                index < 2 && "border-b border-line lg:border-b-0",
                index === 1 && "lg:border-r",
              )}
            >
              <Icon size={26} className="text-champagne-deep" />
              <p className="type-h4 text-ink">{item.title}</p>
              <p className="max-w-[16rem] type-body-sm text-muted">{item.description}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Store visit & contact CTA                                           */
/* ------------------------------------------------------------------ */

export function StoreVisit({ store }: { store: StoreLocation }) {
  return (
    <section id="store" className="section-y" aria-labelledby="store-title">
      <div className="container-luxe">
        <div
          className="mb-16 flex flex-col items-start justify-between gap-6 border border-line bg-porcelain p-8 md:flex-row md:items-center md:p-10"
          data-reveal=""
        >
          <div>
            <p className="type-eyebrow text-champagne-deep">Personal Assistance</p>
            <p className="mt-3 type-h3 text-ink">Need help choosing the perfect piece?</p>
            <p className="mt-2 type-body text-muted">Our team can share details, videos and pricing on request.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={whatsappUrl(whatsappMessages.general())} external variant="whatsapp">
              <WhatsAppIcon size={18} />
              Chat on WhatsApp
            </ButtonLink>
            <ButtonLink href="/contact" variant="outline">
              Contact Us
            </ButtonLink>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="relative aspect-[4/5] overflow-hidden bg-cream lg:col-span-5" data-reveal="fade">
            <Image src={store.image.url} alt={store.image.alt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
          </div>
          <div className="flex flex-col lg:col-span-7">
            <p className="type-eyebrow text-champagne-deep">Visit Us</p>
            <h2 id="store-title" className="mt-4 type-h2 text-ink">
              {store.name}
            </h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-2 type-caption tracking-[0.16em] text-ink-soft">
                  <MapPinIcon size={15} /> Address
                </p>
                <address className="mt-3 type-body not-italic text-ink">
                  {store.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                  <span className="block">
                    {store.city}, {store.state} {store.postalCode}
                  </span>
                </address>
              </div>
              <div>
                <p className="flex items-center gap-2 type-caption tracking-[0.16em] text-ink-soft">
                  <ClockIcon size={15} /> Hours
                </p>
                <dl className="mt-3 space-y-1.5 type-body">
                  {store.hours.map((entry) => (
                    <div key={entry.label} className="flex flex-wrap gap-x-2">
                      <dt className="text-muted">{entry.label}</dt>
                      <dd className="text-ink">{entry.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div>
                <p className="flex items-center gap-2 type-caption tracking-[0.16em] text-ink-soft">
                  <PhoneIcon size={15} /> Phone
                </p>
                <a href={primaryPhone().href} className="mt-3 inline-block type-body text-ink link-underline">
                  {store.phone}
                </a>
              </div>
              <div>
                <p className="flex items-center gap-2 type-caption tracking-[0.16em] text-ink-soft">
                  <WhatsAppIcon size={15} /> WhatsApp
                </p>
                <a
                  href={whatsappUrl(whatsappMessages.store())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block type-body text-ink link-underline"
                >
                  Plan your visit
                </a>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={store.directionsUrl} external>
                <DirectionsIcon size={17} />
                Get Directions
              </ButtonLink>
              <ButtonLink href={primaryPhone().href} variant="outline">
                <PhoneIcon size={17} />
                Call the Store
              </ButtonLink>
            </div>
            <div className="relative mt-10 aspect-[16/10] w-full overflow-hidden border border-line bg-cream lg:aspect-auto lg:min-h-[16rem] lg:flex-1">
              <iframe
                title={`Map showing the location of ${store.name}`}
                src={store.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="absolute inset-0 h-full w-full grayscale-[30%]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Instagram                                                           */
/* ------------------------------------------------------------------ */

export function InstagramGallery({ posts, className }: { posts: InstagramPost[]; className?: string }) {
  if (posts.length === 0) return null;
  return (
    <section className={cn("section-y", className)} aria-labelledby="instagram-title">
      <div className="container-luxe">
        <div className="flex flex-col items-center text-center" data-reveal="">
          <InstagramIcon size={26} className="text-champagne-deep" />
          <h2 id="instagram-title" className="mt-4 type-h2 text-ink">
            Follow {getSiteContact().instagramHandle}
          </h2>
          <p className="mt-3 type-body text-muted">Styling notes, new pieces and moments from our studio.</p>
        </div>
        <ul className="no-scrollbar -mx-[var(--gutter)] mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[var(--gutter)] scroll-px-[var(--gutter)] md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-8">
          {posts.slice(0, 8).map((post, index) => (
            <li key={post.id} className="w-[42%] shrink-0 snap-start md:w-auto">
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={post.caption ?? `View Instagram post ${index + 1}`}
                className="group relative block aspect-square overflow-hidden bg-cream"
              >
                <Image
                  src={post.image.url}
                  alt={post.image.alt}
                  fill
                  sizes="(min-width: 1280px) 12vw, (min-width: 768px) 24vw, 42vw"
                  className="object-cover transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.06]"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center bg-onyx/0 text-ivory opacity-0 transition-all duration-500 group-hover:bg-onyx/35 group-hover:opacity-100"
                >
                  <InstagramIcon size={22} />
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <ButtonLink href={getSiteContact().instagramUrl} external variant="outline">
            Follow on Instagram
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Newsletter                                                          */
/* ------------------------------------------------------------------ */

export function NewsletterSection() {
  return (
    <section className="section-y bg-champagne-mist/70" aria-labelledby="newsletter-title">
      <div className="container-narrow text-center" data-reveal="">
        <p className="type-eyebrow text-champagne-deep">The Inner Circle</p>
        <h2 id="newsletter-title" className="mt-4 type-h1 text-ink">
          Stay in the know
        </h2>
        <p className="mx-auto mt-4 max-w-md type-body-lg text-muted">Discover new collections, festive edits and exclusive offers.</p>
        <NewsletterForm className="mx-auto mt-10 max-w-md text-left" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* SEO content                                                         */
/* ------------------------------------------------------------------ */

export function SeoContent({ content, categories }: { content: { title: string; paragraphs: string[] }; categories: Category[] }) {
  return (
    <section className="border-t border-line py-16 md:py-20" aria-labelledby="seo-content-title">
      <div className="container-narrow">
        <h2 id="seo-content-title" className="type-h3 text-ink">
          {content.title}
        </h2>
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph} className="mt-4 type-body-sm text-muted">
            {paragraph}
          </p>
        ))}
        <nav aria-label="Popular categories" className="mt-8">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={category.slug === "custom-jewellery" ? "/custom-jewellery" : `/shop/${category.slug}`}
                  className="type-body-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
