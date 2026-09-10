import { sleep } from "@/lib/utils";

/** Backend base URL. When empty the storefront runs entirely on mock services. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

export const USE_MOCK_API = API_BASE_URL === "";

export const MOCK_LATENCY = {
  fast: 160,
  normal: 380,
  slow: 900,
} as const;

/**
 * Runs a mock handler with realistic latency in the browser (so loading
 * states are exercised) and returns a deep copy so callers can't mutate
 * mock data. Server-side renders skip the artificial delay.
 */
export async function runMock<T>(handler: () => T | Promise<T>, latency: number = MOCK_LATENCY.normal): Promise<T> {
  if (typeof window !== "undefined" && latency > 0) {
    await sleep(latency);
  }
  const result = await handler();
  return result === undefined ? result : (structuredClone(result) as T);
}
