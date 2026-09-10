"use client";

import { AlertIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";

/** Customer-safe error boundary. Technical details are never shown; connect monitoring here. */
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="container-narrow flex flex-col items-center py-24 text-center md:py-32">
      <span className="flex h-20 w-20 items-center justify-center rounded-full border border-line text-champagne-deep">
        <AlertIcon size={28} />
      </span>
      <h1 className="mt-8 type-h1 text-ink">Something went wrong</h1>
      <p className="mt-4 max-w-md type-body-lg text-muted">
        We couldn&apos;t load this page right now. Please check your connection and try again in a moment.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Try Again</Button>
        <ButtonLink href="/" variant="outline">
          Return Home
        </ButtonLink>
      </div>
    </section>
  );
}
