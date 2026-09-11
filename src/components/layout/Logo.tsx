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
  /** "lg" is the site header lockup: bold wordmark 2px larger than "md", with the mark 2px larger to match. */
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}) {
  const [first, ...rest] = siteConfig.name.split(" ");
  const md = size !== "sm";
  const lg = size === "lg";

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
          !md && "h-9 w-9",
          md && !lg && (compact ? "h-9 w-9 lg:h-11 lg:w-11" : "h-9 w-9 sm:h-10 sm:w-10 lg:h-14 lg:w-14"),
          lg && (compact ? "h-9.5 w-9.5 lg:h-11.5 lg:w-11.5" : "h-9.5 w-9.5 sm:h-10.5 sm:w-10.5 lg:h-14.5 lg:w-14.5"),
        )}
      />
      <span className="flex flex-col items-start leading-none">
        <span
          className={cn(
            "flex whitespace-nowrap font-serif uppercase transition-[font-size,letter-spacing] duration-500 ease-luxe",
            lg ? "font-bold" : "font-medium",
            md
              ? cn(
                  "flex-col leading-[1.12] tracking-[0.16em] sm:flex-row sm:gap-[0.35em] sm:leading-none sm:tracking-[0.18em]",
                  lg ? "text-[1.025rem] sm:text-[1.225rem]" : "text-[0.9rem] sm:text-[1.1rem]",
                  compact ? "lg:tracking-[0.2em]" : "lg:tracking-[0.22em]",
                  compact ? (lg ? "lg:text-[1.525rem]" : "lg:text-[1.4rem]") : lg ? "lg:text-[1.875rem]" : "lg:text-[1.75rem]",
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
