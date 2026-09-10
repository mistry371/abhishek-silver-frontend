import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/PageIntro";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false, follow: true },
};

export default function WishlistPage() {
  return (
    <>
      <PageIntro
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Wishlist" }]}
        title="Your Wishlist"
        description="Pieces you've saved. Prices and availability update automatically."
      />
      <div className="container-luxe pb-24">
        <WishlistView />
      </div>
    </>
  );
}
