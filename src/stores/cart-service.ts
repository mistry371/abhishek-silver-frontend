/** Narrow re-exports so the cart store stays decoupled from the full API surface. */
export { addToCart, quoteCart, removeFromCart, updateCart } from "@/lib/api/services/commerce";
export { apiError as apiErrorFor } from "@/lib/api/errors";
