"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRightIcon,
  MessageIcon,
  ScaleIcon,
  ShareIcon,
  ShieldIcon,
  SparkleIcon,
  SpinnerIcon,
  WhatsAppIcon,
} from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Disclosure";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { AvailabilityLabel, Badge, badgePriority, Price } from "@/components/ui/primitives";
import { toast } from "@/components/ui/Toast";
import { toUserMessage } from "@/lib/api/errors";
import { getProductPrice } from "@/lib/api/services/catalog";
import { MAX_LINE_QUANTITY } from "@/lib/cart";
import { metalPurityLabel, purityLabels } from "@/lib/catalog/filters";
import { reconcilePrice } from "@/lib/pricing/engine";
import { cn, formatINR, formatWeight } from "@/lib/utils";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { useCartStore } from "@/stores/cart";
import { useUIStore } from "@/stores/ui";
import type { InventoryAvailability, PriceBreakdown, Product } from "@/types/catalog";
import { CompareButton, WishlistButton } from "./ProductActions";
import { PriceBreakdownTable, SpecificationList } from "./ProductDetails";
import { ProductEnquiryDialog } from "./ProductEnquiryDialog";

interface LiveState {
  pricing: PriceBreakdown;
  availability: InventoryAvailability;
  netWeight: number;
  grossWeight: number;
}

export function PurchasePanel({
  product,
  variant = "page",
  onNavigate,
}: {
  product: Product;
  variant?: "page" | "quickview";
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const ids = useId();
  const addToCart = useCartStore((s) => s.add);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const isPage = variant === "page";

  const [size, setSize] = useState<string | undefined>(undefined);
  const [quantity, setQuantity] = useState(1);
  const [personalise, setPersonalise] = useState(false);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<{ size?: string; custom: Record<string, string> }>({ custom: {} });
  const [live, setLive] = useState<LiveState>({
    pricing: product.pricing,
    availability: product.availability,
    netWeight: product.netWeight,
    grossWeight: product.grossWeight,
  });
  const [priceStatus, setPriceStatus] = useState<"idle" | "updating" | "error">("idle");
  const [priceNote, setPriceNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  const requestId = useRef(0);
  const liveRef = useRef(live);
  const sizeGroupRef = useRef<HTMLFieldSetElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    liveRef.current = live;
  }, [live]);

  const sizeLabel = (value?: string | null) => product.sizes.find((s) => s.value === value)?.label;
  const hasSizes = product.sizes.length > 0;
  const purchasable = live.availability.purchasable;
  const original = live.pricing.originalPrice > live.pricing.finalPrice ? live.pricing.originalPrice : undefined;

  async function refreshPrice(nextSize: string | undefined) {
    const id = ++requestId.current;
    setPriceStatus("updating");
    try {
      const response = await getProductPrice(product.id, { size: nextSize });
      if (id !== requestId.current) return;
      const { price, changed } = reconcilePrice(liveRef.current.pricing, response.pricing);
      setLive({ pricing: price, availability: response.availability, netWeight: response.netWeight, grossWeight: response.grossWeight });
      setPriceNote(changed ? `Price updated for ${sizeLabel(nextSize) ?? "your selection"}.` : null);
      setPriceStatus("idle");
    } catch {
      if (id === requestId.current) setPriceStatus("error");
    }
  }

  // Re-validate the server-rendered price and stock against the live backend on mount.
  useEffect(() => {
    const id = ++requestId.current;
    let active = true;
    getProductPrice(product.id)
      .then((response) => {
        if (!active || id !== requestId.current) return;
        const { price, changed } = reconcilePrice(liveRef.current.pricing, response.pricing);
        setLive({ pricing: price, availability: response.availability, netWeight: response.netWeight, grossWeight: response.grossWeight });
        if (changed) setPriceNote("Price updated to the latest rate.");
      })
      .catch(() => {
        // Keep the rendered price; the cart and checkout re-validate with the server.
      });
    return () => {
      active = false;
    };
  }, [product.id]);

  // Sticky mobile purchase bar once the main actions have scrolled above the viewport.
  // A throttled scroll check also covers instant jumps (anchors, restored scroll position).
  useEffect(() => {
    if (!isPage) return;
    let frame = 0;
    const check = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = actionsRef.current;
        if (el) setShowSticky(el.getBoundingClientRect().bottom < 0);
      });
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [isPage]);

  useEffect(() => {
    if (!isPage) return;
    document.documentElement.classList.toggle("sticky-bar-visible", showSticky);
    return () => document.documentElement.classList.remove("sticky-bar-visible");
  }, [isPage, showSticky]);

  function selectSize(value: string) {
    setSize(value);
    setErrors((current) => ({ ...current, size: undefined }));
    void refreshPrice(value);
  }

  function validate() {
    const next: { size?: string; custom: Record<string, string> } = { custom: {} };
    if (hasSizes && !size) next.size = "Please select a size.";
    if (personalise) {
      for (const option of product.customization) {
        const value = custom[option.id]?.trim() ?? "";
        if (option.required && !value) next.custom[option.id] = `${option.label} is required.`;
        if (option.maxLength && value.length > option.maxLength) {
          next.custom[option.id] = `${option.label} can be up to ${option.maxLength} characters.`;
        }
      }
    }
    setErrors(next);
    if (next.size) {
      sizeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      sizeGroupRef.current?.focus({ preventScroll: true });
    }
    return !next.size && Object.keys(next.custom).length === 0;
  }

  async function handlePurchase(mode: "add" | "buy") {
    if (!validate() || !purchasable) return;
    setBusy(mode);
    const customization = personalise
      ? Object.fromEntries(Object.entries(custom).filter(([, value]) => value.trim() !== ""))
      : undefined;
    try {
      const cart = await addToCart({
        productId: product.id,
        slug: product.slug,
        size,
        quantity,
        customization: customization && Object.keys(customization).length ? customization : undefined,
      });
      const adjusted = cart.issues.find((issue) => issue.type === "quantity_adjusted");
      if (adjusted) toast({ title: adjusted.message });
      onNavigate?.();
      if (mode === "buy") {
        router.push("/checkout");
      } else {
        setCartOpen(true);
      }
    } catch (error) {
      toast({ title: "Couldn't add to your bag", description: toUserMessage(error), tone: "error" });
      void refreshPrice(size);
    } finally {
      setBusy(null);
    }
  }

  async function share() {
    const url = `${window.location.origin}/product/${product.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: product.shortDescription, url });
      } catch {
        // Share sheet dismissed.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Share it with someone special." });
    } catch {
      toast({ title: "Couldn't copy the link", tone: "error" });
    }
  }

  const badges = badgePriority.filter((b) => product.badges.includes(b));
  const TitleTag = isPage ? "h1" : "h2";
  const whatsappHref = whatsappUrl(whatsappMessages.product(product, sizeLabel(size)));

  return (
    <div className="flex flex-col">
      {badges.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <Badge key={badge} badge={badge} className={badge === "new" || badge === "trending" ? "border border-line" : undefined} />
          ))}
        </div>
      )}
      <p className="text-[0.6875rem] uppercase tracking-[0.18em] text-champagne-deep">
        {metalPurityLabel(product.metal, product.purity)} · {product.category.name}
      </p>
      <TitleTag id={isPage ? undefined : "quick-view-title"} className={cn("mt-3 text-balance text-ink", isPage ? "type-h1" : "type-h2")}>
        {product.name}
      </TitleTag>
      <p className="mt-3 type-body-sm text-muted">SKU {product.sku}</p>

      <div className="mt-6" aria-live="polite" aria-busy={priceStatus === "updating"}>
        <div className={cn("transition-opacity duration-300", priceStatus === "updating" && "opacity-50")}>
          <Price amount={live.pricing.finalPrice} original={original} size="lg" />
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 type-body-sm text-muted">
          <span>Inclusive of GST</span>
          {hasSizes && (
            <span>· {size ? `Price for ${sizeLabel(size)}` : `Shown for ${sizeLabel(product.defaultSize) ?? "standard size"}`}</span>
          )}
          {priceStatus === "updating" && (
            <span className="inline-flex items-center gap-1.5 text-ink-soft">
              <SpinnerIcon size={13} className="animate-spin" /> Updating price
            </span>
          )}
        </p>
        {priceNote && priceStatus === "idle" && <p className="mt-1.5 type-body-sm text-champagne-deep">{priceNote}</p>}
        {priceStatus === "error" && (
          <p className="mt-1.5 type-body-sm text-danger">
            We couldn&apos;t refresh the latest price. The final price will be confirmed at checkout.{" "}
            <button type="button" className="underline underline-offset-2" onClick={() => refreshPrice(size)}>
              Retry
            </button>
          </p>
        )}
      </div>

      {isPage && <p className="mt-6 type-body-lg text-ink-soft">{product.shortDescription}</p>}

      <dl className="mt-7 grid grid-cols-2 border-l border-t border-line sm:grid-cols-4">
        {[
          { label: "Purity", value: purityLabels[product.purity] },
          { label: "Gross wt.", value: formatWeight(live.grossWeight) },
          { label: "Net wt.", value: formatWeight(live.netWeight) },
          { label: "Making", value: formatINR(live.pricing.makingCharges) },
        ].map((spec) => (
          <div key={spec.label} className="border-b border-r border-line px-4 py-3.5">
            <dt className="text-[0.625rem] uppercase tracking-[0.16em] text-muted">{spec.label}</dt>
            <dd className="mt-1 type-body-sm font-medium text-ink tabular-nums">{spec.value}</dd>
          </div>
        ))}
      </dl>

      <AvailabilityLabel status={live.availability.status} message={live.availability.message} className="mt-5" />

      {hasSizes && (
        <fieldset
          ref={sizeGroupRef}
          tabIndex={-1}
          className="mt-7 outline-none"
          aria-describedby={errors.size ? `${ids}-size-error` : undefined}
        >
          <legend className="sr-only">Select size</legend>
          <div className="mb-3 flex items-center justify-between" aria-hidden="true">
            <span className="type-caption tracking-[0.16em] text-ink-soft">
              Size{size && <span className="ml-2 normal-case tracking-normal text-muted">— {sizeLabel(size)}</span>}
            </span>
            <Link href="/faq#faq-size" onClick={onNavigate} className="type-body-sm text-muted underline underline-offset-2 hover:text-ink" tabIndex={-1}>
              Size guide
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((option) => {
              const selected = size === option.value;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "relative flex h-11 min-w-12 items-center justify-center border px-3 type-body-sm transition-colors duration-200",
                    "has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                    !option.available
                      ? "cursor-not-allowed border-line text-subtle line-through"
                      : selected
                        ? "cursor-pointer border-ink bg-ink text-ivory"
                        : "cursor-pointer border-line text-ink hover:border-ink",
                  )}
                >
                  <input
                    type="radio"
                    name={`${ids}-size`}
                    value={option.value}
                    checked={selected}
                    disabled={!option.available}
                    onChange={() => selectSize(option.value)}
                    className="sr-only"
                  />
                  {option.label.replace(/^Size /, "")}
                  <span className="sr-only">{option.available ? "" : " — unavailable"}</span>
                </label>
              );
            })}
          </div>
          {errors.size && (
            <p id={`${ids}-size-error`} role="alert" className="mt-2 type-body-sm text-danger">
              {errors.size}
            </p>
          )}
          <Link href="/faq#faq-size" onClick={onNavigate} className="mt-3 inline-block type-body-sm text-muted underline underline-offset-2 hover:text-ink">
            Need help with sizing?
          </Link>
        </fieldset>
      )}

      {product.customization.length > 0 && purchasable && (
        <div className="mt-7 border border-line">
          <button
            type="button"
            aria-expanded={personalise}
            aria-controls={`${ids}-personalise`}
            onClick={() => setPersonalise((p) => !p)}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
          >
            <span className="flex items-center gap-3">
              <SparkleIcon size={18} className="text-champagne-deep" />
              <span>
                <span className="block type-body-sm font-medium text-ink">Add personalisation</span>
                <span className="block type-body-sm text-muted">Optional — {product.customization.map((c) => c.label.toLowerCase()).join(", ")}</span>
              </span>
            </span>
            <span className="type-caption text-ink-soft">{personalise ? "Remove" : "Add"}</span>
          </button>
          {personalise && (
            <div id={`${ids}-personalise`} className="space-y-4 border-t border-line px-4 pb-5 pt-4">
              {product.customization.map((option) => {
                const common = {
                  label: option.label,
                  hint: option.helpText,
                  required: option.required,
                  optional: !option.required,
                  error: errors.custom[option.id],
                  value: custom[option.id] ?? "",
                };
                if (option.type === "select") {
                  return (
                    <SelectField
                      key={option.id}
                      {...common}
                      placeholder="Choose"
                      options={option.options ?? []}
                      onChange={(e) => setCustom((c) => ({ ...c, [option.id]: e.target.value }))}
                    />
                  );
                }
                if (option.type === "textarea") {
                  return (
                    <TextAreaField
                      key={option.id}
                      {...common}
                      rows={3}
                      maxLength={option.maxLength}
                      onChange={(e) => setCustom((c) => ({ ...c, [option.id]: e.target.value }))}
                    />
                  );
                }
                return (
                  <TextField
                    key={option.id}
                    {...common}
                    maxLength={option.maxLength}
                    onChange={(e) => setCustom((c) => ({ ...c, [option.id]: e.target.value }))}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      <div ref={actionsRef} className="mt-8 space-y-3">
        {purchasable ? (
          <>
            <div className="flex gap-3">
              <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_LINE_QUANTITY} label={`Quantity for ${product.name}`} />
              <Button className="flex-1" onClick={() => handlePurchase("add")} loading={busy === "add"} loadingText="Adding" disabled={busy !== null}>
                Add to Bag
              </Button>
            </div>
            <Button variant="outline" fullWidth onClick={() => handlePurchase("buy")} loading={busy === "buy"} loadingText="Preparing checkout" disabled={busy !== null}>
              Buy Now
            </Button>
          </>
        ) : (
          <>
            <Button fullWidth disabled>
              {live.availability.status === "unavailable" ? "Currently Unavailable" : "Out of Stock"}
            </Button>
            <Button variant="outline" fullWidth onClick={() => setEnquiryOpen(true)}>
              Enquire About This Piece
            </Button>
          </>
        )}
        <div className="flex gap-3">
          <ButtonLink href={whatsappHref} external variant="whatsapp" className="flex-1">
            <WhatsAppIcon size={18} />
            WhatsApp Enquiry
          </ButtonLink>
          <WishlistButton product={product} variant="square" />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        {purchasable && (
          <button type="button" onClick={() => setEnquiryOpen(true)} className="inline-flex items-center gap-2 type-caption tracking-[0.16em] text-ink-soft transition-colors hover:text-ink">
            <MessageIcon size={16} />
            Enquire
          </button>
        )}
        <CompareButton product={product} variant="text" />
        <button type="button" onClick={share} className="inline-flex items-center gap-2 type-caption tracking-[0.16em] text-ink-soft transition-colors hover:text-ink">
          <ShareIcon size={16} />
          Share
        </button>
      </div>

      {isPage ? (
        <>
          <ul className="mt-8 grid gap-3 border-y border-line py-6 sm:grid-cols-3">
            {[
              { Icon: ScaleIcon, text: "Transparent price breakdown" },
              { Icon: ShieldIcon, text: "Secure, encrypted checkout" },
              { Icon: WhatsAppIcon, text: "Personal assistance on WhatsApp" },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-3 type-body-sm text-ink-soft sm:flex-col sm:text-center">
                <Icon size={20} className="shrink-0 text-champagne-deep" />
                {text}
              </li>
            ))}
          </ul>
          <Accordion
            className="mt-2 border-t-0"
            defaultOpen={["description"]}
            allowMultiple
            items={[
              { id: "description", title: "Description", content: <p className="type-body text-ink-soft">{product.description}</p> },
              {
                id: "specifications",
                title: "Jewellery Specifications",
                content: <SpecificationList product={product} netWeight={live.netWeight} grossWeight={live.grossWeight} size={size} />,
              },
              {
                id: "price",
                title: "Price Breakdown",
                content: (
                  <PriceBreakdownTable
                    pricing={live.pricing}
                    netWeight={live.netWeight}
                    purityLabel={purityLabels[product.purity]}
                  />
                ),
              },
              {
                id: "delivery",
                title: "Shipping, Returns & Care",
                content: (
                  <div className="space-y-3 type-body text-ink-soft">
                    <p>
                      Delivery timelines and return eligibility are confirmed with your order. Read our{" "}
                      <Link href="/shipping" className="underline underline-offset-2">Shipping Policy</Link> and{" "}
                      <Link href="/returns" className="underline underline-offset-2">Returns &amp; Refund Policy</Link>.
                    </p>
                    <p>Store each piece separately in a soft pouch and keep it away from perfume and chemicals.</p>
                  </div>
                ),
              },
            ]}
          />
        </>
      ) : (
        <div className="mt-8 border-t border-line pt-6">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between type-caption tracking-[0.16em] text-ink">
              Price breakdown
              <span className="text-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <PriceBreakdownTable className="mt-4" pricing={live.pricing} netWeight={live.netWeight} purityLabel={purityLabels[product.purity]} />
          </details>
          <Link
            href={`/product/${product.slug}`}
            onClick={onNavigate}
            className="mt-6 inline-flex items-center gap-2 type-button link-underline-static"
          >
            View Full Details
            <ArrowRightIcon size={14} />
          </Link>
        </div>
      )}

      <ProductEnquiryDialog open={enquiryOpen} onClose={() => setEnquiryOpen(false)} product={product} sizeLabel={sizeLabel(size)} />

      {isPage && (
        <div
          aria-hidden={!showSticky}
          inert={!showSticky}
          className={cn(
            "safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-porcelain/97 backdrop-blur-md transition-transform duration-500 ease-luxe lg:hidden",
            showSticky ? "translate-y-0" : "translate-y-full",
          )}
        >
          <div className="container-luxe flex h-[4.75rem] items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-[1.05rem] text-ink">{product.name}</p>
              <p className="type-body-sm font-medium text-ink tabular-nums">{formatINR(live.pricing.finalPrice)}</p>
            </div>
            {purchasable ? (
              <Button
                size="sm"
                className="h-11"
                loading={busy === "add"}
                onClick={() => (hasSizes && !size ? validate() : handlePurchase("add"))}
              >
                {hasSizes && !size ? "Select Size" : "Add to Bag"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="h-11" onClick={() => setEnquiryOpen(true)}>
                Enquire
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
