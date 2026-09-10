import { media } from "@/lib/media";
import type { ImageAsset } from "@/types/common";

export interface NavLink {
  label: string;
  href: string;
}

export interface MegaColumn {
  title: string;
  links: NavLink[];
}

export interface MegaMenu {
  columns: MegaColumn[];
  feature: { eyebrow: string; title: string; href: string; cta: string; image: ImageAsset };
  promo?: { eyebrow: string; title: string; description: string; href: string; cta: string };
  viewAll: NavLink;
}

/**
 * `tier` controls the breakpoint at which an item appears inline in the
 * desktop bar. Items that don't fit are listed under "More" — so every
 * destination stays one click away at every width.
 *   1 → from 1024px, 2 → from 1280px, 3 → from 1600px
 */
export interface MainNavItem {
  id: string;
  label: string;
  href: string;
  tier: 1 | 2 | 3;
  mega?: MegaMenu;
}

const jewelleryTypes: NavLink[] = [
  { label: "Rings", href: "/shop/rings" },
  { label: "Earrings", href: "/shop/earrings" },
  { label: "Necklaces", href: "/shop/necklaces" },
  { label: "Chains", href: "/shop/chains" },
  { label: "Bracelets", href: "/shop/bracelets" },
  { label: "Bangles", href: "/shop/bangles" },
  { label: "Pendants", href: "/shop/pendants" },
  { label: "Mangalsutra", href: "/shop/mangalsutra" },
];

const byType = (base: string, types: string[]) =>
  types.map((type) => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    href: `/shop/${base}?category=${type}`,
  }));

export const mainNav: MainNavItem[] = [
  { id: "home", label: "Home", href: "/", tier: 1 },
  {
    id: "shop",
    label: "Shop",
    href: "/shop",
    tier: 1,
    mega: {
      columns: [
        { title: "Jewellery", links: jewelleryTypes },
        {
          title: "Shop by Metal",
          links: [
            { label: "Gold Jewellery", href: "/shop/gold-jewellery" },
            { label: "Silver Jewellery", href: "/shop/silver-jewellery" },
            { label: "22KT Gold", href: "/shop?metal=gold&purity=22k" },
            { label: "18KT Gold", href: "/shop?metal=gold&purity=18k" },
            { label: "925 Sterling Silver", href: "/shop?metal=silver&purity=925" },
            { label: "999 Fine Silver", href: "/shop?metal=silver&purity=999" },
          ],
        },
        {
          title: "Shop For",
          links: [
            { label: "Women", href: "/shop/women" },
            { label: "Men", href: "/shop/men" },
            { label: "Kids", href: "/shop/kids" },
            { label: "Custom Jewellery", href: "/custom-jewellery" },
          ],
        },
        {
          title: "Discover",
          links: [
            { label: "New Arrivals", href: "/shop?new=true&sort=newest" },
            { label: "Best Sellers", href: "/shop?best=true&sort=best_selling" },
            { label: "Bridal Heritage", href: "/collection/bridal-heritage" },
            { label: "Festive Edit", href: "/collection/festive-edit" },
            { label: "Everyday Luxe", href: "/collection/everyday-luxe" },
          ],
        },
      ],
      feature: {
        eyebrow: "Just Arrived",
        title: "New Arrivals",
        href: "/shop?new=true&sort=newest",
        cta: "Discover",
        image: media.editorial.timeless,
      },
      viewAll: { label: "View All Jewellery", href: "/shop" },
    },
  },
  {
    id: "gold",
    label: "Gold",
    href: "/shop/gold-jewellery",
    tier: 1,
    mega: {
      columns: [
        {
          title: "Gold by Type",
          links: byType("gold-jewellery", ["rings", "earrings", "necklaces", "chains", "bracelets", "bangles", "pendants", "mangalsutra"]),
        },
        {
          title: "By Purity",
          links: [
            { label: "22KT Gold", href: "/shop/gold-jewellery?purity=22k" },
            { label: "18KT Gold", href: "/shop/gold-jewellery?purity=18k" },
          ],
        },
        {
          title: "Gold Collections",
          links: [
            { label: "Bridal Heritage", href: "/collection/bridal-heritage" },
            { label: "Festive Edit", href: "/collection/festive-edit" },
            { label: "Everyday Luxe", href: "/collection/everyday-luxe" },
            { label: "Men's Signature", href: "/collection/mens-signature" },
          ],
        },
      ],
      feature: {
        eyebrow: "The Gold Edit",
        title: "Heirlooms in the making",
        href: "/shop/gold-jewellery",
        cta: "Shop Gold",
        image: media.editorial.goldLifestyle,
      },
      promo: {
        eyebrow: "Made for you",
        title: "Custom Jewellery",
        description: "Share your idea — our team will guide you through design, metal and budget.",
        href: "/custom-jewellery",
        cta: "Start a design",
      },
      viewAll: { label: "View All Gold", href: "/shop/gold-jewellery" },
    },
  },
  {
    id: "silver",
    label: "Silver",
    href: "/shop/silver-jewellery",
    tier: 1,
    mega: {
      columns: [
        {
          title: "Silver by Type",
          links: byType("silver-jewellery", ["rings", "earrings", "pendants", "necklaces", "bracelets", "bangles"]),
        },
        {
          title: "By Purity",
          links: [
            { label: "925 Sterling Silver", href: "/shop/silver-jewellery?purity=925" },
            { label: "999 Fine Silver", href: "/shop/silver-jewellery?purity=999" },
          ],
        },
        {
          title: "Silver Collections",
          links: [
            { label: "Sterling Studio", href: "/collection/sterling-studio" },
            { label: "Gifting Edit", href: "/collection/gifting-edit" },
          ],
        },
      ],
      feature: {
        eyebrow: "Sterling Studio",
        title: "Quiet brilliance, every day",
        href: "/shop/silver-jewellery",
        cta: "Shop Silver",
        image: media.editorial.silverLifestyle,
      },
      viewAll: { label: "View All Silver", href: "/shop/silver-jewellery" },
    },
  },
  {
    id: "rings",
    label: "Rings",
    href: "/shop/rings",
    tier: 1,
    mega: {
      columns: [
        {
          title: "Ring Styles",
          links: [
            { label: "Bands", href: "/shop/rings?sub=bands" },
            { label: "Solitaire", href: "/shop/rings?sub=solitaire" },
            { label: "Cocktail", href: "/shop/rings?sub=cocktail" },
            { label: "Couple Bands", href: "/shop/rings?sub=couple-bands" },
            { label: "Stackable", href: "/shop/rings?sub=stackable" },
          ],
        },
        {
          title: "By Metal",
          links: [
            { label: "Gold Rings", href: "/shop/rings?metal=gold" },
            { label: "Silver Rings", href: "/shop/rings?metal=silver" },
          ],
        },
        {
          title: "Shop For",
          links: [
            { label: "Women's Rings", href: "/shop/rings?gender=women" },
            { label: "Men's Rings", href: "/shop/rings?gender=men" },
          ],
        },
      ],
      feature: {
        eyebrow: "Rings",
        title: "Promises, beautifully kept",
        href: "/shop/rings",
        cta: "Shop Rings",
        image: media.editorial.custom,
      },
      viewAll: { label: "View All Rings", href: "/shop/rings" },
    },
  },
  {
    id: "earrings",
    label: "Earrings",
    href: "/shop/earrings",
    tier: 1,
    mega: {
      columns: [
        {
          title: "Earring Styles",
          links: [
            { label: "Studs", href: "/shop/earrings?sub=studs" },
            { label: "Hoops", href: "/shop/earrings?sub=hoops" },
            { label: "Drops", href: "/shop/earrings?sub=drops" },
            { label: "Jhumkas", href: "/shop/earrings?sub=jhumkas" },
          ],
        },
        {
          title: "By Metal",
          links: [
            { label: "Gold Earrings", href: "/shop/earrings?metal=gold" },
            { label: "Silver Earrings", href: "/shop/earrings?metal=silver" },
          ],
        },
      ],
      feature: {
        eyebrow: "Earrings",
        title: "Light-catching details",
        href: "/shop/earrings",
        cta: "Shop Earrings",
        image: media.categories.earrings,
      },
      viewAll: { label: "View All Earrings", href: "/shop/earrings" },
    },
  },
  {
    id: "necklaces",
    label: "Necklaces",
    href: "/shop/necklaces",
    tier: 1,
    mega: {
      columns: [
        {
          title: "Necklace Styles",
          links: [
            { label: "Bridal Sets", href: "/shop/necklaces?sub=bridal-sets" },
            { label: "Statement", href: "/shop/necklaces?sub=statement" },
            { label: "Everyday", href: "/shop/necklaces?sub=everyday" },
          ],
        },
        {
          title: "By Metal",
          links: [
            { label: "Gold Necklaces", href: "/shop/necklaces?metal=gold" },
            { label: "Silver Necklaces", href: "/shop/necklaces?metal=silver" },
          ],
        },
        {
          title: "Collections",
          links: [
            { label: "Bridal Heritage", href: "/collection/bridal-heritage" },
            { label: "Festive Edit", href: "/collection/festive-edit" },
          ],
        },
      ],
      feature: {
        eyebrow: "Necklaces",
        title: "Crafted to be remembered",
        href: "/shop/necklaces",
        cta: "Shop Necklaces",
        image: media.categories.necklaces,
      },
      viewAll: { label: "View All Necklaces", href: "/shop/necklaces" },
    },
  },
  { id: "chains", label: "Chains", href: "/shop/chains", tier: 2 },
  { id: "bracelets", label: "Bracelets", href: "/shop/bracelets", tier: 2 },
  { id: "bangles", label: "Bangles", href: "/shop/bangles", tier: 1 },
  { id: "pendants", label: "Pendants", href: "/shop/pendants", tier: 2 },
  { id: "mangalsutra", label: "Mangalsutra", href: "/shop/mangalsutra", tier: 3 },
  { id: "men", label: "Men", href: "/shop/men", tier: 2 },
  { id: "women", label: "Women", href: "/shop/women", tier: 3 },
  { id: "kids", label: "Kids", href: "/shop/kids", tier: 3 },
  { id: "custom", label: "Custom Jewellery", href: "/custom-jewellery", tier: 1 },
  { id: "about", label: "About", href: "/about", tier: 3 },
  { id: "contact", label: "Contact", href: "/contact", tier: 3 },
];

export const footerNav = {
  shop: [
    { label: "Gold", href: "/shop/gold-jewellery" },
    { label: "Silver", href: "/shop/silver-jewellery" },
    { label: "Rings", href: "/shop/rings" },
    { label: "Earrings", href: "/shop/earrings" },
    { label: "Necklaces", href: "/shop/necklaces" },
    { label: "Chains", href: "/shop/chains" },
    { label: "Bracelets", href: "/shop/bracelets" },
    { label: "Bangles", href: "/shop/bangles" },
    { label: "Pendants", href: "/shop/pendants" },
  ],
  care: [
    { label: "Contact", href: "/contact" },
    { label: "Shipping", href: "/shipping" },
    { label: "Returns", href: "/returns" },
    { label: "FAQ", href: "/faq" },
    { label: "Track Order", href: "/account/orders" },
  ],
  about: [
    { label: "Our Story", href: "/about" },
    { label: "Craftsmanship", href: "/about#craftsmanship" },
    { label: "Certifications", href: "/about#certifications" },
    { label: "Store", href: "/contact#store" },
    { label: "Journal", href: "/blog" },
  ],
  legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Shipping Policy", href: "/shipping" },
    { label: "Refund Policy", href: "/returns" },
  ],
} satisfies Record<string, NavLink[]>;

/** Payment methods shown in the footer. Keep aligned with the configured gateway. */
export const paymentMethods = ["UPI", "Cards", "Net Banking", "Wallets"];

export const accountNav: NavLink[] = [
  { label: "Overview", href: "/account" },
  { label: "Orders", href: "/account/orders" },
  { label: "Wishlist", href: "/account/wishlist" },
  { label: "Addresses", href: "/account/addresses" },
  { label: "Enquiries", href: "/account/enquiries" },
  { label: "Profile", href: "/account/profile" },
  { label: "Settings", href: "/account/settings" },
];
