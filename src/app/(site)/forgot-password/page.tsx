import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { media } from "@/lib/media";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account help"
      title="Reset your password"
      description="Enter the email linked to your account and we'll send you a secure reset link."
      image={media.editorial.craftsmanshipDetail}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
