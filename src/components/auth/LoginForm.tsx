"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { PasswordField } from "@/components/forms/PasswordField";
import { Button } from "@/components/ui/Button";
import { FormMessage, TextField } from "@/components/ui/Field";
import { toast } from "@/components/ui/Toast";
import { USE_MOCK_API } from "@/lib/api/config";
import { isApiError, toUserMessage } from "@/lib/api/errors";
import { login, requestOtp, verifyOtp } from "@/lib/api/services/customer";
import { cn } from "@/lib/utils";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";
import { useAuthStore, useCustomer } from "@/stores/auth";
import { usePersistHydrated } from "@/stores/hydration";
import { completeSignIn } from "@/stores/session";
import type { AuthSession } from "@/types/customer";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const hydrated = usePersistHydrated(useAuthStore);
  const customer = useCustomer();
  const [mode, setMode] = useState<"password" | "otp">("password");

  useEffect(() => {
    if (hydrated && customer) router.replace(redirectTo);
  }, [hydrated, customer, redirectTo, router]);

  async function onSignedIn(session: AuthSession) {
    await completeSignIn(session);
    toast({ title: `Welcome back${session.customer.firstName ? `, ${session.customer.firstName}` : ""}`, tone: "success" });
    router.replace(redirectTo);
  }

  return (
    <div>
      <div className="grid grid-cols-2 border border-line p-1" role="group" aria-label="Sign-in method">
        {(
          [
            ["password", "Email & Password"],
            ["otp", "Mobile OTP"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={cn("h-10 type-caption tracking-[0.14em] transition-colors", mode === value ? "bg-ink text-ivory" : "text-ink-soft hover:text-ink")}
          >
            {label}
          </button>
        ))}
      </div>

      {USE_MOCK_API && (
        <FormMessage tone="info" className="mt-6">
          <span>
            Demo account: <strong className="font-medium">demo@example.com</strong> / <strong className="font-medium">Demo@1234</strong> · OTP login with mobile 9000000000
          </span>
        </FormMessage>
      )}

      {mode === "password" ? <PasswordLogin onSignedIn={onSignedIn} /> : <OtpLogin onSignedIn={onSignedIn} />}

      <p className="mt-10 border-t border-line pt-8 type-body text-muted">
        New here?{" "}
        <Link href={`/register?redirect=${encodeURIComponent(redirectTo)}`} className="text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function PasswordLogin({ onSignedIn }: { onSignedIn: (session: AuthSession) => Promise<void> }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!isValidEmail(identifier) && !isValidIndianMobile(identifier)) next.identifier = "Enter your email address or 10-digit mobile number.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSubmitting(true);
    setServerError("");
    try {
      await onSignedIn(await login({ identifier: identifier.trim(), password }));
    } catch (error) {
      setServerError(toUserMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
      {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
      <TextField
        label="Email or mobile number"
        required
        autoComplete="username"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        error={errors.identifier}
      />
      <PasswordField label="Password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="type-body-sm text-muted underline underline-offset-4 hover:text-ink">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" fullWidth size="lg" loading={submitting} loadingText="Signing in">
        Sign In
      </Button>
    </form>
  );
}

function OtpLogin({ onSignedIn }: { onSignedIn: (session: AuthSession) => Promise<void> }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [errors, setErrors] = useState<{ phone?: string; otp?: string }>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [demoCode, setDemoCode] = useState<string | undefined>();

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (!isValidIndianMobile(phone)) {
      setErrors({ phone: "Enter a valid 10-digit mobile number." });
      return;
    }
    setErrors({});
    setServerError("");
    setBusy(true);
    try {
      const result = await requestOtp({ phone });
      setStage("code");
      setResendIn(30);
      setDemoCode(result.demoCode);
    } catch (error) {
      if (isApiError(error) && error.fieldErrors?.phone) setErrors({ phone: error.fieldErrors.phone });
      else setServerError(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setErrors({ otp: "Enter the 6-digit code." });
      return;
    }
    setErrors({});
    setServerError("");
    setBusy(true);
    try {
      await onSignedIn(await verifyOtp({ phone, otp }));
    } catch (error) {
      if (isApiError(error) && error.fieldErrors?.otp) setErrors({ otp: error.fieldErrors.otp });
      else setServerError(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (stage === "phone") {
    return (
      <form onSubmit={sendCode} noValidate className="mt-8 space-y-5">
        {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
        <TextField
          label="Mobile number"
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={errors.phone}
          hint="We'll send a one-time code to this number."
        />
        <Button type="submit" fullWidth size="lg" loading={busy} loadingText="Sending code">
          Send Code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} noValidate className="mt-8 space-y-5">
      {serverError && <FormMessage tone="error">{serverError}</FormMessage>}
      <p className="type-body-sm text-muted">
        Enter the code sent to <span className="text-ink">{phone}</span>.{" "}
        <button type="button" onClick={() => setStage("phone")} className="text-ink underline underline-offset-4">
          Change number
        </button>
      </p>
      {demoCode && (
        <FormMessage tone="info">
          <span>
            Demo mode — your code is <strong className="font-medium tracking-[0.2em]">{demoCode}</strong>
          </span>
        </FormMessage>
      )}
      <TextField
        label="One-time code"
        required
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        error={errors.otp}
        className="text-center text-lg tracking-[0.5em]"
      />
      <Button type="submit" fullWidth size="lg" loading={busy} loadingText="Verifying">
        Verify & Sign In
      </Button>
      <p className="text-center type-body-sm text-muted">
        {resendIn > 0 ? (
          `Resend code in ${resendIn}s`
        ) : (
          <button type="button" onClick={() => sendCode()} className="text-ink underline underline-offset-4">
            Resend code
          </button>
        )}
      </p>
    </form>
  );
}
