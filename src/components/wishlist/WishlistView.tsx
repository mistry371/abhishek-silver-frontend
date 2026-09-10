"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon, HeartIcon, WhatsAppIcon } from "@/components/icons";
import { cardIconButtonClass } from "@/components/product/ProductActions";
import { ProductCardSkeleton } from "@/components/product/ProductCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { AvailabilityLabel, Badge, EmptyState, Price } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { toUserMessage } from "@/lib/api/errors";
import { compareProducts } from "@/lib/api/services/catalog";
import { getWishlist } from "@/lib/api/services/commerce";
import { metalPurityLabel } from "@/lib/catalog/filters";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { getAuthToken, useCustomer } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { usePersistHydrated } from "@/stores/hydration";
import { handleAuthError } from "@/stores/session";
import { useUIStore } from "@/stores/ui";
import { useWishlistStore } from "@/stores/wishlist";
import type { ComparisonItem, WishlistItem } from "@/types/commerce";

export function WishlistView({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const hydrated = usePersistHydrated(useWishlistStore);
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.remove);
  const customer = useCustomer();
  const addToCart = useCartStore((s) => s.add);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const openQuickView = useUIStore((s) => s.openQuickView);
  const [live, setLive] = useState<Record<string, ComparisonItem>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // Signed-in wishlists are server-backed.
  useEffect(() => {
    const token = getAuthToken();
    if (!hydrated || !token) return;
    getWishlist(token)
      .then((serverItems) => useWishlistStore.setState({ items: serverItems }))
      .catch((error) => handleAuthError(error));
  }, [hydrated, customer?.id]);

  // Refresh price & availability for every saved piece.
  const idKey = items.map((item) => item.productId).join(",");
  useEffect(() => {
    if (!hydrated || !idKey) return;
    let active = true;
    compareProducts(idKey.split(","))
      .then((fresh) => active && setLive(Object.fromEntries(fresh.map((entry) => [entry.productId, entry]))))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [hydrated, idKey]);

  async function remove(item: WishlistItem) {
    try {
      await removeItem(item.productId);
    } catch (error) {
      toast({ title: "Couldn't update your wishlist", description: toUserMessage(error), tone: "error" });
    }
  }

  async function moveToBag(item: WishlistItem) {
    if (!item.product) return;
    if (item.product.sizes.length > 0) {
      openQuickView(item.slug);
      return;
    }
    setBusyId(item.productId);
    try {
      await addToCart({ productId: item.productId, slug: item.slug, quantity: 1 });
      await removeItem(item.productId);
      setCartOpen(true);
    } catch (error) {
      toast({ title: "Couldn't move to your bag", description: toUserMessage(error), tone: "error" });
    } finally {
      setBusyId(null);
    }
  }

  if (!hydrated) {
    return (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4" aria-busy="true" aria-label="Loading wishlist">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={HeartIcon}
        title="Your wishlist is empty"
        description="Save the pieces you love and return to them whenever you're ready."
        className="border border-line bg-porcelain px-6"
      >
        <ButtonLink href="/shop">Explore the Collection</ButtonLink>
        {!customer && (
          <ButtonLink href="/login?redirect=/wishlist" variant="outline">
            Sign in to sync
          </ButtonLink>
        )}
      </EmptyState>
    );
  }

  const Heading = `h${headingLevel}` as "h2" | "h3";

  return (
    <>
      {!customer && (
        <p className="mb-8 type-body-sm text-muted">
          Your wishlist is saved on this device.{" "}
          <Link href="/login?redirect=/wishlist" className="text-ink underline underline-offset-4">
            Sign in
          </Link>{" "}
          to keep it across devices.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
        {items.map((item) => {
          const product = item.product;
          if (!product) return null;
          const fresh = live[item.productId];
          const availability = fresh?.availability ?? product.availability;
          const price = fresh?.finalPrice ?? product.finalPrice;
          const href = `/product/${item.slug}`;
          return (
            <li key={item.productId} className="flex flex-col">
              <div className="relative aspect-[4/5] overflow-hidden bg-cream">
                <Link href={href} tabIndex={-1} aria-hidden="true" className="absolute inset-0">
                  <Image
                    src={product.images[0].url}
                    alt=""
                    fill
                    sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 48vw"
                    className="object-cover transition-transform duration-700 ease-luxe hover:scale-[1.03]"
                  />
                </Link>
                {!availability.purchasable && (
                  <span className="absolute left-3 top-3">
                    <Badge badge="out_of_stock" />
                  </span>
                )}
                <button type="button" onClick={() => remove(item)} aria-label={`Remove ${product.name} from wishlist`} className={`${cardIconButtonClass} absolute right-2.5 top-2.5`}>
                  <CloseIcon size={16} />
                </button>
              </div>
              <p className="mt-4 text-[0.625rem] uppercase tracking-[0.16em] text-muted">{metalPurityLabel(product.metal, product.purity)}</p>
              <Heading className="mt-1.5 type-product-title text-ink">
                <Link href={href} className="transition-colors hover:text-champagne-deep">
                  {product.name}
                </Link>
              </Heading>
              <Price amount={price} size="sm" className="mt-2" />
              <AvailabilityLabel status={availability.status} className="mt-1.5" />
              <div className="mt-4">
                {availability.purchasable ? (
                  <Button variant="outline" size="sm" fullWidth onClick={() => moveToBag(item)} loading={busyId === item.productId}>
                    {product.sizes.length > 0 ? "Select Size" : "Move to Bag"}
                  </Button>
                ) : (
                  <ButtonLink href={whatsappUrl(whatsappMessages.product(product))} external variant="whatsapp" size="sm" fullWidth>
                    <WhatsAppIcon size={16} />
                    Enquire
                  </ButtonLink>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
