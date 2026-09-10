"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { InlineAlert } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect");
  const safeRedirect = redirectTo && redirectTo.startsWith("/admin") && !redirectTo.startsWith("/admin/login") ? redirectTo : "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message ?? "Sign-in failed. Please try again.");
        return;
      }
      router.replace(safeRedirect);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
      {params.get("expired") && !error && <InlineAlert tone="info">Your session expired. Please sign in again.</InlineAlert>}
      {error && <InlineAlert>{error}</InlineAlert>}
      <TextField label="Email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      <Button type="submit" fullWidth loading={pending} loadingText="Signing in" disabled={!email || !password}>
        Sign in
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-onyx p-12 text-ivory lg:flex">
        <p className="font-serif text-[1.5rem]">Abhishek Silver</p>
        <div>
          <p className="type-eyebrow text-champagne-soft">Business operating system</p>
          <p className="mt-4 max-w-md font-serif text-[2.75rem] leading-tight">Inventory, orders, billing and content — in one place.</p>
        </div>
        <p className="text-[0.75rem] text-ivory/50">Authorised staff only. All activity is recorded.</p>
      </div>
      <div className="flex items-center justify-center bg-ivory px-6 py-16">
        <div className="w-full max-w-sm">
          <p className="type-eyebrow text-champagne-deep">Admin</p>
          <h1 className="mt-3 font-serif text-[2.25rem] leading-tight text-ink">Sign in</h1>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
