import { media } from "@/lib/media";
import type { ImageAsset } from "@/types/common";

/**
 * ABOUT PAGE CONTENT (CMS-ready)
 * ------------------------------------------------------------------
 * Brand copy is written to avoid unverified facts. Replace the story,
 * vision and mission with the business's own words, and add real
 * certifications only when they are supplied.
 */

export interface Certification {
  name: string;
  description: string;
  image?: ImageAsset;
}

export const aboutContent = {
  hero: {
    eyebrow: "Our Story",
    title: "Jewellery made with intention",
    description: "A modern jewellery house rooted in Indian craft, built on transparency and personal care.",
    image: media.editorial.heritage,
    wideImage: media.editorial.showcase,
  },
  story: {
    title: "Where our story begins",
    paragraphs: [
      "We started with a simple belief: choosing fine jewellery should feel as considered and joyful as wearing it. Every piece we offer is selected for its design, its finish and the way it feels on the body.",
      "Today we bring that same care online — pairing the warmth of personal service with the clarity of transparent pricing, so you can choose with confidence wherever you are.",
    ],
    image: media.editorial.craftsmanshipDetail,
  },
  vision: "To make fine gold and silver jewellery something every customer can choose with complete confidence.",
  mission: "To offer beautifully crafted pieces, explain every price clearly and guide each customer personally — before, during and after their purchase.",
  expertise: [
    {
      eyebrow: "Gold",
      title: "Gold, understood",
      text: "From rich 22KT pieces for ceremony to 18KT settings that hold stones securely, we help you choose the right purity for the design and the way you'll wear it.",
      image: media.editorial.goldLifestyle,
    },
    {
      eyebrow: "Silver",
      title: "Silver, refined",
      text: "Sterling and fine silver designed with a contemporary eye — easy to wear every day and simple to care for.",
      image: media.editorial.silverLifestyle,
    },
  ],
  craftsmanship: {
    title: "The details make the piece",
    text: "Balanced proportions, secure settings, comfortable finishing and a polish that ages beautifully — we look closely at the things you feel long after the first wear.",
    images: [media.editorial.craftsmanship, media.editorial.showcaseTall],
    pillars: [
      { title: "Design", text: "Proportion and wearability considered from the first sketch." },
      { title: "Finishing", text: "Smooth edges, secure clasps and a considered final polish." },
      { title: "Inspection", text: "Each piece is checked before it is packed for you." },
    ],
  },
  quality: [
    "Metal, purity and weights clearly stated for every piece",
    "Stone details listed wherever stones are used",
    "Full price breakdown: metal value, making charges, stone charges and GST",
    "Final price and stock confirmed before payment",
  ],
  customerCommitment: [
    { title: "Transparent pricing", text: "You see exactly how every price is built." },
    { title: "Personal guidance", text: "Talk to our team on WhatsApp, phone, email or in store." },
    { title: "Made for you", text: "Custom designs and personalisation for meaningful occasions." },
  ],
  /** Add only certifications supplied by the business. Empty by default. */
  certifications: [] as Certification[],
};
