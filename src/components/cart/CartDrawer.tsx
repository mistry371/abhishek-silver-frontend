"use client";

import { useEffect, useId } from "react";
import { useShallow } from "zustand/react/shallow";
import { BagIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { FormMessage } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { toUserMessage } from "@/lib/api/errors";
import { formatINR } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";
import { useUIStore } from "@/stores/ui";
import { CartLineItem } from "./CartLineItem";

const STALE_AFTER_MS = 2 * 60 * 1000;

export function CartDrawer() {
  const open = useUIStore((s) => s.cartOpen);
  const setOpen = useUIStore((s) => s.setCartOpen);
  const titleId = useId();
  const { cart, lines, status, busyLineId, setQuantity, remove, refresh } = useCartStore(
    useShallow((s) => ({
      cart: s.cart,
      lines: s.lines,
      status: s.status,
      busyLineId: s.busyLineId,
      setQuantity: s.setQuantity,
      remove: s.remove,
      refresh: s.refresh,
    })),
  );

  useEffect(() => {
    if (!open || lines.length === 0) return;
    if (!cart || Date.now() - Date.parse(cart.quotedAt) > STALE_AFTER_MS) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => setOpen(false);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const blocking = cart?.issues.some((issue) => issue.type === "out_of_stock" || issue.type === "unavailable") ?? false;
  const notices = cart?.issues.filter((issue) => issue.type !== "coupon_invalid") ?? [];

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      toast({ title: "Couldn't update your bag", description: toUserMessage(error), tone: "error" });
    }
  }

  return (
    <Dialog open={open} onClose={close} variant="drawer-right" labelledBy={titleId}>
      <DialogHeader
        titleId={titleId}
        title={
          <>
            Your Bag <span className="font-sans text-base text-muted">({count})</span>
          </>
        }
        onClose={close}
      />

      <div className="flex-1 overflow-y-auto overscroll-contain px-6 md:px-8">
        {lines.length === 0 ? (
          <EmptyState compact icon={BagIcon} title="Your bag is empty" description="Discover pieces designed to be treasured.">
            <ButtonLink href="/shop?new=true&sort=newest" onClick={close}>
              Shop New Arrivals
            </ButtonLink>
          </EmptyState>
        ) : !cart ? (
          <div className="space-y-6 py-6" aria-busy="true" aria-label="Loading your bag">
            {lines.map((line) => (
              <div key={line.lineId} className="flex gap-4">
                <Skeleton className="h-[7.5rem] w-24" />
                <div className="flex-1 space-y-3 pt-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {notices.length > 0 && (
              <div className="space-y-2 pt-5">
                {notices.map((issue, index) => (
                  <FormMessage key={index} tone={issue.type === "quantity_adjusted" ? "info" : "error"}>
                    {issue.message}
                  </FormMessage>
                ))}
              </div>
            )}
            <ul className="divide-y divide-line">
              {cart.items.map((item) => (
                <CartLineItem
                  key={item.lineId}
                  item={item}
                  busy={busyLineId === item.lineId}
                  onNavigate={close}
                  onQuantityChange={(quantity) => run(() => setQuantity(item.lineId, quantity))}
                  onRemove={() => run(() => remove(item.lineId))}
                />
              ))}
            </ul>
          </>
        )}
      </div>

      {lines.length > 0 && (
        <div className="safe-bottom shrink-0 border-t border-line bg-porcelain px-6 py-6 md:px-8">
          <dl className="space-y-2">
            <div className="flex items-baseline justify-between">
              <dt className="type-caption tracking-[0.16em] text-ink">Subtotal</dt>
              <dd className="text-lg font-medium text-ink tabular-nums" aria-live="polite">
                {cart ? formatINR(cart.totals.subtotal) : <Skeleton className="h-6 w-24" />}
              </dd>
            </div>
            {cart && cart.totals.productSavings > 0 && (
              <div className="flex items-baseline justify-between type-body-sm text-champagne-deep">
                <dt>You save</dt>
                <dd className="tabular-nums">{formatINR(cart.totals.productSavings)}</dd>
              </div>
            )}
          </dl>
          <p className="mt-2 type-body-sm text-muted">GST included. Coupons and delivery are confirmed at checkout.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <ButtonLink href="/cart" variant="outline" onClick={close}>
              View Bag
            </ButtonLink>
            {blocking || status === "loading" || !cart ? (
              <Button disabled>{blocking ? "Review Bag" : "Checkout"}</Button>
            ) : (
              <ButtonLink href="/checkout" onClick={close}>
                Checkout
              </ButtonLink>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
