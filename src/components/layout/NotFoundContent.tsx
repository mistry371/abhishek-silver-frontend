import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { Divider } from "@/components/ui/primitives";
import { media } from "@/lib/media";

export function NotFoundContent() {
  return (
    <section className="container-luxe grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2 lg:gap-20">
      <div className="order-2 text-center lg:order-1 lg:text-left">
        <p className="type-eyebrow text-champagne-deep">Error 404</p>
        <h1 className="mt-5 type-display-l text-balance text-ink">That piece seems to have wandered away.</h1>
        <p className="mt-6 max-w-md type-body-lg text-muted max-lg:mx-auto">
          The page you&apos;re looking for may have moved, or the link may be incomplete. Let us guide you back to something beautiful.
        </p>
        <Divider ornament className="my-10 lg:justify-start" />
        <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
          <ButtonLink href="/">Return Home</ButtonLink>
          <ButtonLink href="/shop" variant="outline">
            Explore Collection
          </ButtonLink>
        </div>
      </div>
      <div className="relative order-1 mx-auto aspect-[4/5] w-full max-w-md overflow-hidden bg-cream lg:order-2">
        <Image src={media.editorial.craftsmanshipDetail.url} alt={media.editorial.craftsmanshipDetail.alt} fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-cover" />
      </div>
    </section>
  );
}
