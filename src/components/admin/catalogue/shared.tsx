"use client";

import { useState, type ReactNode } from "react";
import { ImageOffIcon } from "@/components/icons";
import { AdminButton, ConfirmDialog, InlineAlert } from "@/components/admin/ui";
import { toast } from "@/components/ui/Toast";
import { adminApi, AdminApiError, errorMessage, type ImageAsset } from "@/lib/admin/client";
import { formatDateTime, money, percent } from "@/lib/admin/format";
import { cn } from "@/lib/utils";
import type { PriceBreakdown } from "./types";
import { unmappedErrors } from "./utils";

export function Thumb({ image, className }: { image: ImageAsset | null | undefined; className?: string }) {
  if (!image) {
    return (
      <span className={cn("flex h-12 w-10 shrink-0 items-center justify-center border border-line bg-cream text-subtle", className)} aria-hidden="true">
        <ImageOffIcon size={14} />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.url} alt={image.alt} loading="lazy" className={cn("h-12 w-10 shrink-0 border border-line bg-cream object-cover", className)} />
  );
}

/** Read-only image list for admins who can't change media. */
export function ImageStrip({ images, label = "Images" }: { images: ImageAsset[]; label?: string }) {
  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-[0.75rem] font-medium text-ink-soft">{label}</p>
      {images.length === 0 ? (
        <p className="border border-dashed border-line px-4 py-6 text-center text-[0.8125rem] text-muted">No images.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {images.map((image, index) => (
            <li key={`${image.url}-${index}`}>
              <Thumb image={image} className="h-24 w-20" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OptionGroup({ legend, hint, error, disabled, children, className }: { legend: ReactNode; hint?: ReactNode; error?: string; disabled?: boolean; children: ReactNode; className?: string }) {
  return (
    <fieldset disabled={disabled} className={cn("min-w-0 sm:col-span-2", className)}>
      <legend className="mb-2 text-[0.75rem] font-medium text-ink-soft">{legend}</legend>
      {children}
      {hint && !error && <p className="mt-1.5 text-[0.75rem] text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** Summary of a failed save: message, errors for fields not on screen, and a reload link for stale records. */
export function MutationAlert({ error, known = [], onReload, className }: { error: AdminApiError | null; known?: readonly string[]; onReload?: () => void; className?: string }) {
  if (!error) return null;
  const extra = unmappedErrors(error.fieldErrors, known);
  const stale = error.status === 409 || error.status === 404;
  return (
    <InlineAlert className={className}>
      <p>{error.message}</p>
      {extra.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
          {extra.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {stale && onReload && (
        <button type="button" onClick={onReload} className="mt-2 font-medium underline underline-offset-2">
          Reload the latest version
        </button>
      )}
    </InlineAlert>
  );
}

/** Confirmation + DELETE request. Render conditionally so state resets per target. */
export function DeleteDialog({
  path,
  title,
  description,
  successMessage,
  onClose,
  onDeleted,
}: {
  path: string;
  title: ReactNode;
  description: ReactNode;
  successMessage: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await adminApi.del(path);
      toast({ title: successMessage, tone: "success" });
      onDeleted();
      onClose();
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status === 404) {
        toast({ title: "That record was already removed." });
        onDeleted();
        onClose();
        return;
      }
      setError(errorMessage(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <ConfirmDialog open onClose={onClose} onConfirm={confirm} title={title} description={description} confirmLabel="Delete" tone="danger" pending={pending} error={error} />
  );
}

export function PriceBreakdownView({ pricing, pricingError }: { pricing: PriceBreakdown | null; pricingError: string | null }) {
  if (!pricing) return <InlineAlert tone="warning">{pricingError ?? "The price can't be calculated right now."}</InlineAlert>;
  const rows: [string, string][] = [
    ["Metal rate", `${money(pricing.metalRatePerGram)} / g`],
    ["Metal value", money(pricing.metalValue)],
    ["Making charges", money(pricing.makingCharges)],
    ["Stone charges", money(pricing.stoneCharges)],
    ["Other charges", money(pricing.otherCharges)],
    ["Discount", pricing.discount > 0 ? `− ${money(pricing.discount)}` : money(0)],
    ["Taxable value", money(pricing.taxableValue)],
    [`GST (${percent(pricing.gstRate)})`, money(pricing.gst)],
  ];
  return (
    <div className="border border-line bg-ivory">
      <dl className="divide-y divide-line text-[0.8125rem]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-4 py-2">
            <dt className="text-muted">{label}</dt>
            <dd className="tabular-nums text-ink">{value}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 bg-cream/60 px-4 py-3">
          <dt className="font-medium text-ink">Final price</dt>
          <dd className="text-right">
            <span className="font-serif text-[1.25rem] tabular-nums text-ink">{money(pricing.finalPrice)}</span>
            {pricing.originalPrice > pricing.finalPrice && <span className="ml-2 text-[0.75rem] text-muted line-through">{money(pricing.originalPrice)}</span>}
          </dd>
        </div>
      </dl>
      {(pricing.rateEffectiveAt || pricing.isEstimate) && (
        <p className="border-t border-line px-4 py-2 text-[0.75rem] text-muted">
          {pricing.rateEffectiveAt && `Rate effective ${formatDateTime(pricing.rateEffectiveAt)}. `}
          {pricing.isEstimate && "Estimated price."}
        </p>
      )}
    </div>
  );
}

export function RowActions({ onEdit, onDelete, label }: { onEdit?: () => void; onDelete?: () => void; label: string }) {
  if (!onEdit && !onDelete) return null;
  return (
    <div className="flex justify-end gap-1">
      {onEdit && (
        <AdminButton size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${label}`}>
          Edit
        </AdminButton>
      )}
      {onDelete && (
        <AdminButton size="sm" variant="ghost" onClick={onDelete} aria-label={`Delete ${label}`} className="text-danger hover:text-danger">
          Delete
        </AdminButton>
      )}
    </div>
  );
}
