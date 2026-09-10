import Image from "next/image";
import type { ReactNode } from "react";
import { Breadcrumbs, Skeleton, type BreadcrumbItem } from "@/components/ui/primitives";
import { ProductCardSkeleton } from "@/components/product/ProductCard";
import type { ImageAsset } from "@/types/common";

export function CatalogueHeader({
  breadcrumbs,
  eyebrow,
  title,
  description,
  image,
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  description?: string;
  image?: ImageAsset;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-cream/60">
      <div className="container-luxe grid items-end gap-8 py-10 md:py-14 lg:grid-cols-[1fr_20rem] lg:gap-16 xl:grid-cols-[1fr_24rem]">
        <div>
          <Breadcrumbs items={breadcrumbs} />
          {eyebrow && <p className="mt-8 type-eyebrow text-champagne-deep">{eyebrow}</p>}
          <h1 className={eyebrow ? "mt-3 type-h1 text-balance text-ink" : "mt-8 type-h1 text-balance text-ink"}>{title}</h1>
          {description && <p className="mt-4 max-w-2xl type-body-lg text-muted">{description}</p>}
          {children}
        </div>
        {image && (
          <div className="relative hidden aspect-[4/3] overflow-hidden bg-sand lg:block">
            <Image src={image.url} alt={image.alt} fill priority sizes="24rem" className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

export function CollectionHero({
  breadcrumbs,
  eyebrow,
  title,
  description,
  image,
  mobileImage,
}: {
  breadcrumbs: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  description: string;
  image: ImageAsset;
  mobileImage?: ImageAsset;
}) {
  return (
    <section className="on-dark relative isolate overflow-hidden bg-onyx text-ivory">
      <Image src={image.url} alt={image.alt} fill priority sizes="100vw" className="hidden object-cover md:block" />
      <Image src={(mobileImage ?? image).url} alt={(mobileImage ?? image).alt} fill priority sizes="100vw" className="object-cover md:hidden" />
      <div className="absolute inset-0 bg-gradient-to-t from-onyx/80 via-onyx/35 to-onyx/20 md:bg-gradient-to-r md:from-onyx/70 md:via-onyx/30 md:to-transparent" aria-hidden="true" />
      <div className="container-luxe relative flex min-h-[26rem] flex-col justify-between py-8 md:min-h-[32rem] md:py-10">
        <Breadcrumbs items={breadcrumbs} tone="light" />
        <div className="max-w-xl pt-16">
          {eyebrow && <p className="type-eyebrow text-champagne-soft">{eyebrow}</p>}
          <h1 className="mt-4 type-display-l text-balance">{title}</h1>
          <p className="mt-5 type-body-lg text-ivory/80">{description}</p>
        </div>
      </div>
    </section>
  );
}

export function CatalogueSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading products">
      <section className="border-b border-line bg-cream/60">
        <div className="container-luxe py-10 md:py-14">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-8 h-12 w-2/3 max-w-md" />
          <Skeleton className="mt-4 h-5 w-full max-w-xl" />
        </div>
      </section>
      <div className="container-luxe pb-24">
        <div className="mb-8 flex h-16 items-center justify-between border-b border-line">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="grid gap-10 lg:grid-cols-[16rem_1fr] xl:grid-cols-[17rem_1fr] xl:gap-14">
          <div className="hidden space-y-6 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 border-b border-line pb-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
