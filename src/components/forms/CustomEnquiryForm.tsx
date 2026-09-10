"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CloseIcon, SuccessIcon, UploadIcon, WhatsAppIcon } from "@/components/icons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FieldShell, FormMessage, RadioGroupField, SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { toUserMessage } from "@/lib/api/errors";
import { submitEnquiry } from "@/lib/api/services/customer";
import { cn } from "@/lib/utils";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";
import { whatsappUrl } from "@/lib/whatsapp";
import { getAuthToken, useCustomer } from "@/stores/auth";
import type { PreferredContact } from "@/types/customer";

const jewelleryTypes = ["Ring", "Earrings", "Necklace", "Chain", "Bracelet", "Bangles / Kada", "Pendant", "Mangalsutra", "Bridal set", "Other"];
const budgetRanges = ["Under ₹25,000", "₹25,000 – ₹50,000", "₹50,000 – ₹1,00,000", "₹1,00,000 – ₹2,50,000", "₹2,50,000 – ₹5,00,000", "Above ₹5,00,000", "Not sure yet"];
const purityByMetal: Record<string, string[]> = {
  Gold: ["22KT", "18KT", "Not sure"],
  Silver: ["925 Sterling", "999 Fine", "Not sure"],
  "Not sure": ["Not sure"],
};

const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

interface Attachment {
  file: File;
  preview: string;
}

export function CustomEnquiryForm() {
  const ids = useId();
  const customer = useCustomer();
  const fileInput = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState({
    name: "",
    mobile: "",
    email: "",
    jewelleryType: "",
    budgetRange: "",
    preferredMetal: "Gold",
    preferredPurity: "",
    description: "",
    preferredContact: "whatsapp" as PreferredContact,
  });
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileError, setFileError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const [reference, setReference] = useState("");

  if (customer && prefilledFor !== customer.id) {
    setPrefilledFor(customer.id);
    setValues((current) => ({
      ...current,
      name: current.name || `${customer.firstName} ${customer.lastName}`.trim(),
      mobile: current.mobile || customer.phone,
      email: current.email || customer.email,
    }));
  }

  // Release object URLs for previews.
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);
  useEffect(() => () => attachmentsRef.current.forEach((a) => URL.revokeObjectURL(a.preview)), []);

  function update<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value, ...(key === "preferredMetal" ? { preferredPurity: "" } : {}) }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  }

  function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setFileError("");
    const next = [...attachments];
    for (const file of files) {
      if (next.length >= MAX_FILES) {
        setFileError(`You can attach up to ${MAX_FILES} images.`);
        break;
      }
      if (!ACCEPTED.includes(file.type)) {
        setFileError("Please upload JPG, PNG or WebP images.");
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        setFileError("Each image must be 5 MB or smaller.");
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setAttachments(next);
  }

  function removeAttachment(index: number) {
    setAttachments((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, i) => i !== index);
    });
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Please enter your name.";
    if (!isValidIndianMobile(values.mobile)) next.mobile = "Enter a valid 10-digit mobile number.";
    if (!isValidEmail(values.email)) next.email = "Enter a valid email address.";
    if (!values.jewelleryType) next.jewelleryType = "Select the type of jewellery.";
    if (!values.budgetRange) next.budgetRange = "Select a budget range.";
    if (values.description.trim().length < 20) next.description = "Please describe your idea in a little more detail (at least 20 characters).";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setStatus("submitting");
    setServerError("");
    try {
      // In production, images are uploaded to cloud storage (e.g. pre-signed URLs) and the references sent here.
      const enquiry = await submitEnquiry(
        {
          type: "custom_jewellery",
          name: values.name.trim(),
          mobile: values.mobile.trim(),
          email: values.email.trim(),
          message: values.description.trim(),
          jewelleryType: values.jewelleryType,
          budgetRange: values.budgetRange,
          preferredMetal: values.preferredMetal,
          preferredPurity: values.preferredPurity || undefined,
          preferredContact: values.preferredContact,
          attachments: attachments.map(({ file }) => ({ name: file.name, size: file.size, type: file.type })),
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

  const whatsappMessage = `Hello, I'd like to discuss a custom ${values.jewelleryType ? values.jewelleryType.toLowerCase() : "jewellery piece"}${values.preferredMetal !== "Not sure" ? ` in ${values.preferredMetal.toLowerCase()}` : ""}${values.budgetRange ? `, budget ${values.budgetRange}` : ""}.${values.description ? `\n\n${values.description}` : ""}`;

  if (status === "success") {
    return (
      <div role="status" className="border border-line bg-porcelain px-6 py-14 text-center md:px-12">
        <SuccessIcon size={44} className="mx-auto text-champagne-deep" />
        <h3 className="mt-6 type-h2 text-ink">Thank you — your design brief is with us</h3>
        <p className="mx-auto mt-4 max-w-md type-body-lg text-muted">
          Your reference is <span className="font-medium text-ink">{reference}</span>. Our team will review your idea and contact you by{" "}
          {values.preferredContact === "whatsapp" ? "WhatsApp" : values.preferredContact === "phone" ? "phone" : "email"}.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/shop" variant="outline">
            Explore the Collection
          </ButtonLink>
          <ButtonLink href={whatsappUrl(`Hello, I've submitted a custom jewellery enquiry (${reference}).`)} external variant="whatsapp">
            <WhatsAppIcon size={18} />
            Continue on WhatsApp
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8 border border-line bg-porcelain p-6 md:p-10">
      {serverError && <FormMessage tone="error">{serverError}</FormMessage>}

      <fieldset className="space-y-5">
        <legend className="mb-5 type-eyebrow text-champagne-deep">Your details</legend>
        <TextField label="Full name" required autoComplete="name" value={values.name} onChange={(e) => update("name", e.target.value)} error={errors.name} />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="Mobile number" required type="tel" inputMode="tel" autoComplete="tel" value={values.mobile} onChange={(e) => update("mobile", e.target.value)} error={errors.mobile} />
          <TextField label="Email" required type="email" autoComplete="email" value={values.email} onChange={(e) => update("email", e.target.value)} error={errors.email} />
        </div>
      </fieldset>

      <fieldset className="space-y-5 border-t border-line pt-8">
        <legend className="mb-5 type-eyebrow text-champagne-deep">Your piece</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Jewellery type"
            required
            placeholder="Select type"
            options={jewelleryTypes.map((type) => ({ value: type, label: type }))}
            value={values.jewelleryType}
            onChange={(e) => update("jewelleryType", e.target.value)}
            error={errors.jewelleryType}
          />
          <SelectField
            label="Budget range"
            required
            placeholder="Select budget"
            options={budgetRanges.map((range) => ({ value: range, label: range }))}
            value={values.budgetRange}
            onChange={(e) => update("budgetRange", e.target.value)}
            error={errors.budgetRange}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <RadioGroupField
            legend="Preferred metal"
            name={`${ids}-metal`}
            layout="inline"
            value={values.preferredMetal}
            onChange={(value) => update("preferredMetal", value)}
            options={Object.keys(purityByMetal).map((metal) => ({ value: metal, label: metal }))}
          />
          <SelectField
            label="Preferred purity"
            optional
            placeholder="Select purity"
            options={purityByMetal[values.preferredMetal].map((purity) => ({ value: purity, label: purity }))}
            value={values.preferredPurity}
            onChange={(e) => update("preferredPurity", e.target.value)}
          />
        </div>
        <TextAreaField
          label="Describe your idea"
          required
          rows={6}
          maxLength={2000}
          placeholder="The occasion, the style you love, stones, engraving, size, timeline…"
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          error={errors.description}
        />

        <FieldShell id={`${ids}-files`} label="Reference images" optional hint={`Up to ${MAX_FILES} images · JPG, PNG or WebP · 5 MB each`} error={fileError}>
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-8 text-center transition-colors",
              fileError ? "border-danger" : "border-line-strong hover:border-ink",
            )}
          >
            <UploadIcon size={24} className="text-champagne-deep" />
            <p className="type-body-sm text-ink-soft">Sketches, inspiration photos or heirlooms you&apos;d like to reimagine</p>
            <input
              ref={fileInput}
              id={`${ids}-files`}
              type="file"
              accept={ACCEPTED.join(",")}
              multiple
              onChange={onFiles}
              className="sr-only"
              aria-describedby={fileError ? `${ids}-files-error` : `${ids}-files-hint`}
            />
            <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={attachments.length >= MAX_FILES}>
              Choose Images
            </Button>
          </div>
        </FieldShell>
        {attachments.length > 0 && (
          <ul className="flex flex-wrap gap-3" aria-label="Selected images">
            {attachments.map((attachment, index) => (
              <li key={attachment.preview} className="relative h-24 w-20 overflow-hidden border border-line bg-cream">
                <Image src={attachment.preview} alt={attachment.file.name} fill unoptimized sizes="80px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  aria-label={`Remove ${attachment.file.name}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-ivory"
                >
                  <CloseIcon size={12} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <RadioGroupField
        className="border-t border-line pt-8"
        legend="How should we contact you?"
        name={`${ids}-contact`}
        layout="inline"
        value={values.preferredContact}
        onChange={(value) => update("preferredContact", value as PreferredContact)}
        options={[
          { value: "whatsapp", label: "WhatsApp" },
          { value: "phone", label: "Phone call" },
          { value: "email", label: "Email" },
        ]}
      />

      <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row">
        <Button type="submit" size="lg" className="sm:flex-1" loading={status === "submitting"} loadingText="Submitting">
          Submit Enquiry
        </Button>
        <ButtonLink href={whatsappUrl(whatsappMessage)} external variant="whatsapp" size="lg" className="sm:flex-1">
          <WhatsAppIcon size={18} />
          WhatsApp
        </ButtonLink>
      </div>
      <p className="type-body-sm text-muted">We use your details only to respond to this enquiry.</p>
    </form>
  );
}
