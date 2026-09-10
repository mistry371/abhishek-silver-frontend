import Image from "next/image";
import type { ReactNode } from "react";
import { media } from "@/lib/media";
import type { ImageAsset } from "@/types/common";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  image = media.editorial.timeless,
  quote = "Fine jewellery, chosen with confidence and worn with joy.",
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  image?: ImageAsset;
  quote?: string;
}) {
  return (
    <div className="grid lg:min-h-[calc(100dvh-11.5rem)] lg:grid-cols-2">
      <div className="on-dark relative hidden overflow-hidden bg-onyx lg:block">
        <Image src={image.url} alt={image.alt} fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-onyx/75 via-onyx/20 to-transparent" aria-hidden="true" />
        <p className="absolute inset-x-12 bottom-14 max-w-md font-serif text-[2.2rem] leading-tight text-ivory">{quote}</p>
      </div>
      <div className="flex items-center justify-center px-[var(--gutter)] py-14 md:py-20">
        <div className="w-full max-w-md">
          <p className="type-eyebrow text-champagne-deep">{eyebrow}</p>
          <h1 className="mt-3 type-h1 text-ink">{title}</h1>
          {description && <p className="mt-3 type-body text-muted">{description}</p>}
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Only allow same-origin relative redirects. */
export function safeRedirect(value: string | string[] | undefined, fallback = "/account") {
  const target = Array.isArray(value) ? value[0] : value;
  if (!target || !target.startsWith("/") || target.startsWith("//")) return fallback;
  return target;
}
