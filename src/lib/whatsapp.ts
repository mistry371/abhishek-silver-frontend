import { absoluteUrl } from "@/config/site";
import { getSiteContact } from "@/lib/site-contact";

/**
 * WhatsApp click-to-chat links. The number is managed in Admin → Content → Contact
 * (falling back to NEXT_PUBLIC_WHATSAPP_NUMBER / site config). Without a number,
 * links open WhatsApp's contact picker with the message pre-filled.
 */
export function whatsappUrl(message: string, number: string = getSiteContact().whatsappNumber) {
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export const whatsappMessages = {
  general: () => `Hello, I would like to know more about your jewellery collection.`,
  product: (product: { name: string; sku: string; slug: string }, size?: string) =>
    `Hello, I am interested in ${product.name}, SKU ${product.sku}${size ? `, size ${size}` : ""}. Please share more details.\n${absoluteUrl(`/product/${product.slug}`)}`,
  custom: () => `Hello, I would like to discuss a custom jewellery design.`,
  store: () => `Hello, I would like to visit your showroom. Could you share the best time to visit?`,
  checkout: () => `Hello, I need some help completing my order.`,
  order: (orderNumber: string) => `Hello, I have a question about my order ${orderNumber}.`,
};
