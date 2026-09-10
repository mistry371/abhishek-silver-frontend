import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { SpinnerIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "outline-light"
  | "light"
  | "ghost"
  | "link"
  | "whatsapp";

export type ButtonSize = "sm" | "md" | "lg";

const base =
  "relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap select-none type-button transition-[background-color,color,border-color,opacity] duration-300 ease-luxe disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-ink text-ivory hover:bg-champagne-deep",
  secondary: "bg-champagne-mist text-ink hover:bg-champagne-soft",
  outline: "border border-ink/85 text-ink hover:bg-ink hover:text-ivory",
  "outline-light": "border border-ivory/70 text-ivory hover:bg-ivory hover:text-ink",
  light: "bg-ivory text-ink hover:bg-champagne-mist",
  ghost: "text-ink hover:bg-cream",
  link: "h-auto px-0 text-ink link-underline-static",
  whatsapp: "border border-whatsapp/60 text-whatsapp hover:bg-whatsapp hover:text-white hover:border-whatsapp",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-5",
  md: "h-12 px-7",
  lg: "h-14 px-10",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return cn(base, variants[variant], variant !== "link" && sizes[size], fullWidth && "w-full", className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  loadingText,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2.5", loading && "invisible")}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center gap-2">
          <SpinnerIcon size={16} className="animate-spin" />
          <span className={loadingText ? "" : "sr-only"}>{loadingText ?? "Loading"}</span>
        </span>
      )}
    </button>
  );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  external?: boolean;
  children: ReactNode;
}

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  external,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const classes = buttonStyles({ variant, size, fullWidth, className });
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "dark" | "light";
  size?: "sm" | "md";
  ref?: React.Ref<HTMLButtonElement>;
}

export function IconButton({ label, tone = "dark", size = "md", className, children, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center transition-colors duration-300 ease-luxe disabled:opacity-40",
        size === "md" ? "h-11 w-11" : "h-9 w-9",
        tone === "dark" ? "text-ink hover:text-champagne-deep" : "text-ivory hover:text-champagne-soft",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
