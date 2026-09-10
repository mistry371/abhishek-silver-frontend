import type { MetalRateTable } from "@/lib/pricing/engine";

/**
 * DEMO METAL RATES — illustrative values for frontend development only.
 * They are NOT market rates. In production, rates are published by the
 * backend rate service (admin-controlled or a live rate API).
 */
export const demoRates: MetalRateTable = {
  gold: { "24k": 10480, "22k": 9610, "18k": 7860, "14k": 6130 },
  silver: { "999": 128, "925": 118 },
  effectiveAt: "2026-09-10T09:00:00+05:30",
};

/** Demo GST rate applied by the mock price engine. Configured on the backend in production. */
export const DEMO_GST_RATE = 3;
