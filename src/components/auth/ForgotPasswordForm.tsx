"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { SuccessIcon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { toUserMessage } from "@/lib/api/errors";
import { requestPasswordReset } from "@/lib/api/services/customer";
import { isValidEmail } from "@/lib/validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [serverError, setServerError] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter the email address linked to your account.");
      return;
    }
    setError("");
    setServerError("");
    setStatus("submitting");
    try {
      await requestPasswordReset(email.trim());
      setStatus("sent");
    } catch (err) {
      setServerError(toUserMessage(err));
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div role="status" className="border border-line bg-porcelain p-8 text-center">
        <SuccessIcon size={36} className="mx-auto text-champagne-deep" />
        <p className="mt-4 type-h3 text-ink">Check your inbox</p>
        <p className="mt-3 type-body text-muted">
          If an account exists for <span className="text-ink">{email}</span>, you&apos;ll receive a link to reset your password shortly.
        </p>
        <Link href="/login" className="mt-8 inline-block type-button link-underline-static">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
      <TextField label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
      <Button type="submit" fullWidth size="lg" loading={status === "submitting"} loadingText="Sending link">
        Send Reset Link
      </Button>
      <p className="pt-4 type-body text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
