"use client";

import { useState, type FormEvent } from "react";
import { SuccessIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { FormMessage, RadioGroupField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { toUserMessage } from "@/lib/api/errors";
import { submitEnquiry } from "@/lib/api/services/customer";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";
import { getAuthToken, useCustomer } from "@/stores/auth";
import type { PreferredContact } from "@/types/customer";

const subjects = ["Product enquiry", "Order support", "Custom jewellery", "Store visit", "Other"];

export function ContactForm() {
  const customer = useCustomer();
  const [values, setValues] = useState({ name: "", email: "", mobile: "", subject: "", message: "", preferredContact: "phone" as PreferredContact });
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [serverError, setServerError] = useState("");
  const [reference, setReference] = useState("");

  if (customer && prefilledFor !== customer.id) {
    setPrefilledFor(customer.id);
    setValues((v) => ({ ...v, name: v.name || `${customer.firstName} ${customer.lastName}`.trim(), email: v.email || customer.email, mobile: v.mobile || customer.phone }));
  }

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!isValidEmail(values.email)) next.email = "Enter a valid email address.";
    if (!isValidIndianMobile(values.mobile)) next.mobile = "Enter a valid 10-digit mobile number.";
    if (!values.subject) next.subject = "Select a subject.";
    if (values.message.trim().length < 10) next.message = "Please write a short message (at least 10 characters).";
    setErrors(next);
    if (Object.keys(next).length) return;
    setStatus("submitting");
    setServerError("");
    try {
      const enquiry = await submitEnquiry(
        {
          type: "contact",
          name: values.name.trim(),
          email: values.email.trim(),
          mobile: values.mobile.trim(),
          subject: values.subject,
          message: values.message.trim(),
          preferredContact: values.preferredContact,
        },
        getAuthToken(),
      );
      setReference(enquiry.reference);
      setStatus("success");
    } catch (error) {
      setServerError(toUserMessage(error));
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="border border-line bg-porcelain px-6 py-14 text-center">
        <SuccessIcon size={40} className="mx-auto text-champagne-deep" />
        <h3 className="mt-5 type-h3 text-ink">Thank you for reaching out</h3>
        <p className="mx-auto mt-3 max-w-sm type-body text-muted">
          We&apos;ve received your message (reference <span className="font-medium text-ink">{reference}</span>) and will get back to you soon.
        </p>
        <Button
          variant="outline"
          className="mt-8"
          onClick={() => {
            setStatus("idle");
            setValues((v) => ({ ...v, subject: "", message: "" }));
          }}
        >
          Send Another Message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 border border-line bg-porcelain p-6 md:p-10">
      {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
      <TextField label="Full name" required autoComplete="name" value={values.name} onChange={(e) => update("name", e.target.value)} error={errors.name} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Email" type="email" required autoComplete="email" value={values.email} onChange={(e) => update("email", e.target.value)} error={errors.email} />
        <TextField label="Mobile number" type="tel" inputMode="tel" required autoComplete="tel" value={values.mobile} onChange={(e) => update("mobile", e.target.value)} error={errors.mobile} />
      </div>
      <SelectField
        label="Subject"
        required
        placeholder="What can we help with?"
        options={subjects.map((subject) => ({ value: subject, label: subject }))}
        value={values.subject}
        onChange={(e) => update("subject", e.target.value)}
        error={errors.subject}
      />
      <TextAreaField label="Message" required rows={5} maxLength={2000} value={values.message} onChange={(e) => update("message", e.target.value)} error={errors.message} />
      <RadioGroupField
        legend="Preferred contact method"
        name="contact-preference"
        layout="inline"
        value={values.preferredContact}
        onChange={(value) => update("preferredContact", value as PreferredContact)}
        options={[
          { value: "phone", label: "Phone call" },
          { value: "whatsapp", label: "WhatsApp" },
          { value: "email", label: "Email" },
        ]}
      />
      <Button type="submit" size="lg" fullWidth loading={status === "submitting"} loadingText="Sending">
        Send Message
      </Button>
    </form>
  );
}
