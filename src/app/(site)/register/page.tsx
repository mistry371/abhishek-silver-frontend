import type { Metadata } from "next";
import { AuthShell, safeRedirect } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { media } from "@/lib/media";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false, follow: true },
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { redirect } = await searchParams;
  return (
    <AuthShell
      eyebrow="Join us"
      title="Create an account"
      description="Save pieces to your wishlist, track orders and view your enquiries in one place."
      image={media.editorial.celebration}
      quote="Every piece tells a story. Begin yours."
    >
      <RegisterForm redirectTo={safeRedirect(redirect)} />
    </AuthShell>
  );
}
