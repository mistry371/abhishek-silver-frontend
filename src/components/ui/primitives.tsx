import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { cn, formatINR } from "@/lib/utils";
import type { ProductBadge } from "@/types/catalog";

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  cta,
  as: Tag = "h2",
  tone = "dark",
  id,
  className,
  titleClassName,
  reveal = true,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  cta?: { label: string; href: string };
  as?: "h1" | "h2" | "h3";
  /** "light" renders ivory text for dark sections. */
  tone?: "dark" | "light";
  id?: string;
  className?: string;
  titleClassName?: string;
  reveal?: boolean;
}) {
  const centered = align === "center";
  const light = tone === "light";
  return (
    <div
      data-reveal={reveal ? "" : undefined}
      className={cn(
        "flex flex-col gap-6",
        centered ? "items-center text-center" : cta && "md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow && (
          <p className={cn("mb-4 type-eyebrow", light ? "text-champagne-soft" : "text-champagne-deep")}>{eyebrow}</p>
        )}
        <Tag id={id} className={cn("type-h2 text-balance", light ? "text-ivory" : "text-ink", titleClassName)}>
          {title}
        </Tag>
        {description && (
          <p className={cn("mt-4 type-body-lg text-pretty", light ? "text-ivory/70" : "text-muted", centered && "mx-auto max-w-xl")}>
            {description}
          </p>
        )}
      </div>
      {cta && (
        <ButtonLink
          href={cta.href}
          variant="link"
          className={cn("shrink-0", light && "text-ivory", centered && "mt-1")}
        >
          {cta.label}
        </ButtonLink>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Breadcrumbs                                                         */
/* ------------------------------------------------------------------ */

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items, className, tone = "dark" }: { items: BreadcrumbItem[]; className?: string; tone?: "dark" | "light" }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("no-scrollbar overflow-x-auto", className)}>
      <ol
        className={cn(
          "flex items-center gap-2.5 whitespace-nowrap text-[0.6875rem] uppercase tracking-[0.16em]",
          tone === "dark" ? "text-muted" : "text-ivory/70",
        )}
      >
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2.5">
              {index > 0 && (
                <span aria-hidden="true" className={tone === "dark" ? "text-line-strong" : "text-ivory/40"}>
                  /
                </span>
              )}
              {item.href && !last ? (
                <Link href={item.href} className={cn("transition-colors", tone === "dark" ? "hover:text-ink" : "hover:text-ivory")}>
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={tone === "dark" ? "text-ink" : "text-ivory"}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export const badgeLabels: Record<ProductBadge, string> = {
  new: "New",
  best_seller: "Best Seller",
  trending: "Trending",
  sale: "Sale",
  limited: "Limited",
  out_of_stock: "Out of Stock",
};

const badgeTones: Record<ProductBadge, string> = {
  new: "bg-porcelain text-ink",
  best_seller: "bg-ink text-ivory",
  trending: "bg-porcelain text-ink",
  sale: "bg-champagne-deep text-ivory",
  limited: "bg-onyx text-champagne-soft",
  out_of_stock: "bg-cream text-muted",
};

/** Display order when space is limited. */
export const badgePriority: ProductBadge[] = ["out_of_stock", "sale", "limited", "new", "best_seller", "trending"];

export function Badge({ badge, className }: { badge: ProductBadge; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-[5px] text-[0.625rem] font-medium uppercase leading-none tracking-[0.18em]",
        badgeTones[badge],
        className,
      )}
    >
      {badgeLabels[badge]}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center border border-line px-2.5 py-1 text-[0.6875rem] uppercase tracking-[0.14em] text-ink-soft",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Price                                                               */
/* ------------------------------------------------------------------ */

export function Price({
  amount,
  original,
  size = "md",
  showSavings = true,
  className,
}: {
  amount: number;
  original?: number;
  size?: "sm" | "md" | "lg";
  showSavings?: boolean;
  className?: string;
}) {
  const discounted = original !== undefined && original > amount;
  const savePercent = discounted ? Math.round(((original - amount) / original) * 100) : 0;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <span
        className={cn(
          "text-ink",
          size === "sm" && "text-[0.875rem] font-medium tabular-nums",
          size === "md" && "type-price",
          size === "lg" && "text-[1.625rem] font-normal tracking-[0.01em] tabular-nums md:text-[1.875rem]",
        )}
      >
        <span className="sr-only">{discounted ? "Sale price " : "Price "}</span>
        {formatINR(amount)}
      </span>
      {discounted && (
        <>
          <span className={cn("text-subtle line-through tabular-nums", size === "lg" ? "text-base" : "text-[0.8125rem]")}>
            <span className="sr-only">Original price </span>
            {formatINR(original)}
          </span>
          {showSavings && savePercent > 0 && (
            <span className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-champagne-deep">
              Save {savePercent}%
            </span>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback & loading                                                  */
/* ------------------------------------------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  compact = false,
  className,
  headingLevel = 2,
}: {
  icon?: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  className?: string;
  headingLevel?: 1 | 2 | 3;
}) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <div className={cn("mx-auto flex max-w-md flex-col items-center text-center", compact ? "py-10" : "py-16 md:py-24", className)}>
      {Icon && (
        <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-full border border-line text-champagne-deep">
          <Icon size={28} />
        </div>
      )}
      <Heading className="type-h3 text-balance text-ink">{title}</Heading>
      {description && <p className="mt-3 type-body text-pretty text-muted">{description}</p>}
      {children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function Divider({ className, ornament = false }: { className?: string; ornament?: boolean }) {
  if (!ornament) return <hr className={cn("border-0 border-t border-line", className)} />;
  return (
    <div className={cn("flex items-center justify-center gap-4", className)} aria-hidden="true">
      <span className="h-px w-12 bg-champagne/50" />
      <span className="h-1.5 w-1.5 rotate-45 border border-champagne" />
      <span className="h-px w-12 bg-champagne/50" />
    </div>
  );
}

/** Customer-facing stock label. Never shows stock quantities. */
export function AvailabilityLabel({
  status,
  message,
  className,
}: {
  status: "in_stock" | "low_stock" | "out_of_stock" | "unavailable";
  message?: string;
  className?: string;
}) {
  const config = {
    in_stock: { label: "In stock", dot: "bg-success" },
    low_stock: { label: "Only a few left", dot: "bg-warning" },
    out_of_stock: { label: "Out of stock", dot: "bg-danger" },
    unavailable: { label: "Currently unavailable", dot: "bg-subtle" },
  }[status];
  return (
    <p className={cn("flex items-center gap-2 type-body-sm text-ink-soft", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} aria-hidden="true" />
      <span>{config.label}</span>
      {message && <span className="text-muted">· {message}</span>}
    </p>
  );
}
