"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { ArrowRightIcon, SpinnerIcon, SuccessIcon } from "@/components/icons";
import { subscribeNewsletter } from "@/lib/api/services/customer";
import { toUserMessage } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { isValidEmail } from "@/lib/validation";

export function NewsletterForm({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState("");
  const dark = tone === "dark";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setFieldError("Please enter a valid email address.");
      return;
    }
    setFieldError("");
    setStatus("loading");
    try {
      const result = await subscribeNewsletter(email.trim());
      setStatus("success");
      setMessage(result.alreadySubscribed ? "You're already on our list — thank you." : "Thank you. You're on the list.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(toUserMessage(error));
    }
  }

  if (status === "success") {
    return (
      <p role="status" className={cn("flex items-start gap-3 type-body", dark ? "text-ivory" : "text-ink", className)}>
        <SuccessIcon size={20} className={cn("mt-0.5 shrink-0", dark ? "text-champagne-soft" : "text-champagne-deep")} />
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={className}>
      <label htmlFor={`${id}-email`} className="sr-only">
        Email address
      </label>
      <div
        className={cn(
          "flex items-center border-b transition-colors focus-within:border-current",
          fieldError ? "border-danger" : dark ? "border-ivory/30 text-ivory" : "border-ink/40 text-ink",
        )}
      >
        <input
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your email address"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${id}-error` : `${id}-note`}
          disabled={status === "loading"}
          className={cn(
            "h-12 min-w-0 flex-1 bg-transparent type-body outline-none focus-visible:outline-none",
            dark ? "text-ivory placeholder:text-ivory/40" : "text-ink placeholder:text-subtle",
          )}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={cn(
            "flex h-12 items-center gap-2 pl-4 type-button transition-colors",
            dark ? "text-ivory hover:text-champagne-soft" : "text-ink hover:text-champagne-deep",
          )}
        >
          {status === "loading" ? <SpinnerIcon size={16} className="animate-spin" /> : null}
          <span>Subscribe</span>
          {status !== "loading" && <ArrowRightIcon size={14} />}
        </button>
      </div>
      {fieldError && (
        <p id={`${id}-error`} role="alert" className={cn("mt-2 type-body-sm", dark ? "text-[#e8a39a]" : "text-danger")}>
          {fieldError}
        </p>
      )}
      {status === "error" && (
        <p role="alert" className={cn("mt-2 type-body-sm", dark ? "text-[#e8a39a]" : "text-danger")}>
          {message}
        </p>
      )}
      <p id={`${id}-note`} className={cn("mt-3 type-body-sm", dark ? "text-ivory/45" : "text-muted")}>
        By subscribing you agree to our{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
