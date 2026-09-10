import type { Metadata } from "next";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Your Bag",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <>
      <PageIntro breadcrumbs={[{ label: "Home", href: "/" }, { label: "Shopping Bag" }]} title="Your Bag" />
      <CartPageClient />
    </>
  );
}
