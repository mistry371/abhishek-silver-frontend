"use client";

import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { BagIcon, HeartIcon, LockIcon, ScaleIcon, WhatsAppIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { toUserMessage } from "@/lib/api/errors";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { CartLineItem } from "./CartLineItem";
import { CouponField } from "./CouponField";
import { OrderTotals } from "./OrderTotals";

export function CartPageClient() {
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
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const wishlistItems = useWishlistStore((s) => s.items);

  async function run(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      toast({ title: "Couldn't update your bag", description: toUserMessage(error), tone: "error" });
    }
  }

  if (status === "idle" || (lines.length > 0 && !cart && status !== "error")) {
    return (
      <div className="container-luxe grid gap-12 pb-24 lg:grid-cols-12" aria-busy="true" aria-label="Loading your bag">
        <div className="space-y-8 lg:col-span-8">
          {Array.from({ length: Math.max(lines.length, 2) }).map((_, i) => (
            <div key={i} className="flex gap-6 border-b border-line pb-8">
              <Skeleton className="h-44 w-36" />
              <div className="flex-1 space-y-3 pt-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-96 w-full lg:col-span-4" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-luxe pb-24">
        <EmptyState icon={BagIcon} title="Your bag is empty" description="Discover pieces designed to be treasured — or revisit the ones you've saved." className="border border-line bg-porcelain px-6">
          <ButtonLink href="/shop?new=true&sort=newest">Shop New Arrivals</ButtonLink>
          <ButtonLink href="/wishlist" variant="outline">
            <HeartIcon size={17} />
            View Wishlist
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  if (!cart) {
    return (
      <div className="container-luxe pb-24">
        <EmptyState title="We couldn't load your bag" description="Please check your connection and try again." className="border border-line bg-porcelain px-6">
          <Button onClick={() => refresh()}>Try Again</Button>
        </EmptyState>
      </div>
    );
  }

  const blocking = cart.issues.some((issue) => issue.type === "out_of_stock" || issue.type === "unavailable");
  const notices = cart.issues.filter((issue) => issue.type !== "coupon_invalid");

  return (
    <div className="container-luxe grid items-start gap-12 pb-24 lg:grid-cols-12 lg:gap-16">
      <section aria-labelledby="bag-items-title" className="lg:col-span-8">
        <h2 id="bag-items-title" className="sr-only">
          Items in your bag
        </h2>
        {notices.length > 0 && (
          <div className="mb-6 space-y-2">
            {notices.map((issue, index) => (
              <FormMessage key={index} tone={issue.type === "quantity_adjusted" ? "info" : "error"}>
                {issue.message}
              </FormMessage>
            ))}
          </div>
        )}
        <div className="hidden grid-cols-[1fr_auto] border-b border-line pb-3 type-caption tracking-[0.16em] text-muted md:grid">
          <span>Product</span>
          <span>Total</span>
        </div>
        <ul className="divide-y divide-line border-b border-line">
          {cart.items.map((item) => (
            <CartLineItem
              key={item.lineId}
              variant="page"
              item={item}
              busy={busyLineId === item.lineId}
              onQuantityChange={(quantity) => run(() => setQuantity(item.lineId, quantity))}
              onRemove={() => run(() => remove(item.lineId))}
              onMoveToWishlist={() =>
                run(async () => {
                  if (!wishlistItems.some((w) => w.productId === item.productId)) await toggleWishlist(item.product);
                  await remove(item.lineId);
                  toast({ title: "Moved to wishlist", description: item.product.name, action: { label: "View wishlist", href: "/wishlist" } });
                })
              }
            />
          ))}
        </ul>
        <Link href="/shop" className="mt-8 inline-block type-button link-underline-static">
          Continue Shopping
        </Link>
      </section>

      <aside aria-labelledby="bag-summary-title" className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:col-span-4">
        <div className="border border-line bg-porcelain p-6 md:p-8">
          <h2 id="bag-summary-title" className="type-h3 text-ink">
            Order Summary
          </h2>
          <CouponField className="mt-6" />
          <OrderTotals className="mt-8" totals={cart.totals} coupon={cart.coupon} shippingLabel="Calculated at checkout" />
          <div className="mt-8 space-y-3">
            {blocking ? (
              <Button fullWidth disabled>
                Remove unavailable pieces to continue
              </Button>
            ) : (
              <ButtonLink href="/checkout" fullWidth size="lg">
                <LockIcon size={16} />
                Proceed to Checkout
              </ButtonLink>
            )}
            <ButtonLink href="/shop" variant="outline" fullWidth>
              Continue Shopping
            </ButtonLink>
          </div>
          <p className="mt-5 type-body-sm text-muted">Prices, stock and coupons are confirmed again when you place your order.</p>
        </div>
        <ul className="mt-6 space-y-3 px-1">
          <li className="flex items-center gap-3 type-body-sm text-ink-soft">
            <ScaleIcon size={18} className="text-champagne-deep" />
            Transparent jewellery pricing
          </li>
          <li className="flex items-center gap-3 type-body-sm text-ink-soft">
            <LockIcon size={18} className="text-champagne-deep" />
            Secure, encrypted payment
          </li>
          <li>
            <a
              href={whatsappUrl(whatsappMessages.checkout())}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 type-body-sm text-ink-soft transition-colors hover:text-ink"
            >
              <WhatsAppIcon size={18} className="text-champagne-deep" />
              Need help? Chat with us on WhatsApp
            </a>
          </li>
        </ul>
      </aside>
    </div>
  );
}
