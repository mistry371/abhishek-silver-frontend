"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AlertIcon, InvoiceIcon, SuccessIcon, WhatsAppIcon } from "@/components/icons";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { formatAddress } from "@/components/forms/AddressFields";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { isApiError } from "@/lib/api/errors";
import { getOrder } from "@/lib/api/services/commerce";
import { metalPurityLabel } from "@/lib/catalog/filters";
import { formatDateTime, formatINR } from "@/lib/utils";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { getAuthToken, useAuthStore, useCustomer } from "@/stores/auth";
import { usePersistHydrated } from "@/stores/hydration";
import type { Order } from "@/types/customer";
import { OrderTimeline, PaymentStatusLabel } from "./OrderStatus";

type State = { status: "loading" } | { status: "ready"; order: Order } | { status: "missing" } | { status: "error" };

export function OrderConfirmationClient({ orderId }: { orderId: string }) {
  const authHydrated = usePersistHydrated(useAuthStore);
  const customer = useCustomer();
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${orderId}::${attempt}`;
  const [result, setResult] = useState<{ key: string; state: State } | null>(null);
  const state: State = result?.key === requestKey ? result.state : { status: "loading" };

  useEffect(() => {
    if (!authHydrated) return;
    let active = true;
    getOrder(orderId, getAuthToken())
      .then((order) => {
        if (active) setResult({ key: requestKey, state: { status: "ready", order } });
      })
      .catch((error) => {
        if (active) setResult({ key: requestKey, state: isApiError(error, "not_found") ? { status: "missing" } : { status: "error" } });
      });
    return () => {
      active = false;
    };
  }, [orderId, authHydrated, requestKey]);

  if (state.status === "loading") {
    return (
      <div className="container-luxe py-16" aria-busy="true" aria-label="Loading your order">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-full" />
        </div>
        <div className="mt-14 grid gap-10 lg:grid-cols-12">
          <Skeleton className="h-80 lg:col-span-7" />
          <Skeleton className="h-80 lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (state.status === "missing" || state.status === "error") {
    return (
      <div className="container-luxe py-16">
        <EmptyState
          icon={AlertIcon}
          title={state.status === "missing" ? "We couldn't find this order" : "We couldn't load your order"}
          description={
            state.status === "missing"
              ? "Please check the link, or sign in to view your orders. Our team can also help on WhatsApp."
              : "Please check your connection and try again."
          }
          className="border border-line bg-porcelain px-6"
          headingLevel={1}
        >
          {state.status === "error" && <Button onClick={() => setAttempt((a) => a + 1)}>Try Again</Button>}
          <ButtonLink href={customer ? "/account/orders" : "/login"} variant="outline">
            {customer ? "My Orders" : "Sign In"}
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  const { order } = state;
  const firstName = order.customer.name.split(" ")[0];
  const paid = order.payment.status === "paid";
  const ownsOrder = Boolean(customer);

  return (
    <div className="container-luxe pb-24 pt-12 md:pt-16">
      <div className="mx-auto max-w-2xl text-center">
        {paid ? <SuccessIcon size={48} className="mx-auto text-champagne-deep" /> : <AlertIcon size={48} className="mx-auto text-warning" />}
        <p className="mt-6 type-eyebrow text-champagne-deep">Order {order.orderNumber}</p>
        <h1 className="mt-4 type-h1 text-balance text-ink">{paid ? `Thank you, ${firstName}` : "Your order is awaiting payment"}</h1>
        <p className="mt-4 type-body-lg text-muted">
          {paid
            ? `Your order has been placed and confirmed. We'll keep you updated at ${order.customer.email}.`
            : "We haven't received a verified payment for this order yet. If an amount was debited, please contact us with your order number."}
        </p>
        <div className="mt-6 flex justify-center">
          <PaymentStatusLabel status={order.payment.status} />
        </div>
      </div>

      <div className="mt-14 grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
        <div className="space-y-10 lg:col-span-7">
          <section aria-labelledby="confirmation-progress" className="border border-line bg-porcelain p-6 md:p-8">
            <h2 id="confirmation-progress" className="mb-8 type-h3 text-ink">
              Order progress
            </h2>
            <OrderTimeline order={order} />
          </section>

          <section aria-labelledby="confirmation-items" className="border border-line bg-porcelain p-6 md:p-8">
            <h2 id="confirmation-items" className="type-h3 text-ink">
              Items ({order.totals.itemCount})
            </h2>
            <ul className="mt-4 divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-cream">
                    <Image src={item.image.url} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">{metalPurityLabel(item.metal, item.purity)}</p>
                    <p className="mt-1 font-serif text-lg leading-snug text-ink">{item.name}</p>
                    <p className="type-body-sm text-muted">
                      SKU {item.sku}
                      {item.size ? ` · Size ${item.size}` : ""} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="type-body-sm text-ink tabular-nums">{formatINR(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:col-span-5">
          <section aria-labelledby="confirmation-summary" className="border border-line bg-porcelain p-6 md:p-8">
            <h2 id="confirmation-summary" className="type-h3 text-ink">
              Summary
            </h2>
            <OrderTotals className="mt-6" totals={order.totals} coupon={order.coupon} />
            <dl className="mt-8 space-y-4 border-t border-line pt-6 type-body-sm">
              <div>
                <dt className="type-caption tracking-[0.16em] text-muted">Placed on</dt>
                <dd className="mt-1 text-ink">{formatDateTime(order.createdAt)}</dd>
              </div>
              <div>
                <dt className="type-caption tracking-[0.16em] text-muted">Deliver to</dt>
                <dd className="mt-1 text-ink">
                  {order.shippingAddress.fullName}
                  <br />
                  {formatAddress(order.shippingAddress)}
                </dd>
              </div>
              <div>
                <dt className="type-caption tracking-[0.16em] text-muted">Payment</dt>
                <dd className="mt-1">
                  <PaymentStatusLabel status={order.payment.status} />
                </dd>
              </div>
              <div>
                <dt className="type-caption tracking-[0.16em] text-muted">Invoice</dt>
                <dd className="mt-1 text-ink">
                  {order.invoiceUrl ? (
                    <a href={order.invoiceUrl} className="inline-flex items-center gap-2 underline underline-offset-4">
                      <InvoiceIcon size={16} /> Download invoice
                    </a>
                  ) : (
                    <span className="text-muted">Your invoice will be available once your order is processed.</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>
          <div className="grid gap-3">
            {ownsOrder ? (
              <>
                <ButtonLink href={`/account/orders/${order.id}`}>Track Order</ButtonLink>
                <ButtonLink href="/account/orders" variant="outline">
                  View All Orders
                </ButtonLink>
              </>
            ) : (
              <ButtonLink href={whatsappUrl(whatsappMessages.order(order.orderNumber))} external variant="whatsapp">
                <WhatsAppIcon size={18} />
                Track Order on WhatsApp
              </ButtonLink>
            )}
            <ButtonLink href="/shop" variant={ownsOrder ? "link" : "outline"} className={ownsOrder ? "mt-2 justify-self-center" : undefined}>
              Continue Shopping
            </ButtonLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
