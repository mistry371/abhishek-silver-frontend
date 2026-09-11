import type { Metadata } from "next";
import { AuthShell, safeRedirect } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In",
  robots: { index: false, follow: true },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { redirect, expired } = await searchParams;
  return (
    <AuthShell eyebrow="Welcome back" title="Sign in" description="Track orders, manage your wishlist and check out faster.">
      <LoginForm redirectTo={safeRedirect(redirect)} notice={expired ? "Your session expired. Please sign in again." : undefined} />
    </AuthShell>
  );
}
