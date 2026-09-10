"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { PasswordField } from "@/components/forms/PasswordField";
import { Button } from "@/components/ui/Button";
import { CheckboxField, FormMessage, TextField } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { isApiError, toUserMessage } from "@/lib/api/errors";
import { register } from "@/lib/api/services/customer";
import { isValidEmail, isValidIndianMobile, passwordIssues } from "@/lib/validation";
import { useAuthStore, useCustomer } from "@/stores/auth";
import { usePersistHydrated } from "@/stores/hydration";
import { completeSignIn } from "@/stores/session";

type Field = "firstName" | "lastName" | "email" | "phone" | "password" | "confirm" | "terms";

export function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const hydrated = usePersistHydrated(useAuthStore);
  const customer = useCustomer();
  const [values, setValues] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", confirm: "" });
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hydrated && customer && !submitting) router.replace(redirectTo);
  }, [hydrated, customer, redirectTo, router, submitting]);

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [key]: event.target.value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function validate() {
    const next: Partial<Record<Field, string>> = {};
    if (!values.firstName.trim()) next.firstName = "Enter your first name.";
    if (!values.lastName.trim()) next.lastName = "Enter your last name.";
    if (!isValidEmail(values.email)) next.email = "Enter a valid email address.";
    if (!isValidIndianMobile(values.phone)) next.phone = "Enter a valid 10-digit mobile number.";
    const issues = passwordIssues(values.password);
    if (issues.length) next.password = `Your password needs ${issues.join(", ")}.`;
    if (values.confirm !== values.password) next.confirm = "Passwords don't match.";
    if (!terms) next.terms = "Please accept the Terms & Conditions to continue.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    try {
      const session = await register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
        marketingOptIn,
      });
      await completeSignIn(session);
      toast({ title: `Welcome, ${session.customer.firstName}`, description: "Your account has been created.", tone: "success" });
      router.replace(redirectTo);
    } catch (error) {
      if (isApiError(error) && error.fieldErrors) setErrors(error.fieldErrors as Partial<Record<Field, string>>);
      else setServerError(toUserMessage(error));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="First name" required autoComplete="given-name" value={values.firstName} onChange={set("firstName")} error={errors.firstName} />
        <TextField label="Last name" required autoComplete="family-name" value={values.lastName} onChange={set("lastName")} error={errors.lastName} />
      </div>
      <TextField label="Email" type="email" required autoComplete="email" value={values.email} onChange={set("email")} error={errors.email} />
      <TextField label="Mobile number" type="tel" inputMode="tel" required autoComplete="tel" value={values.phone} onChange={set("phone")} error={errors.phone} />
      <PasswordField
        label="Password"
        required
        autoComplete="new-password"
        value={values.password}
        onChange={set("password")}
        error={errors.password}
        hint="At least 8 characters, including a letter and a number."
      />
      <PasswordField label="Confirm password" required autoComplete="new-password" value={values.confirm} onChange={set("confirm")} error={errors.confirm} />
      <CheckboxField label="Send me new collections, festive edits and offers by email" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
      <CheckboxField
        label={
          <>
            I agree to the{" "}
            <Link href="/terms" className="text-ink underline underline-offset-2">
              Terms &amp; Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-ink underline underline-offset-2">
              Privacy Policy
            </Link>
          </>
        }
        checked={terms}
        onChange={(e) => {
          setTerms(e.target.checked);
          if (errors.terms) setErrors((current) => ({ ...current, terms: undefined }));
        }}
        error={errors.terms}
      />
      <Button type="submit" fullWidth size="lg" loading={submitting} loadingText="Creating account">
        Create Account
      </Button>
      <p className="border-t border-line pt-8 type-body text-muted">
        Already have an account?{" "}
        <Link href={`/login?redirect=${encodeURIComponent(redirectTo)}`} className="text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
