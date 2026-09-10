import type { Cart, CartItemInput, CartQuoteRequest, WishlistItem } from "@/types/commerce";
import type { CreateOrderInput, CreateOrderResponse, Order, VerifyPaymentInput } from "@/types/customer";
import { lineIdFor } from "@/lib/cart";
import { MOCK_LATENCY, runMock, USE_MOCK_API } from "../config";
import { apiRequest } from "../http";

const commerceMock = () => import("@/mocks/handlers/commerce");
const accountMock = () => import("@/mocks/handlers/account");

/* ------------------------------------------------------------------ */
/* Cart                                                                */
/* ------------------------------------------------------------------ */

/** Server-priced cart for a list of items (guest carts and re-validation). */
export async function quoteCart(request: CartQuoteRequest, token?: string | null): Promise<Cart> {
  if (USE_MOCK_API) {
    const m = await commerceMock();
    return runMock(() => m.quoteCart(request), MOCK_LATENCY.fast);
  }
  return apiRequest("/cart/quote", { method: "POST", body: request, token });
}

/** Authenticated server cart. */
export async function getCart(token: string): Promise<Cart> {
  return apiRequest("/cart", { token });
}

interface CartMutation {
  items: CartItemInput[];
  couponCode?: string | null;
  token?: string | null;
}

export async function addToCart({ item, items, couponCode, token }: CartMutation & { item: CartItemInput }): Promise<Cart> {
  if (USE_MOCK_API || !token) {
    return quoteCart({ items: [...items, item], couponCode }, token);
  }
  return apiRequest("/cart/items", { method: "POST", body: { item, couponCode }, token });
}

export async function updateCart({ lineId, quantity, items, couponCode, token }: CartMutation & { lineId: string; quantity: number }): Promise<Cart> {
  if (USE_MOCK_API || !token) {
    const next = items.map((item) => (lineIdFor(item) === lineId ? { ...item, quantity } : item));
    return quoteCart({ items: next, couponCode }, token);
  }
  return apiRequest(`/cart/items/${encodeURIComponent(lineId)}`, { method: "PATCH", body: { quantity, couponCode }, token });
}

export async function removeFromCart({ lineId, items, couponCode, token }: CartMutation & { lineId: string }): Promise<Cart> {
  if (USE_MOCK_API || !token) {
    return quoteCart({ items: items.filter((item) => lineIdFor(item) !== lineId), couponCode }, token);
  }
  return apiRequest(`/cart/items/${encodeURIComponent(lineId)}`, { method: "DELETE", token });
}

/* ------------------------------------------------------------------ */
/* Wishlist (authenticated)                                            */
/* ------------------------------------------------------------------ */

export async function getWishlist(token: string): Promise<WishlistItem[]> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.getWishlist(token));
  }
  return apiRequest("/wishlist", { token });
}

export async function addToWishlist(token: string, productId: string): Promise<WishlistItem[]> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.addToWishlist(token, productId), MOCK_LATENCY.fast);
  }
  return apiRequest("/wishlist", { method: "POST", body: { productId }, token });
}

export async function removeFromWishlist(token: string, productId: string): Promise<WishlistItem[]> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.removeFromWishlist(token, productId), MOCK_LATENCY.fast);
  }
  return apiRequest(`/wishlist/${encodeURIComponent(productId)}`, { method: "DELETE", token });
}

/** Merge a guest (local) wishlist into the account after sign-in. */
export async function mergeWishlist(token: string, items: WishlistItem[]): Promise<WishlistItem[]> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.mergeWishlist(token, items), MOCK_LATENCY.fast);
  }
  return apiRequest("/wishlist/merge", { method: "POST", body: { items }, token });
}

/* ------------------------------------------------------------------ */
/* Orders & payment                                                    */
/* ------------------------------------------------------------------ */

export async function createOrder(input: CreateOrderInput, token?: string | null): Promise<CreateOrderResponse> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.createOrder(input, token), MOCK_LATENCY.slow);
  }
  return apiRequest("/orders", { method: "POST", body: input, token });
}

/** The backend verifies the gateway signature — the client never marks an order paid. */
export async function verifyPayment(input: VerifyPaymentInput, token?: string | null): Promise<Order> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.verifyPayment(input), MOCK_LATENCY.slow);
  }
  return apiRequest(`/orders/${encodeURIComponent(input.orderId)}/payments/verify`, { method: "POST", body: input, token });
}

export async function reportPaymentFailure(orderId: string, token?: string | null): Promise<Order> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.markPaymentFailed(orderId), MOCK_LATENCY.fast);
  }
  return apiRequest(`/orders/${encodeURIComponent(orderId)}/payments/failed`, { method: "POST", token });
}

export async function getOrders(token: string): Promise<Order[]> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.listOrders(token));
  }
  return apiRequest("/orders", { token });
}

export async function getOrder(orderId: string, token?: string | null): Promise<Order> {
  if (USE_MOCK_API) {
    const m = await accountMock();
    return runMock(() => m.getOrder(orderId, token));
  }
  return apiRequest(`/orders/${encodeURIComponent(orderId)}`, { token });
}
