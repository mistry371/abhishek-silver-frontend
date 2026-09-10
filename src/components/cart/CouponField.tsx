"use client";

import { useId, useState, type FormEvent } from "react";
import { TagIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { inputStyles } from "@/components/ui/Field";
import { USE_MOCK_API } from "@/lib/api/config";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";

export function CouponField({ className }: { className?: string }) {
  const id = useId();
  const cart = useCartStore((s) => s.cart);
  const applyCoupon = useCartStore((s) => s.applyCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const applied = cart?.coupon;

  async function onApply(event: FormEvent) {
    event.preventDefault();
    if (!code.trim()) {
      setMessage({ tone: "error", text: "Enter a coupon code." });
      return;
    }
    setLoading(true);
    const result = await applyCoupon(code);
    setLoading(false);
    setMessage({ tone: result.ok ? "success" : "error", text: result.message });
    if (result.ok) setCode("");
  }

  async function onRemove() {
    setLoading(true);
    try {
      await removeCoupon();
      setMessage(null);
    } catch {
      setMessage({ tone: "error", text: "Couldn't remove the coupon. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      {applied ? (
        <div className="flex items-center justify-between gap-3 border border-dashed border-champagne bg-champagne-mist/50 px-4 py-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 type-caption tracking-[0.16em] text-ink">
              <TagIcon size={14} />
              {applied.code}
            </p>
            <p className="mt-0.5 truncate type-body-sm text-muted">{applied.description}</p>
          </div>
          <button type="button" onClick={onRemove} disabled={loading} className="shrink-0 type-caption tracking-[0.14em] text-muted transition-colors hover:text-ink">
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={onApply} noValidate>
          <label htmlFor={`${id}-code`} className="mb-2 block type-caption tracking-[0.16em] text-ink-soft">
            Coupon code
          </label>
          <div className="flex">
            <input
              id={`${id}-code`}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setMessage(null);
              }}
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter code"
              aria-invalid={message?.tone === "error" ? true : undefined}
              aria-describedby={message ? `${id}-message` : undefined}
              className={inputStyles(message?.tone === "error", "h-12 min-w-0 flex-1 uppercase tracking-[0.08em]")}
            />
            <Button type="submit" variant="outline" className="h-12 shrink-0 border-l-0 px-5" loading={loading}>
              Apply
            </Button>
          </div>
        </form>
      )}
      {message && (
        <p id={`${id}-message`} role={message.tone === "error" ? "alert" : "status"} className={cn("mt-2 type-body-sm", message.tone === "error" ? "text-danger" : "text-success")}>
          {message.text}
        </p>
      )}
      {USE_MOCK_API && !applied && <p className="mt-2 type-body-sm text-subtle">Demo codes: WELCOME5 · FESTIVE2000 · SILVER10</p>}
    </div>
  );
}
