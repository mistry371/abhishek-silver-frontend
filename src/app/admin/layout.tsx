import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: { absolute: "Admin · Abhishek Silver", template: "%s · Admin · Abhishek Silver" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <div data-admin-root className="contents">
      {children}
      <Toaster />
    </div>
  );
}
