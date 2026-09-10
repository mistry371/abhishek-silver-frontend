import { siteConfig } from "@/config/site";
import { media, productPhoto } from "@/lib/media";
import type { Coupon, Offer } from "@/types/commerce";
import type {
  BlogPost,
  FaqItem,
  HomepageContent,
  InstagramPost,
  PolicyPage,
  Testimonial,
  TrustItem,
} from "@/types/content";

/**
 * DEMO CMS CONTENT
 * ------------------------------------------------------------------
 * Editorial copy intentionally avoids factual claims (years in business,
 * awards, certifications, customer counts). Replace through the admin CMS.
 */

export const homepageContent: HomepageContent = {
  hero: [
    {
      id: "hero-1",
      eyebrow: "The Bridal Heritage Edit",
      title: "The art of fine jewellery",
      description: "Designed to become part of your story.",
      image: media.hero.bridal,
      mobileImage: media.hero.bridalMobile,
      primaryCta: { label: "Explore Collection", href: "/collection/bridal-heritage" },
      secondaryCta: { label: "Shop Gold", href: "/shop/gold-jewellery" },
      tone: "light",
      align: "left",
      displayOrder: 1,
      active: true,
    },
    {
      id: "hero-2",
      eyebrow: "Crafted in 22KT gold",
      title: "Heirlooms, reimagined",
      description: "Carved bangles and kadas with a quiet, sculptural presence.",
      image: media.hero.bangles,
      mobileImage: media.hero.banglesMobile,
      primaryCta: { label: "Shop Bangles", href: "/shop/bangles" },
      tone: "light",
      align: "left",
      displayOrder: 2,
      active: true,
    },
    {
      id: "hero-3",
      eyebrow: "Sterling Studio",
      title: "Silver, in its finest light",
      description: "Contemporary sterling silver for everyday brilliance.",
      image: media.hero.silver,
      mobileImage: media.hero.silverMobile,
      primaryCta: { label: "Shop Silver", href: "/shop/silver-jewellery" },
      secondaryCta: { label: "View Collection", href: "/collection/sterling-studio" },
      tone: "light",
      align: "left",
      displayOrder: 3,
      active: true,
    },
    {
      id: "hero-4",
      eyebrow: "Made for you",
      title: "Your design, our craft",
      description: "Personalised jewellery, created for your occasion.",
      image: media.hero.chain,
      mobileImage: media.hero.chainMobile,
      primaryCta: { label: "Create Your Jewellery", href: "/custom-jewellery" },
      tone: "dark",
      align: "left",
      displayOrder: 4,
      active: true,
    },
  ],
  goldEditorial: {
    id: "gold-editorial",
    key: "gold",
    eyebrow: "The Gold Edit",
    title: "Gold Jewellery",
    description:
      "Warm, radiant and made to last generations. Explore 22KT and 18KT gold — from refined everyday pieces to ceremonial statements.",
    image: media.editorial.goldLifestyle,
    cta: { label: "Shop Gold", href: "/shop/gold-jewellery" },
    displayOrder: 1,
    active: true,
  },
  silverEditorial: {
    id: "silver-editorial",
    key: "silver",
    eyebrow: "Sterling Studio",
    title: "Silver Jewellery",
    description:
      "Luminous, modern and effortlessly wearable. Sterling and fine silver designed for the rhythm of everyday life.",
    image: media.editorial.silverLifestyle,
    cta: { label: "Shop Silver", href: "/shop/silver-jewellery" },
    displayOrder: 2,
    active: true,
  },
  campaign: {
    id: "campaign-timeless",
    key: "campaign",
    eyebrow: "Everyday Luxe",
    title: "Timeless Elegance",
    description: "Discover pieces designed to be treasured — refined enough for every day, meaningful enough for a lifetime.",
    image: media.editorial.timeless,
    mobileImage: media.editorial.timeless,
    cta: { label: "Shop Collection", href: "/collection/everyday-luxe" },
    displayOrder: 3,
    active: true,
  },
  festival: {
    id: "festival-campaign",
    key: "festival",
    eyebrow: "The Festive Edit",
    title: "Dressed for celebration",
    description:
      "Jhumkas, carved bangles and statement necklaces chosen for gatherings, rituals and the joy of the season.",
    image: media.editorial.festivalWide,
    mobileImage: media.editorial.festival,
    cta: { label: "Explore the Edit", href: "/collection/festive-edit" },
    displayOrder: 4,
    active: true,
  },
  customJewellery: {
    id: "custom-jewellery",
    key: "custom",
    eyebrow: "Custom Jewellery",
    title: "Personalised designs, created for your occasion",
    description:
      "Share an idea, a sketch or a reference — our team will guide you through design, metal, purity and budget, and keep you informed at every step.",
    image: media.editorial.custom,
    mobileImage: media.editorial.customDetail,
    cta: { label: "Create Your Jewellery", href: "/custom-jewellery" },
    displayOrder: 5,
    active: true,
  },
  brandStory: {
    eyebrow: "Our Story",
    title: "Jewellery made with intention",
    paragraphs: [
      "We believe fine jewellery should be chosen with confidence and worn with joy. Every piece in our collection is selected for its design, its finish and the way it feels to wear.",
      "From the first sketch to the final polish, we care about the details — balanced proportions, secure settings and a finish that ages beautifully. And because trust matters, we show you how every price is built.",
    ],
    image: media.editorial.craftsmanshipDetail,
    secondaryImage: media.editorial.showcaseTall,
    pillars: [
      { title: "Craftsmanship", description: "Considered design and careful finishing in every piece." },
      { title: "Transparency", description: "Metal value, making charges and GST shown clearly." },
      { title: "Personal Service", description: "Guidance on WhatsApp, phone or in our showroom." },
    ],
    cta: { label: "Read Our Story", href: "/about" },
  },
  seoContent: {
    title: "Gold and silver jewellery, chosen with care",
    paragraphs: [
      "Explore gold jewellery in 22KT and 18KT alongside sterling and fine silver — rings, earrings, necklaces, chains, bracelets, bangles, pendants and mangalsutra for women, men and kids.",
      "Every product page lists the metal, purity, gross and net weight, making charges and GST, so you can compare pieces with clarity. Looking for something unique? Our custom jewellery service creates personalised designs for weddings, anniversaries and milestones.",
    ],
  },
};

/** Clearly marked sample testimonials — hidden when NEXT_PUBLIC_SHOW_SAMPLE_CONTENT=false. */
export const testimonials: Testimonial[] = [
  {
    id: "t-1",
    name: "Bridal customer",
    quote:
      "The team helped me put together my wedding jewellery without any pressure. Seeing the full price breakdown made the decision so much easier.",
    rating: 5,
    isSample: true,
    displayOrder: 1,
    active: true,
  },
  {
    id: "t-2",
    name: "Anniversary gift",
    quote: "I ordered an engraved pendant for my wife. The WhatsApp updates kept me informed, and the finish was beautiful.",
    rating: 5,
    isSample: true,
    displayOrder: 2,
    active: true,
  },
  {
    id: "t-3",
    name: "Custom design",
    quote: "I shared a rough sketch of a ring and they turned it into something far better than I imagined.",
    rating: 5,
    isSample: true,
    displayOrder: 3,
    active: true,
  },
  {
    id: "t-4",
    name: "Everyday wear",
    quote: "My silver hoops have become the pair I wear every single day. Light, comfortable and still shining.",
    rating: 5,
    isSample: true,
    displayOrder: 4,
    active: true,
  },
];

export const instagramPosts: InstagramPost[] = media.instagram.map((image, index) => ({
  id: `ig-${index + 1}`,
  image,
  url: siteConfig.social.instagram,
}));

export const trustItems: TrustItem[] = [
  {
    id: "trust-pricing",
    icon: "scale",
    title: "Transparent Pricing",
    description: "Metal value, making charges and GST are shown for every piece.",
    displayOrder: 1,
    active: true,
  },
  {
    id: "trust-payments",
    icon: "shield",
    title: "Secure Payments",
    description: "Checkout is processed through an encrypted payment gateway.",
    displayOrder: 2,
    active: true,
  },
  {
    id: "trust-custom",
    icon: "pen",
    title: "Personalised Designs",
    description: "Create a piece for your occasion with our custom service.",
    displayOrder: 3,
    active: true,
  },
  {
    id: "trust-enquiry",
    icon: "message",
    title: "Easy Enquiry",
    description: "Talk to our team on WhatsApp, phone or email.",
    displayOrder: 4,
    active: true,
  },
  // Add certification / hallmark entries ONLY when supplied by the business, e.g.
  // { id: "trust-hallmark", icon: "award", title: "…", description: "…", displayOrder: 5, active: true },
];

export const faqs: FaqItem[] = [
  {
    id: "faq-price",
    category: "Pricing",
    question: "How is the price of a piece calculated?",
    answer:
      "Jewellery prices are built from the metal rate for the piece's purity multiplied by its net weight, plus making charges, stone charges (where applicable) and any other charges. GST is then applied and any offer is deducted. Every product page shows this breakdown.",
    displayOrder: 1,
    active: true,
  },
  {
    id: "faq-price-change",
    category: "Pricing",
    question: "Why can the price of a piece change?",
    answer:
      "Gold and silver rates move with the market. Prices on the website are updated from our pricing system, and the final price is confirmed when you place your order.",
    displayOrder: 2,
    active: true,
  },
  {
    id: "faq-purity",
    category: "Pricing",
    question: "What is the difference between 22KT and 18KT gold?",
    answer:
      "22KT gold contains 91.6% pure gold and has a rich, warm colour. 18KT gold contains 75% pure gold; the added alloy makes it harder, which is why it is often used for diamond and gemstone settings.",
    displayOrder: 3,
    active: true,
  },
  {
    id: "faq-payment",
    category: "Orders & Payments",
    question: "Which payment methods can I use?",
    answer: "Payments are processed through our secure payment gateway. The methods available to you are shown at checkout.",
    displayOrder: 4,
    active: true,
  },
  {
    id: "faq-track",
    category: "Orders & Payments",
    question: "How do I track my order?",
    answer:
      "Sign in and open My Account → Orders to see the live status of every order, from confirmation through to delivery.",
    displayOrder: 5,
    active: true,
  },
  {
    id: "faq-shipping",
    category: "Shipping & Returns",
    question: "How long will delivery take?",
    answer: "Delivery timelines depend on the piece and your location. They are confirmed with your order — please see our Shipping Policy for details.",
    displayOrder: 6,
    active: true,
  },
  {
    id: "faq-returns",
    category: "Shipping & Returns",
    question: "Can I return or exchange a piece?",
    answer: "Please refer to our Returns & Refund Policy for eligibility and the process. Our team is happy to help with any questions.",
    displayOrder: 7,
    active: true,
  },
  {
    id: "faq-custom",
    category: "Custom Jewellery",
    question: "Can you make a custom piece for me?",
    answer:
      "Yes. Share your idea through the Custom Jewellery page or on WhatsApp — include reference images, preferred metal and budget. Our team will contact you to discuss design, feasibility and timelines.",
    displayOrder: 8,
    active: true,
  },
  {
    id: "faq-size",
    category: "Custom Jewellery",
    question: "How do I find my ring or bangle size?",
    answer:
      "Choose from the sizes listed on the product page. If you are unsure, contact us on WhatsApp and we will guide you through measuring at home.",
    displayOrder: 9,
    active: true,
  },
  {
    id: "faq-care",
    category: "Care",
    question: "How should I care for my jewellery?",
    answer:
      "Store pieces separately in a soft pouch, keep them away from perfume and chemicals, and wipe gently with a soft cloth after wearing. Silver can be brightened with a silver polishing cloth.",
    displayOrder: 10,
    active: true,
  },
];

const author = { name: "Editorial Team" };

export const blogPosts: BlogPost[] = [
  {
    id: "b-1",
    slug: "how-jewellery-prices-are-calculated",
    title: "How jewellery prices are calculated",
    excerpt: "Metal rate, purity, weight, making charges and GST — a clear guide to reading a jewellery price.",
    category: "Gold Education",
    coverImage: media.editorial.craftsmanship,
    author,
    tags: ["pricing", "gold", "buying guide"],
    readingMinutes: 5,
    publishedAt: "2026-08-20T10:00:00+05:30",
    updatedAt: "2026-08-20T10:00:00+05:30",
    content: [
      { type: "paragraph", text: "Unlike most products, the price of gold and silver jewellery is built from several transparent components. Understanding them helps you compare pieces with confidence." },
      { type: "heading", level: 2, text: "1. Metal value" },
      { type: "paragraph", text: "The metal value is the rate for the piece's purity multiplied by its net weight — the weight of the metal alone, excluding stones or beads." },
      { type: "heading", level: 2, text: "2. Making charges" },
      { type: "paragraph", text: "Making charges reflect the design and craftsmanship involved. They may be expressed per gram, as a percentage of the metal value, or as a fixed amount." },
      { type: "heading", level: 2, text: "3. Stone and other charges" },
      { type: "paragraph", text: "Diamonds, gemstones, pearls or beads are priced separately. Other charges can include specific finishing or stringing work." },
      { type: "heading", level: 2, text: "4. GST and offers" },
      { type: "paragraph", text: "GST is applied to the taxable value. Where an offer applies, the discount is shown clearly in the breakdown." },
      { type: "quote", text: "A clear price is the foundation of a confident purchase." },
      { type: "list", items: ["Check the purity (e.g. 22KT, 18KT, 925).", "Compare net weight, not only gross weight.", "Look at making charges alongside the design.", "Confirm the final price at checkout."] },
    ],
  },
  {
    id: "b-2",
    slug: "22kt-vs-18kt-gold",
    title: "22KT vs 18KT gold: choosing the right purity",
    excerpt: "Colour, durability and design — how purity shapes the jewellery you choose.",
    category: "Buying Guides",
    coverImage: media.editorial.goldDetail,
    author,
    tags: ["gold", "purity"],
    readingMinutes: 4,
    publishedAt: "2026-07-28T10:00:00+05:30",
    updatedAt: "2026-07-28T10:00:00+05:30",
    content: [
      { type: "paragraph", text: "Purity describes how much pure gold an alloy contains. It affects colour, hardness and the kind of designs a piece can support." },
      { type: "heading", level: 2, text: "22KT gold" },
      { type: "paragraph", text: "22KT gold is 91.6% pure gold. Its deep yellow tone is traditional in Indian jewellery, and it is ideal for bangles, chains and ceremonial pieces." },
      { type: "heading", level: 2, text: "18KT gold" },
      { type: "paragraph", text: "18KT gold is 75% pure gold. The higher proportion of alloy makes it harder, so it holds diamonds and gemstones securely and suits fine, contemporary designs." },
      { type: "list", items: ["Choose 22KT for rich colour and traditional designs.", "Choose 18KT for stone-set and delicate pieces.", "Both are priced by the rate for their specific purity."] },
    ],
  },
  {
    id: "b-3",
    slug: "caring-for-sterling-silver",
    title: "Caring for sterling silver",
    excerpt: "Simple habits that keep your silver bright for years.",
    category: "Silver Education",
    coverImage: media.editorial.silverDetail,
    author,
    tags: ["silver", "care"],
    readingMinutes: 3,
    publishedAt: "2026-07-10T10:00:00+05:30",
    updatedAt: "2026-07-10T10:00:00+05:30",
    content: [
      { type: "paragraph", text: "925 sterling silver is 92.5% pure silver. Like all silver, it can tarnish naturally when exposed to air and moisture — the good news is that it is easy to care for." },
      { type: "heading", level: 2, text: "Everyday care" },
      { type: "list", items: ["Put jewellery on after perfume and lotions.", "Remove before swimming or cleaning.", "Wipe with a soft cloth after wearing.", "Store in a sealed pouch to slow tarnishing."] },
      { type: "heading", level: 2, text: "Restoring shine" },
      { type: "paragraph", text: "A silver polishing cloth restores brightness gently. For pieces with stones or oxidised detailing, avoid dips and harsh cleaners." },
    ],
  },
  {
    id: "b-4",
    slug: "styling-layered-necklaces",
    title: "The art of layering necklaces",
    excerpt: "Proportion, length and texture — how to build a layered look that feels effortless.",
    category: "Styling",
    coverImage: media.editorial.timelessWide,
    author,
    tags: ["styling", "necklaces"],
    readingMinutes: 4,
    publishedAt: "2026-06-18T10:00:00+05:30",
    updatedAt: "2026-06-18T10:00:00+05:30",
    content: [
      { type: "paragraph", text: "Layering lets you tell a personal story through jewellery. The secret is contrast with a common thread." },
      { type: "heading", level: 2, text: "Vary the lengths" },
      { type: "paragraph", text: "Leave around 5cm between each layer so every piece has room to be seen." },
      { type: "heading", level: 2, text: "Mix textures, keep one tone" },
      { type: "paragraph", text: "Pair a fine box chain with a rope chain or a pendant in the same metal for a cohesive look." },
      { type: "image", image: productPhoto("photo-1625792508553-5e66a81659fa", "Layered gold necklace on white fabric"), caption: "A pre-layered necklace keeps strands from tangling." },
    ],
  },
  {
    id: "b-5",
    slug: "planning-your-bridal-jewellery",
    title: "Planning your bridal jewellery",
    excerpt: "A calm, step-by-step approach to choosing jewellery for every wedding function.",
    category: "Festival Collections",
    coverImage: media.editorial.bridalPortrait,
    author,
    tags: ["bridal", "wedding"],
    readingMinutes: 6,
    publishedAt: "2026-05-30T10:00:00+05:30",
    updatedAt: "2026-05-30T10:00:00+05:30",
    content: [
      { type: "paragraph", text: "Bridal jewellery is often the most meaningful purchase you will make. A little planning makes the experience joyful rather than overwhelming." },
      { type: "heading", level: 2, text: "Start with your outfits" },
      { type: "paragraph", text: "Neckline, colour and embroidery guide which necklace shapes and metals will work best for each function." },
      { type: "heading", level: 2, text: "Balance heirloom and everyday" },
      { type: "paragraph", text: "Alongside statement sets, choose a few pieces — like a mangalsutra, fine chain or bangles — that you will wear long after the celebrations." },
      { type: "heading", level: 2, text: "Personalise" },
      { type: "paragraph", text: "Custom jewellery allows you to add initials, dates or family motifs. Allow time for design discussion and confirmation." },
    ],
  },
];

function placeholderPolicy(slug: PolicyPage["slug"], title: string, headings: string[]): PolicyPage {
  return {
    slug,
    title,
    intro: `This page will contain the business's official ${title.toLowerCase()}. The sections below outline the structure; final wording must be supplied and reviewed by the business.`,
    sections: headings.map((heading) => ({
      heading,
      body: ["Content for this section will be provided by the business."],
    })),
    isPlaceholder: true,
  };
}

export const policies: Record<PolicyPage["slug"], PolicyPage> = {
  shipping: placeholderPolicy("shipping", "Shipping Policy", [
    "Delivery locations",
    "Dispatch and delivery timelines",
    "Shipping charges",
    "Packaging and insurance",
    "Order tracking",
  ]),
  returns: placeholderPolicy("returns", "Returns & Refund Policy", [
    "Eligibility",
    "Custom and personalised pieces",
    "How to request a return",
    "Inspection",
    "Refund method and timelines",
  ]),
  privacy: placeholderPolicy("privacy", "Privacy Policy", [
    "Information we collect",
    "How we use your information",
    "Payments",
    "Cookies and analytics",
    "Your rights",
    "Contact",
  ]),
  terms: placeholderPolicy("terms", "Terms & Conditions", [
    "Use of the website",
    "Product information and pricing",
    "Orders and acceptance",
    "Payments",
    "Intellectual property",
    "Governing law",
  ]),
};

export const offers: Offer[] = [
  {
    id: "offer-festive",
    type: "festival",
    eyebrow: "The Festive Edit",
    title: "Pieces for the season",
    description: "Explore festive jewellery selected for celebrations.",
    cta: { label: "Explore", href: "/collection/festive-edit" },
    active: true,
    displayOrder: 1,
  },
];

/** DEMO COUPONS — validated only by the mock backend. */
export const demoCoupons: Coupon[] = [
  {
    code: "WELCOME5",
    type: "percentage",
    value: 5,
    maxDiscount: 5000,
    description: "5% off your order (up to ₹5,000)",
  },
  {
    code: "FESTIVE2000",
    type: "fixed",
    value: 2000,
    minOrderValue: 50000,
    description: "₹2,000 off orders above ₹50,000",
  },
  {
    code: "SILVER10",
    type: "percentage",
    value: 10,
    description: "10% off silver jewellery",
    appliesTo: { categorySlugs: ["silver-jewellery"] },
  },
];
