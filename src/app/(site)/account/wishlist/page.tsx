import type { Metadata } from "next";
import { WishlistView } from "@/components/wishlist/WishlistView";

export const metadata: Metadata = { title: "Wishlist" };

export default function AccountWishlistPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="type-h2 text-ink">Wishlist</h1>
        <p className="mt-2 type-body text-muted">Saved pieces, synced to your account.</p>
      </div>
      <WishlistView headingLevel={2} />
    </div>
  );
}
