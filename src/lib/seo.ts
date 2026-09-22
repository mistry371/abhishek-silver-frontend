import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";
import { metalPurityLabel } from "@/lib/catalog/filters";
import { getSiteContact } from "@/lib/site-contact";
import type { Product } from "@/types/catalog";
import type { ImageAsset } from "@/types/common";
import type { BlogPost, FaqItem, StoreLocation } from "@/types/content";

interface MetadataInput {
  title: string;
  description?: string;
  path: string;
  image?: ImageAsset;
  noIndex?: boolean;
  type?: "website" | "article";
}

/** One place to build titles, canonicals, Open Graph and Twitter metadata. */
export function buildMetadata({ title, description, path, image, noIndex = false, type = "website" }: MetadataInput): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = `${title} | ${siteConfig.name}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
      images: image ? [{ url: image.url, width: image.width, height: image.height, alt: image.alt }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      images: image ? [image.url] : undefined,
    },
    robots: noIndex ? { index: false, follow: true } : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Structured data                                                     */
/* ------------------------------------------------------------------ */

const isPlaceholder = (value?: string) => !value || /0{5}|example\.com|placeholder/i.test(value);
const isGenericSocial = (url: string) => /^https:\/\/www\.[a-z]+\.com\/$/.test(url);
const socialProfiles = () =>
  getSiteContact()
    .socialLinks.map((link) => link.href)
    .filter((url) => !isGenericSocial(url));

export function organizationJsonLd() {
  const sameAs = socialProfiles();
  const email = getSiteContact().email;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.logo.url),
    ...(sameAs.length ? { sameAs } : {}),
    ...(!isPlaceholder(email) ? { email } : {}),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteConfig.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Only fields supplied by the business are emitted. */
export function localBusinessJsonLd(store: StoreLocation) {
  const sameAs = socialProfiles();
  return {
    "@context": "https://schema.org",
    "@type": "JewelryStore",
    name: siteConfig.name,
    url: siteConfig.url,
    image: absoluteUrl(siteConfig.logo.url),
    logo: absoluteUrl(siteConfig.logo.url),
    ...(!isPlaceholder(store.phone) ? { telephone: store.phone } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    hasMap: store.directionsUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: store.addressLines.join(", "),
      addressLocality: store.city,
      addressRegion: store.state,
      addressCountry: "IN",
      ...(store.postalCode ? { postalCode: store.postalCode } : {}),
    },
    ...(store.geo ? { geo: { "@type": "GeoCoordinates", latitude: store.geo.lat, longitude: store.geo.lng } } : {}),
  };
}

export function productJsonLd(product: Product) {
  const availability = {
    in_stock: "https://schema.org/InStock",
    low_stock: "https://schema.org/LimitedAvailability",
    out_of_stock: "https://schema.org/OutOfStock",
    unavailable: "https://schema.org/Discontinued",
  }[product.availability.status];
  const url = absoluteUrl(`/product/${product.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.description,
    // Photos stored on the site itself are relative ("/catalogue/…"); search engines need full addresses.
    image: product.images.map((image) => (image.url.startsWith("/") ? absoluteUrl(image.url) : image.url)),
    category: product.category.name,
    material: metalPurityLabel(product.metal, product.purity),
    brand: { "@type": "Brand", name: siteConfig.name },
    weight: { "@type": "QuantitativeValue", value: product.grossWeight, unitCode: "GRM" },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: product.finalPrice,
      availability,
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function breadcrumbJsonLd(items: { label: string; href?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export function faqJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

export function articleJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: [post.coverImage.url],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
  };
}
