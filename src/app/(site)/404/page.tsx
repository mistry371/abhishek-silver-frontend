import type { Metadata } from "next";
import { NotFoundContent } from "@/components/layout/NotFoundContent";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: { index: false, follow: true },
};

/** Explicit /404 route (unknown URLs are handled by app/not-found.tsx). */
export default function NotFoundRoute() {
  return <NotFoundContent />;
}
