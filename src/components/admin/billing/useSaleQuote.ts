"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminApiError, adminRequest } from "@/lib/admin/client";
import { useDebouncedValue } from "@/lib/admin/hooks";
import type { SaleQuote } from "./types";

export interface QuoteRequest {
  locationId: string;
  items: { productId: string; size?: string; quantity: number; discount: number }[];
  /** Client line keys, in the same order as `items` (not sent to the API). */
  keys: string[];
}

type QuoteResult = { key: string; request: QuoteRequest; quote: SaleQuote } | { key: string; request: QuoteRequest; error: AdminApiError };

/**
 * Debounced `POST /sales/quote`. State is only set from the request's promise
 * callbacks; loading is derived from the request key.
 */
export function useSaleQuote(request: QuoteRequest | null, delay = 400) {
  const serialized = request ? JSON.stringify(request) : "";
  const debounced = useDebouncedValue(serialized, delay);
  const [attempt, setAttempt] = useState(0);
  const requestKey = debounced ? `${attempt}::${debounced}` : "";
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [lastGood, setLastGood] = useState<{ request: QuoteRequest; quote: SaleQuote } | null>(null);

  useEffect(() => {
    if (!requestKey) return;
    const parsed = JSON.parse(debounced) as QuoteRequest;
    const controller = new AbortController();
    adminRequest<SaleQuote>("/sales/quote", { method: "POST", body: { locationId: parsed.locationId, items: parsed.items }, signal: controller.signal })
      .then((quote) => {
        setResult({ key: requestKey, request: parsed, quote });
        setLastGood({ request: parsed, quote });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ key: requestKey, request: parsed, error: error instanceof AdminApiError ? error : new AdminApiError(500, {}) });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const settled = serialized !== "" && serialized === debounced && result !== null && result.key === requestKey ? result : null;

  return {
    /** Quote for exactly the current request (null while pending or failed). */
    quote: settled && "quote" in settled ? settled.quote : null,
    /** Error for exactly the current request; `fieldErrors` indexes match the current lines. */
    error: settled && "error" in settled ? settled.error : undefined,
    /** Last successful quote and the request it priced (may be stale). */
    lastGood: request ? lastGood : null,
    loading: serialized !== "" && !settled,
    reload,
  };
}
