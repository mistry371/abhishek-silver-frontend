import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./primitives";
import { cn } from "@/lib/utils";

/** Compact page header for utility pages (bag, wishlist, account, policies). */
export function PageIntro({
  breadcrumbs,
  eyebrow,
  title,
  description,
  children,
  align = "left",
  className,
}: {
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={cn("container-luxe pb-10 pt-8 md:pb-14 md:pt-10", centered && "text-center", className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className={cn(centered && "flex justify-center")} />}
      {eyebrow && <p className={cn("type-eyebrow text-champagne-deep", breadcrumbs ? "mt-8" : "")}>{eyebrow}</p>}
      <h1 className={cn("type-h1 text-balance text-ink", eyebrow ? "mt-3" : breadcrumbs ? "mt-8" : "")}>{title}</h1>
      {description && <p className={cn("mt-4 max-w-2xl type-body-lg text-muted", centered && "mx-auto")}>{description}</p>}
      {children}
    </div>
  );
}
