"use client";

import { useId, useState, type FormEvent } from "react";
import { SuccessIcon, WhatsAppIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { FormMessage, RadioGroupField, TextAreaField, TextField } from "@/components/ui/Field";
import { submitEnquiry } from "@/lib/api/services/customer";
import { toUserMessage } from "@/lib/api/errors";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { getAuthToken, useCustomer } from "@/stores/auth";
import type { PreferredContact } from "@/types/customer";

interface EnquiryProduct {
  id: string;
  name: string;
  sku: string;
  slug: string;
}

export function ProductEnquiryDialog({
  open,
  onClose,
  product,
  sizeLabel,
}: {
  open: boolean;
  onClose: () => void;
  product: EnquiryProduct;
  sizeLabel?: string;
}) {
  const titleId = useId();
  const customer = useCustomer();
  const initialMessage = `I'd like more details about ${product.name} (SKU ${product.sku})${sizeLabel ? `, ${sizeLabel}` : ""}.`;
  const [values, setValues] = useState({
    name: customer ? `${customer.firstName} ${customer.lastName}`.trim() : "",
    mobile: customer?.phone ?? "",
    email: customer?.email ?? "",
    message: initialMessage,
    preferredContact: "whatsapp" as PreferredContact,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [reference, setReference] = useState("");
  const [serverError, setServerError] = useState("");

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!isValidIndianMobile(values.mobile)) next.mobile = "Enter a valid 10-digit mobile number.";
    if (!isValidEmail(values.email)) next.email = "Enter a valid email address.";
    if (values.message.trim().length < 10) next.message = "Please tell us a little more (at least 10 characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    setServerError("");
    try {
      const enquiry = await submitEnquiry(
        {
          type: "product",
          name: values.name.trim(),
          mobile: values.mobile.trim(),
          email: values.email.trim(),
          message: values.message.trim(),
          preferredContact: values.preferredContact,
          product: { id: product.id, name: product.name, sku: product.sku },
        },
        getAuthToken(),
      );
      setReference(enquiry.reference);
      setStatus("success");
    } catch (error) {
      setServerError(toUserMessage(error));
      setStatus("error");
    }
  }

  function handleClose() {
    onClose();
    if (status === "success") {
      window.setTimeout(() => {
        setStatus("idle");
        setValues((current) => ({ ...current, message: initialMessage }));
      }, 450);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} labelledBy={titleId} className="max-w-xl">
      <DialogHeader title="Enquire about this piece" titleId={titleId} subtitle={`${product.name} · SKU ${product.sku}`} onClose={handleClose} />
      {status === "success" ? (
        <div className="px-6 py-10 text-center md:px-8">
          <SuccessIcon size={40} className="mx-auto text-champagne-deep" />
          <p className="mt-5 type-h3 text-ink">Thank you — we&apos;ve received your enquiry</p>
          <p className="mt-3 type-body text-muted">
            Your reference is <span className="font-medium text-ink">{reference}</span>. Our team will get in touch using your preferred contact method.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            <ButtonLink href={whatsappUrl(whatsappMessages.product(product, sizeLabel))} external variant="whatsapp">
              <WhatsAppIcon size={18} />
              Continue on WhatsApp
            </ButtonLink>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-5 px-6 py-6 md:px-8 md:py-8">
          {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
          <TextField label="Full name" required autoComplete="name" value={values.name} onChange={(e) => update("name", e.target.value)} error={errors.name} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Mobile number"
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={values.mobile}
              onChange={(e) => update("mobile", e.target.value)}
              error={errors.mobile}
            />
            <TextField
              label="Email"
              required
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              error={errors.email}
            />
          </div>
          <TextAreaField label="Message" required rows={4} value={values.message} onChange={(e) => update("message", e.target.value)} error={errors.message} />
          <RadioGroupField
            legend="Preferred contact method"
            name="enquiry-contact"
            layout="inline"
            value={values.preferredContact}
            onChange={(value) => update("preferredContact", value as PreferredContact)}
            options={[
              { value: "whatsapp", label: "WhatsApp" },
              { value: "phone", label: "Phone call" },
              { value: "email", label: "Email" },
            ]}
          />
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button type="submit" loading={status === "submitting"} loadingText="Sending" className="sm:flex-1">
              Submit Enquiry
            </Button>
            <ButtonLink href={whatsappUrl(whatsappMessages.product(product, sizeLabel))} external variant="whatsapp" className="sm:flex-1">
              <WhatsAppIcon size={18} />
              WhatsApp
            </ButtonLink>
          </div>
        </form>
      )}
    </Dialog>
  );
}
