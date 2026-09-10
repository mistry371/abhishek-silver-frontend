"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { OrderTotals } from "@/components/cart/OrderTotals";
import { CouponField } from "@/components/cart/CouponField";
import { AddressFields, emptyAddress, formatAddress, validateAddress, type AddressErrors } from "@/components/forms/AddressFields";
import { BagIcon, CheckIcon, ChevronDownIcon, LockIcon, WhatsAppIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { CheckboxField, FormMessage, RadioGroupField, TextAreaField, TextField } from "@/components/ui/Field";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { siteConfig } from "@/config/site";
import { apiError, isApiError, toUserMessage } from "@/lib/api/errors";
import { createOrder, reportPaymentFailure, verifyPayment } from "@/lib/api/services/commerce";
import { getAddresses } from "@/lib/api/services/customer";
import { loadRazorpay } from "@/lib/payments/razorpay";
import { cn, formatINR } from "@/lib/utils";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { getAuthToken, useCustomer } from "@/stores/auth";
import { useCartStore } from "@/stores/cart";
import { handleAuthError } from "@/stores/session";
import type { Address, AddressInput, CreateOrderResponse } from "@/types/customer";

type Step = 1 | 2 | 3;

function withoutId(address: Address): AddressInput {
  const { id: _id, isDefaultBilling: _b, isDefaultShipping: _s, label: _l, ...rest } = address;
  void _id;
  void _b;
  void _s;
  void _l;
  return { ...emptyAddress, ...rest };
}

export function CheckoutClient() {
  const router = useRouter();
  const ids = useId();
  const customer = useCustomer();
  const { cart, lines, status, refresh, clear } = useCartStore(
    useShallow((s) => ({ cart: s.cart, lines: s.lines, status: s.status, refresh: s.refresh, clear: s.clear })),
  );

  const [step, setStep] = useState<Step>(1);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string>("new");
  const [shipping, setShipping] = useState<AddressInput>(emptyAddress);
  const [shippingErrors, setShippingErrors] = useState<AddressErrors>({});
  const [billingSame, setBillingSame] = useState(true);
  const [billing, setBilling] = useState<AddressInput>(emptyAddress);
  const [billingErrors, setBillingErrors] = useState<AddressErrors>({});
  const [notes, setNotes] = useState("");

  const [placing, setPlacing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pending, setPending] = useState<CreateOrderResponse | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);
  const [paymentState, setPaymentState] = useState<"idle" | "processing" | "failed">("idle");
  const [redirecting, setRedirecting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Prefill contact details once the signed-in customer is known.
  if (customer && prefilledFor !== customer.id) {
    setPrefilledFor(customer.id);
    setContact({ name: `${customer.firstName} ${customer.lastName}`.trim(), email: customer.email, phone: customer.phone });
  }

  useEffect(() => {
    const token = getAuthToken();
    if (!customer || !token) return;
    let active = true;
    getAddresses(token)
      .then((list) => {
        if (!active) return;
        setAddresses(list);
        const preferred = list.find((a) => a.isDefaultShipping) ?? list[0];
        if (preferred) {
          setSelectedAddress(preferred.id);
          setShipping(withoutId(preferred));
        }
      })
      .catch((error) => {
        if (!active) return;
        if (handleAuthError(error)) toast({ title: "Your session has expired", description: "You can continue as a guest or sign in again." });
        setAddresses([]);
      });
    return () => {
      active = false;
    };
  }, [customer]);

  // Re-validate prices and stock as soon as checkout opens.
  useEffect(() => {
    if (useCartStore.getState().lines.length) void useCartStore.getState().refresh();
  }, []);

  if (redirecting) {
    return (
      <div className="container-narrow py-24 text-center" role="status">
        <CheckIcon size={36} className="mx-auto text-champagne-deep" />
        <p className="mt-4 type-h3 text-ink">Payment confirmed — preparing your order summary…</p>
      </div>
    );
  }

  if (status === "idle" || (lines.length > 0 && !cart && status !== "error")) {
    return (
      <div className="container-luxe grid gap-12 py-10 lg:grid-cols-12" aria-busy="true" aria-label="Loading checkout">
        <div className="space-y-6 lg:col-span-7">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-[28rem] w-full lg:col-span-5" />
      </div>
    );
  }

  if (lines.length === 0 && !pending) {
    return (
      <div className="container-luxe py-16">
        <EmptyState icon={BagIcon} title="Your bag is empty" description="Add a piece to your bag to begin checkout." className="border border-line bg-porcelain px-6">
          <ButtonLink href="/shop">Explore the Collection</ButtonLink>
        </EmptyState>
      </div>
    );
  }

  if (!customer && !siteConfig.features.guestCheckout) {
    return (
      <div className="container-narrow py-16">
        <EmptyState icon={LockIcon} title="Sign in to checkout" description="Please sign in or create an account to place your order." className="border border-line bg-porcelain px-6">
          <ButtonLink href="/login?redirect=/checkout">Sign In</ButtonLink>
          <ButtonLink href="/register?redirect=/checkout" variant="outline">
            Create Account
          </ButtonLink>
        </EmptyState>
      </div>
    );
  }

  const blocking = cart?.issues.some((issue) => issue.type === "out_of_stock" || issue.type === "unavailable") ?? false;
  const totals = pending?.order.totals ?? cart?.totals;

  function submitContact() {
    const errors: Record<string, string> = {};
    if (!contact.name.trim()) errors.name = "Please enter your full name.";
    if (!isValidEmail(contact.email)) errors.email = "Enter a valid email address.";
    if (!isValidIndianMobile(contact.phone)) errors.phone = "Enter a valid 10-digit mobile number.";
    setContactErrors(errors);
    if (Object.keys(errors).length === 0) {
      if (!shipping.fullName && !shipping.phone) setShipping((s) => ({ ...s, fullName: contact.name, phone: contact.phone }));
      setStep(2);
    }
  }

  function submitDelivery() {
    const sErrors = validateAddress(shipping);
    const bErrors = billingSame ? {} : validateAddress(billing);
    setShippingErrors(sErrors);
    setBillingErrors(bErrors);
    if (Object.keys(sErrors).length === 0 && Object.keys(bErrors).length === 0) setStep(3);
  }

  async function finalizePayment(orderId: string, providerOrderId: string, providerPaymentId: string, signature: string) {
    setPaymentState("processing");
    try {
      const order = await verifyPayment({ orderId, providerOrderId, providerPaymentId, signature }, getAuthToken());
      if (order.payment.status !== "paid") throw apiError("payment_failed");
      setRedirecting(true);
      setDemoOpen(false);
      clear();
      router.replace(`/order-confirmation/${order.id}`);
    } catch (error) {
      setPaymentState("failed");
      setCheckoutError(toUserMessage(error));
    }
  }

  async function openPayment(response: CreateOrderResponse) {
    const { order, paymentIntent } = response;
    if (paymentIntent.provider === "razorpay" && paymentIntent.keyId) {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setCheckoutError("We couldn't open the secure payment window. Please check your connection and try again.");
        return;
      }
      const razorpay = new window.Razorpay({
        key: paymentIntent.keyId,
        amount: Math.round(paymentIntent.amount * 100),
        currency: "INR",
        name: siteConfig.name,
        description: `Order ${order.orderNumber}`,
        order_id: paymentIntent.providerOrderId,
        prefill: { name: contact.name, email: contact.email, contact: contact.phone },
        theme: { color: "#1b1916" },
        handler: (result) => void finalizePayment(order.id, result.razorpay_order_id, result.razorpay_payment_id, result.razorpay_signature),
        modal: { ondismiss: () => setCheckoutError("Payment was not completed. You can try again whenever you're ready.") },
      });
      razorpay.on("payment.failed", () => {
        setPaymentState("failed");
        setCheckoutError(toUserMessage(apiError("payment_failed")));
        void reportPaymentFailure(order.id, getAuthToken()).catch(() => undefined);
      });
      razorpay.open();
      return;
    }
    setPaymentState("idle");
    setDemoOpen(true);
  }

  async function placeOrder() {
    setCheckoutError(null);
    if (pending) {
      await openPayment(pending);
      return;
    }
    setPlacing(true);
    try {
      const fresh = await refresh();
      if (!fresh) throw apiError("server_error");
      if (fresh.issues.some((issue) => issue.type === "out_of_stock" || issue.type === "unavailable")) {
        setCheckoutError("Some pieces in your bag are no longer available. Please review your bag before paying.");
        return;
      }
      const response = await createOrder(
        {
          items: useCartStore.getState().lines.map(({ lineId: _lineId, ...item }) => {
            void _lineId;
            return item;
          }),
          couponCode: fresh.coupon?.code ?? null,
          customer: { name: contact.name.trim(), email: contact.email.trim(), phone: contact.phone.trim() },
          shippingAddress: shipping,
          billingAddress: billingSame ? shipping : billing,
          notes: notes.trim() || undefined,
          paymentProvider: "razorpay",
        },
        getAuthToken(),
      );
      if (response.order.totals.grandTotal !== fresh.totals.grandTotal) {
        toast({ title: "Your total was updated", description: `Confirmed total: ${formatINR(response.order.totals.grandTotal)}` });
      }
      setPending(response);
      await openPayment(response);
    } catch (error) {
      setCheckoutError(toUserMessage(error));
      if (isApiError(error, "out_of_stock")) void refresh();
    } finally {
      setPlacing(false);
    }
  }

  const summary = cart && totals && (
    <div>
      <ul className="divide-y divide-line">
        {cart.items.map((item) => (
          <li key={item.lineId} className="flex gap-4 py-4">
            <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-cream">
              <Image src={item.product.images[0].url} alt="" fill sizes="64px" className="object-cover" />
              <span className="absolute -right-0 -top-0 flex h-5 min-w-5 items-center justify-center bg-ink px-1 text-[0.625rem] text-ivory">{item.quantity}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[1.02rem] leading-snug text-ink">{item.product.name}</p>
              <p className="mt-0.5 type-body-sm text-muted">
                {item.size ? item.product.sizes.find((s) => s.value === item.size)?.label : item.product.sku}
              </p>
              {!item.availability.purchasable && <p className="type-body-sm text-danger">Out of stock</p>}
            </div>
            <p className="type-body-sm text-ink tabular-nums">{formatINR(item.lineTotal)}</p>
          </li>
        ))}
      </ul>
      {!pending && <CouponField className="mt-4 border-t border-line pt-6" />}
      <OrderTotals className="mt-6 border-t border-line pt-6" totals={totals} coupon={pending?.order.coupon ?? cart.coupon} />
    </div>
  );

  return (
    <div className="container-luxe pb-24 pt-6 md:pt-10">
      <div className="mb-6 border border-line bg-porcelain lg:hidden">
        <button
          type="button"
          aria-expanded={summaryOpen}
          aria-controls={`${ids}-mobile-summary`}
          onClick={() => setSummaryOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 px-5 py-4"
        >
          <span className="flex items-center gap-2 type-caption tracking-[0.16em] text-ink">
            <BagIcon size={16} />
            {summaryOpen ? "Hide" : "Show"} order summary
            <ChevronDownIcon size={14} className={cn("transition-transform", summaryOpen && "rotate-180")} />
          </span>
          {totals && <span className="font-medium text-ink tabular-nums">{formatINR(totals.grandTotal)}</span>}
        </button>
        <div id={`${ids}-mobile-summary`} hidden={!summaryOpen} className="border-t border-line px-5 pb-6">
          {summary}
        </div>
      </div>

      <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <h1 className="type-h1 text-ink">Checkout</h1>
          {!customer && (
            <p className="mt-3 type-body text-muted">
              Checking out as a guest.{" "}
              <Link href="/login?redirect=/checkout" className="text-ink underline underline-offset-4">
                Sign in
              </Link>{" "}
              for faster checkout and order tracking.
            </p>
          )}

          <CheckoutStep
            number={1}
            title="Contact details"
            active={step === 1}
            complete={step > 1}
            onEdit={() => setStep(1)}
            summary={`${contact.name} · ${contact.email} · ${contact.phone}`}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                label="Full name"
                required
                autoComplete="name"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
                error={contactErrors.name}
                containerClassName="sm:col-span-2"
              />
              <TextField
                label="Email"
                type="email"
                required
                autoComplete="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                error={contactErrors.email}
                hint="Order updates are sent here."
              />
              <TextField
                label="Mobile number"
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                error={contactErrors.phone}
              />
            </div>
            <Button className="mt-8" onClick={submitContact}>
              Continue to Delivery
            </Button>
          </CheckoutStep>

          <CheckoutStep
            number={2}
            title="Delivery & billing"
            active={step === 2}
            complete={step > 2}
            onEdit={() => setStep(2)}
            summary={
              <>
                <span className="block">Deliver to: {shipping.fullName}, {formatAddress(shipping)}</span>
                <span className="block">Billing: {billingSame ? "Same as delivery address" : formatAddress(billing)}</span>
              </>
            }
          >
            {addresses && addresses.length > 0 && (
              <RadioGroupField
                legend="Saved addresses"
                name="saved-address"
                layout="cards"
                className="mb-8"
                value={selectedAddress}
                onChange={(value) => {
                  setSelectedAddress(value);
                  const found = addresses.find((a) => a.id === value);
                  setShipping(found ? withoutId(found) : { ...emptyAddress, fullName: contact.name, phone: contact.phone });
                  setShippingErrors({});
                }}
                options={[
                  ...addresses.map((address) => ({
                    value: address.id,
                    label: `${address.label ? `${address.label} · ` : ""}${address.fullName}`,
                    description: formatAddress(withoutId(address)),
                  })),
                  { value: "new", label: "Use a new address", description: "Enter delivery details below." },
                ]}
              />
            )}
            {(selectedAddress === "new" || !addresses?.length) && (
              <fieldset>
                <legend className="mb-5 type-caption tracking-[0.16em] text-ink-soft">Delivery address</legend>
                <AddressFields idPrefix={`${ids}-ship`} value={shipping} onChange={setShipping} errors={shippingErrors} />
              </fieldset>
            )}
            {selectedAddress !== "new" && Object.keys(shippingErrors).length > 0 && (
              <FormMessage tone="error" className="mt-4">
                The selected address is incomplete. Please choose “Use a new address” and update the details.
              </FormMessage>
            )}
            <CheckboxField className="mt-8" label="Billing address is the same as delivery address" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} />
            {!billingSame && (
              <fieldset className="mt-6">
                <legend className="mb-5 type-caption tracking-[0.16em] text-ink-soft">Billing address</legend>
                <AddressFields idPrefix={`${ids}-bill`} value={billing} onChange={setBilling} errors={billingErrors} />
              </fieldset>
            )}
            <TextAreaField className="mt-8" containerClassName="mt-8" label="Order notes" optional rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} hint="Gift message or delivery instructions." />
            <Button className="mt-8" onClick={submitDelivery}>
              Continue to Payment
            </Button>
          </CheckoutStep>

          <CheckoutStep number={3} title="Review & payment" active={step === 3} complete={false}>
            <RadioGroupField
              legend="Payment method"
              name="payment-method"
              layout="cards"
              value="online"
              onChange={() => undefined}
              options={[
                {
                  value: "online",
                  label: (
                    <span className="flex items-center gap-2">
                      <LockIcon size={15} /> Pay securely online
                    </span>
                  ),
                  description: "UPI, cards, net banking and wallets through our secure payment gateway.",
                },
              ]}
            />
            {checkoutError && (
              <FormMessage tone="error" className="mt-6">
                <span>
                  {checkoutError}{" "}
                  {blocking && (
                    <Link href="/cart" className="underline underline-offset-2">
                      Review your bag
                    </Link>
                  )}
                </span>
              </FormMessage>
            )}
            {pending && (
              <FormMessage tone="info" className="mt-6">
                Order {pending.order.orderNumber} is reserved and awaiting payment.
              </FormMessage>
            )}
            <Button size="lg" fullWidth className="mt-8" onClick={placeOrder} loading={placing} loadingText="Confirming your order" disabled={blocking || !totals}>
              <LockIcon size={16} />
              {pending ? "Retry Payment" : "Place Order & Pay"} {totals ? formatINR(totals.grandTotal) : ""}
            </Button>
            <p className="mt-4 type-body-sm text-muted">
              By placing your order you agree to our{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              . Your payment is verified by our servers before the order is confirmed.
            </p>
          </CheckoutStep>

          <a
            href={whatsappUrl(whatsappMessages.checkout())}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 type-body-sm text-ink-soft transition-colors hover:text-ink"
          >
            <WhatsAppIcon size={17} />
            Need assistance? Chat with us on WhatsApp
          </a>
        </div>

        <aside aria-labelledby="checkout-summary-title" className="hidden lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:col-span-5 lg:block">
          <div className="border border-line bg-porcelain p-8">
            <h2 id="checkout-summary-title" className="type-h3 text-ink">
              Order Summary
            </h2>
            {summary}
          </div>
        </aside>
      </div>

      {pending && (
        <Dialog open={demoOpen} onClose={() => paymentState !== "processing" && setDemoOpen(false)} labelledBy={`${ids}-payment-title`} closeOnBackdrop={false}>
          <DialogHeader
            title="Secure Payment"
            titleId={`${ids}-payment-title`}
            subtitle={`Order ${pending.order.orderNumber}`}
            onClose={() => paymentState !== "processing" && setDemoOpen(false)}
          />
          <div className="px-6 py-6 md:px-8 md:py-8">
            <div className="flex items-baseline justify-between border-b border-line pb-5">
              <span className="type-caption tracking-[0.16em] text-ink-soft">Amount due</span>
              <span className="text-2xl text-ink tabular-nums">{formatINR(pending.paymentIntent.amount)}</span>
            </div>
            <FormMessage tone="info" className="mt-6">
              <span>
                <strong className="font-medium">Demo payment gateway.</strong> No real payment is taken. Choose an outcome to simulate the gateway response — the order is only confirmed after server-side verification.
              </span>
            </FormMessage>
            {paymentState === "failed" && (
              <FormMessage tone="error" className="mt-4">
                The payment failed verification. You can try again.
              </FormMessage>
            )}
            <div className="mt-6 grid gap-3">
              <Button
                loading={paymentState === "processing"}
                loadingText="Verifying payment"
                onClick={() => finalizePayment(pending.order.id, pending.paymentIntent.providerOrderId, `pay_demo_${Date.now()}`, "demo_valid_signature")}
              >
                Simulate Successful Payment
              </Button>
              <Button
                variant="outline"
                disabled={paymentState === "processing"}
                onClick={() => finalizePayment(pending.order.id, pending.paymentIntent.providerOrderId, `pay_demo_${Date.now()}`, "invalid_signature")}
              >
                Simulate Failed Payment
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function CheckoutStep({
  number,
  title,
  active,
  complete,
  onEdit,
  summary,
  children,
}: {
  number: number;
  title: string;
  active: boolean;
  complete: boolean;
  onEdit?: () => void;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="border-b border-line py-8">
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className={cn("flex items-center gap-4 type-h3", active || complete ? "text-ink" : "text-subtle")}>
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-sans text-sm",
              complete ? "border-ink bg-ink text-ivory" : active ? "border-ink text-ink" : "border-line text-subtle",
            )}
            aria-hidden="true"
          >
            {complete ? <CheckIcon size={14} strokeWidth={2} /> : number}
          </span>
          {title}
          {complete && <span className="sr-only">(completed)</span>}
        </h2>
        {complete && !active && onEdit && (
          <button type="button" onClick={onEdit} className="type-caption tracking-[0.14em] text-ink link-underline-static">
            Edit
          </button>
        )}
      </div>
      {complete && !active && summary && <div className="mt-4 space-y-1 type-body-sm text-muted md:pl-12">{summary}</div>}
      {active && <div className="mt-8 md:pl-12">{children}</div>}
    </section>
  );
}
