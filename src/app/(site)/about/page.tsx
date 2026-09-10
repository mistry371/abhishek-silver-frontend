import Image from "next/image";
import type { CSSProperties } from "react";
import { StoreVisit, TrustStrip } from "@/components/home/sections";
import { CheckIcon } from "@/components/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs, Divider } from "@/components/ui/primitives";
import { aboutContent as content } from "@/content/about";
import { getStoreLocation, getTrustItems } from "@/lib/api";
import { breadcrumbJsonLd, buildMetadata, organizationJsonLd } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "About Us — Our Story & Craftsmanship",
  description: content.hero.description,
  path: "/about",
  image: content.hero.wideImage,
});

const delay = (ms: number) => ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

export default async function AboutPage() {
  const [trust, store] = await Promise.all([getTrustItems(), getStoreLocation()]);
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "About" }];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(breadcrumbs), organizationJsonLd()]} />

      {/* Hero */}
      <section className="on-dark relative isolate overflow-hidden bg-onyx text-ivory">
        <Image src={content.hero.wideImage.url} alt={content.hero.wideImage.alt} fill priority sizes="100vw" className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-onyx via-onyx/40 to-onyx/20" aria-hidden="true" />
        <div className="container-luxe relative flex min-h-[34rem] flex-col justify-between py-8 md:min-h-[42rem] md:py-10">
          <Breadcrumbs items={breadcrumbs} tone="light" />
          <div className="max-w-3xl pb-6">
            <p className="type-eyebrow text-champagne-soft">{content.hero.eyebrow}</p>
            <h1 className="mt-5 type-display-xl text-balance">{content.hero.title}</h1>
            <p className="mt-6 max-w-xl type-body-lg text-ivory/80">{content.hero.description}</p>
          </div>
        </div>
      </section>

      {/* Company story */}
      <section className="section-y" aria-labelledby="story-title">
        <div className="container-luxe grid items-center gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-5" data-reveal="">
            <h2 id="story-title" className="type-h1 text-balance text-ink">
              {content.story.title}
            </h2>
            <Divider ornament className="my-8 justify-start" />
            {content.story.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-5 type-body-lg text-muted first-of-type:mt-0">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="relative aspect-[4/5] overflow-hidden bg-cream lg:col-span-6 lg:col-start-7" data-reveal="fade">
            <Image src={content.story.image.url} alt={content.story.image.alt} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      {/* Vision & mission */}
      <section className="section-y bg-cream" aria-label="Vision and mission">
        <div className="container-luxe grid gap-14 md:grid-cols-2 md:gap-20">
          {[
            ["Our Vision", content.vision],
            ["Our Mission", content.mission],
          ].map(([label, text], index) => (
            <div key={label} data-reveal="" style={delay(index * 120)}>
              <h2 className="type-eyebrow text-champagne-deep">{label}</h2>
              <p className="mt-6 font-serif text-[1.8rem] leading-[1.3] text-ink md:text-[2.3rem]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Jewellery expertise */}
      <section className="section-y" aria-labelledby="expertise-title">
        <div className="container-luxe">
          <p className="type-eyebrow text-champagne-deep">Jewellery Expertise</p>
          <h2 id="expertise-title" className="mt-4 max-w-2xl type-h1 text-ink">
            Knowledge you can lean on
          </h2>
          <div className="mt-16 space-y-20 md:space-y-28">
            {content.expertise.map((item, index) => (
              <div key={item.title} className="grid items-center gap-10 md:grid-cols-12 md:gap-16">
                <div className={cn("relative aspect-[4/5] overflow-hidden bg-cream md:col-span-6", index % 2 === 1 && "md:order-2 md:col-start-7")} data-reveal="fade">
                  <Image src={item.image.url} alt={item.image.alt} fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
                </div>
                <div className={cn("md:col-span-5", index % 2 === 0 ? "md:col-start-8" : "md:order-1 md:col-start-1")} data-reveal="">
                  <p className="type-eyebrow text-champagne-deep">{item.eyebrow}</p>
                  <h3 className="mt-4 type-h2 text-ink">{item.title}</h3>
                  <p className="mt-5 type-body-lg text-muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Craftsmanship */}
      <section id="craftsmanship" className="on-dark section-y scroll-mt-32 bg-onyx text-ivory" aria-labelledby="craft-title">
        <div className="container-luxe">
          <div className="grid items-end gap-10 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="type-eyebrow text-champagne-soft">Craftsmanship</p>
              <h2 id="craft-title" className="mt-4 type-h1 text-balance">
                {content.craftsmanship.title}
              </h2>
            </div>
            <p className="type-body-lg text-ivory/70">{content.craftsmanship.text}</p>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-5 md:gap-6">
            <div className="relative aspect-[16/11] overflow-hidden md:col-span-3 md:aspect-auto md:min-h-[26rem]" data-reveal="fade">
              <Image src={content.craftsmanship.images[0].url} alt={content.craftsmanship.images[0].alt} fill sizes="(min-width: 768px) 58vw, 100vw" className="object-cover" />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden md:col-span-2" data-reveal="fade" style={delay(120)}>
              <Image src={content.craftsmanship.images[1].url} alt={content.craftsmanship.images[1].alt} fill sizes="(min-width: 768px) 38vw, 100vw" className="object-cover" />
            </div>
          </div>
          <ul className="mt-14 grid gap-10 border-t border-onyx-line pt-10 md:grid-cols-3">
            {content.craftsmanship.pillars.map((pillar, index) => (
              <li key={pillar.title}>
                <p className="font-serif text-3xl text-champagne-soft">{["I", "II", "III"][index]}</p>
                <h3 className="mt-3 type-h4 text-ivory">{pillar.title}</h3>
                <p className="mt-2 type-body-sm text-ivory/60">{pillar.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Quality & customer commitment */}
      <section className="section-y" aria-label="Our commitments">
        <div className="container-luxe grid gap-16 lg:grid-cols-2 lg:gap-24">
          <div data-reveal="">
            <p className="type-eyebrow text-champagne-deep">Quality Commitment</p>
            <h2 className="mt-4 type-h2 text-ink">What you can expect from every piece</h2>
            <ul className="mt-8 space-y-4">
              {content.quality.map((point) => (
                <li key={point} className="flex items-start gap-4 border-b border-line pb-4 type-body text-ink-soft">
                  <CheckIcon size={18} className="mt-1 shrink-0 text-champagne-deep" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div data-reveal="" style={delay(120)}>
            <p className="type-eyebrow text-champagne-deep">Customer Commitment</p>
            <h2 className="mt-4 type-h2 text-ink">Care that continues after checkout</h2>
            <ul className="mt-8 space-y-8">
              {content.customerCommitment.map((item) => (
                <li key={item.title}>
                  <h3 className="type-h4 text-ink">{item.title}</h3>
                  <p className="mt-1 type-body text-muted">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <TrustStrip items={trust} />

      {/* Certifications & hallmark information */}
      <section id="certifications" className="section-y scroll-mt-32 bg-cream" aria-labelledby="certifications-title">
        <div className="container-luxe grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="type-eyebrow text-champagne-deep">Certifications &amp; Hallmark</p>
            <h2 id="certifications-title" className="mt-4 type-h2 text-ink">
              Know what you&apos;re buying
            </h2>
            <p className="mt-5 type-body-lg text-muted">
              Every product page lists metal, purity (for example 22KT / 916 or 925 sterling) and weights. Ask our team about the certification and hallmark details of any piece before you buy.
            </p>
            <ButtonLink href="/contact" variant="outline" className="mt-8">
              Ask About a Piece
            </ButtonLink>
          </div>
          <div className="lg:col-span-7">
            {content.certifications.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {content.certifications.map((cert) => (
                  <li key={cert.name} className="border border-line bg-porcelain p-6">
                    <h3 className="type-h4 text-ink">{cert.name}</h3>
                    <p className="mt-2 type-body-sm text-muted">{cert.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <dl className="grid gap-px border border-line bg-line sm:grid-cols-2">
                {[
                  ["22KT · 916", "91.6% pure gold — the traditional choice for Indian jewellery."],
                  ["18KT · 750", "75% pure gold — stronger, ideal for stone settings."],
                  ["925 Sterling", "92.5% pure silver — bright and durable for everyday wear."],
                  ["999 Fine", "99.9% pure silver — soft lustre, often used for traditional pieces."],
                ].map(([term, text]) => (
                  <div key={term} className="bg-porcelain p-6">
                    <dt className="font-serif text-xl text-ink">{term}</dt>
                    <dd className="mt-2 type-body-sm text-muted">{text}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      <StoreVisit store={store} />

      <section className="border-t border-line py-16 md:py-20">
        <div className="container-narrow text-center">
          <h2 className="type-h2 text-ink">Discover the collection</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/shop">Explore Collection</ButtonLink>
            <ButtonLink href="/custom-jewellery" variant="outline">
              Create Your Jewellery
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
