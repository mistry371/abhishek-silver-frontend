import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Brand lockup: circular logo mark + wordmark.
 * On small phones the wordmark stacks onto two lines so the header never crowds.
 */
export function Logo({
  compact = false,
  tone = "dark",
  size = "md",
  className,
  onClick,
}: {
  compact?: boolean;
  tone?: "dark" | "light";
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
}) {
  const [first, ...rest] = siteConfig.name.split(" ");
  const md = size === "md";

  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label={`${siteConfig.name} — home`}
      className={cn("flex items-center gap-2.5 sm:gap-3", tone === "dark" ? "text-ink" : "text-ivory", className)}
    >
      <Image
        src={siteConfig.logo.url}
        alt=""
        width={siteConfig.logo.width}
        height={siteConfig.logo.height}
        priority={md}
        className={cn(
          "shrink-0 rounded-full object-cover transition-[width,height] duration-500 ease-luxe",
          tone === "light" && "ring-1 ring-champagne-soft/40",
          md ? (compact ? "h-9 w-9 lg:h-11 lg:w-11" : "h-9 w-9 sm:h-10 sm:w-10 lg:h-14 lg:w-14") : "h-9 w-9",
        )}
      />
      <span className="flex flex-col items-start leading-none">
        <span
          className={cn(
            "flex whitespace-nowrap font-serif font-medium uppercase transition-[font-size,letter-spacing] duration-500 ease-luxe",
            md
              ? cn(
                  "flex-col text-[0.9rem] leading-[1.12] tracking-[0.16em] sm:flex-row sm:gap-[0.35em] sm:text-[1.1rem] sm:leading-none sm:tracking-[0.18em]",
                  compact ? "lg:text-[1.4rem] lg:tracking-[0.2em]" : "lg:text-[1.75rem] lg:tracking-[0.22em]",
                )
              : "flex-row gap-[0.35em] text-[1rem] tracking-[0.16em]",
          )}
        >
          <span>{first}</span>
          {rest.length > 0 && <span>{rest.join(" ")}</span>}
        </span>
        {md && (
          <span
            aria-hidden="true"
            className={cn(
              "hidden overflow-hidden font-sans text-[0.5625rem] uppercase tracking-[0.38em] transition-[max-height,opacity,margin] duration-500 ease-luxe lg:block",
              tone === "dark" ? "text-champagne-deep" : "text-champagne-soft",
              compact ? "mt-0 max-h-0 opacity-0" : "mt-2.5 max-h-4 opacity-100",
            )}
          >
            {siteConfig.tagline}
          </span>
        )}
      </span>
    </Link>
  );
}
