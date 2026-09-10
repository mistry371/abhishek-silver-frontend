"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addToCart, apiErrorFor, quoteCart, removeFromCart, updateCart } from "@/stores/cart-service";
import { lineIdFor } from "@/lib/cart";
import { toUserMessage } from "@/lib/api/errors";
import type { Cart, CartItemInput } from "@/types/commerce";
import { getAuthToken } from "./auth";

export interface CartLine extends CartItemInput {
  lineId: string;
}

type CartStatus = "idle" | "loading" | "ready" | "error";

interface CartState {
  /** Minimal persisted cart: ids, sizes, quantities, personalisation. */
  lines: CartLine[];
  couponCode: string | null;
  /** Latest server quote — the only source of prices shown to the customer. */
  cart: Cart | null;
  status: CartStatus;
  busyLineId: string | null;
  error: string | null;

  add: (item: CartItemInput) => Promise<Cart>;
  setQuantity: (lineId: string, quantity: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  removeCoupon: () => Promise<void>;
  refresh: () => Promise<Cart | null>;
  clear: () => void;
}

function linesFrom(cart: Cart): CartLine[] {
  return cart.items.map((item) => ({
    productId: item.productId,
    slug: item.slug,
    size: item.size,
    quantity: item.quantity,
    customization: item.customization,
    lineId: item.lineId,
  }));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      function commit(cart: Cart) {
        const couponInvalid = cart.issues.some((issue) => issue.type === "coupon_invalid");
        set({
          cart,
          lines: linesFrom(cart),
          couponCode: cart.coupon?.code ?? (couponInvalid ? null : get().couponCode),
          status: "ready",
          busyLineId: null,
          error: null,
        });
      }

      function fail(error: unknown): never {
        set({ status: "error", busyLineId: null, error: toUserMessage(error) });
        throw error;
      }

      return {
        lines: [],
        couponCode: null,
        cart: null,
        status: "idle",
        busyLineId: null,
        error: null,

        async add(item) {
          const { lines, couponCode } = get();
          set({ status: "loading", busyLineId: lineIdFor(item), error: null });
          try {
            const cart = await addToCart({ item, items: lines, couponCode, token: getAuthToken() });
            const added = cart.items.find(
              (line) => line.productId === item.productId && (!item.size || line.size === item.size),
            );
            if (added && !added.availability.purchasable) {
              set({ status: "ready", busyLineId: null });
              throw apiErrorFor("out_of_stock", `${added.product.name} is currently out of stock.`);
            }
            commit(cart);
            return cart;
          } catch (error) {
            return fail(error);
          }
        },

        async setQuantity(lineId, quantity) {
          const { lines, couponCode } = get();
          set({ status: "loading", busyLineId: lineId });
          try {
            commit(await updateCart({ lineId, quantity, items: lines, couponCode, token: getAuthToken() }));
          } catch (error) {
            fail(error);
          }
        },

        async remove(lineId) {
          const { lines, couponCode } = get();
          set({ status: "loading", busyLineId: lineId });
          try {
            commit(await removeFromCart({ lineId, items: lines, couponCode, token: getAuthToken() }));
          } catch (error) {
            fail(error);
          }
        },

        async applyCoupon(code) {
          const trimmed = code.trim().toUpperCase();
          if (!trimmed) return { ok: false, message: "Enter a coupon code." };
          set({ status: "loading" });
          try {
            const cart = await quoteCart({ items: get().lines, couponCode: trimmed }, getAuthToken());
            const issue = cart.issues.find((i) => i.type === "coupon_invalid");
            commit(cart);
            if (issue || !cart.coupon) {
              set({ couponCode: null });
              return { ok: false, message: issue?.message ?? "This coupon code isn't valid for your order." };
            }
            return { ok: true, message: `${cart.coupon.code} applied — ${cart.coupon.description}.` };
          } catch (error) {
            set({ status: "error" });
            return { ok: false, message: toUserMessage(error) };
          }
        },

        async removeCoupon() {
          set({ couponCode: null, status: "loading" });
          try {
            commit(await quoteCart({ items: get().lines, couponCode: null }, getAuthToken()));
          } catch (error) {
            fail(error);
          }
        },

        async refresh() {
          const { lines, couponCode } = get();
          if (lines.length === 0) {
            set({ cart: null, status: "ready" });
            return null;
          }
          set({ status: get().cart ? "ready" : "loading" });
          try {
            const cart = await quoteCart({ items: lines, couponCode }, getAuthToken());
            commit(cart);
            return cart;
          } catch (error) {
            set({ status: "error", error: toUserMessage(error) });
            return null;
          }
        },

        clear() {
          set({ lines: [], couponCode: null, cart: null, status: "ready", busyLineId: null, error: null });
        },
      };
    },
    {
      name: "storefront-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines, couponCode: state.couponCode }),
      skipHydration: true,
    },
  ),
);

export function useCartCount() {
  return useCartStore((state) => state.lines.reduce((sum, line) => sum + line.quantity, 0));
}
