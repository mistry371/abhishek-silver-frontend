"use client";

import { CopyIcon, FacebookIcon, WhatsAppIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";

export function ShareArticle({ title, path }: { title: string; path: string }) {
  const url = () => `${window.location.origin}${path}`;
  const buttonClass = "flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink";

  return (
    <div className="flex items-center gap-3">
      <span className="type-caption tracking-[0.16em] text-muted">Share</span>
      <button type="button" className={buttonClass} aria-label="Share on WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url()}`)}`, "_blank", "noopener,noreferrer")}>
        <WhatsAppIcon size={17} />
      </button>
      <button type="button" className={buttonClass} aria-label="Share on Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`, "_blank", "noopener,noreferrer")}>
        <FacebookIcon size={17} />
      </button>
      <button
        type="button"
        className={buttonClass}
        aria-label="Copy link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            toast({ title: "Link copied" });
          } catch {
            toast({ title: "Couldn't copy the link", tone: "error" });
          }
        }}
      >
        <CopyIcon size={16} />
      </button>
    </div>
  );
}
