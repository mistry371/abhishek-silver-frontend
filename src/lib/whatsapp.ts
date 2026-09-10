import { absoluteUrl, siteConfig } from "@/config/site";

/**
 * WhatsApp click-to-chat links. The number comes from NEXT_PUBLIC_WHATSAPP_NUMBER;
 * until it is configured, links open WhatsApp's contact picker with the message
 * pre-filled so the action still works during development.
 */
export function whatsappUrl(message: string, number: string = siteConfig.contact.whatsappNumber) {
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
