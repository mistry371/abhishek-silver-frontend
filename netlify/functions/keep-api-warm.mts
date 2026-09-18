/**
 * Keeps the API awake. Render's free plan puts the API to sleep after 15
 * minutes without traffic, and the first request afterwards waits 20–60 s
 * while it boots — that stalls shop and collection pages, cart and sign-in,
 * and stops cached pages from refreshing. A ping every 10 minutes prevents
 * the sleep. The health check also runs a trivial database query, so the
 * database connection stays warm too.
 */
const API_BASE = process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function keepApiWarm() {
  if (!API_BASE) {
    console.warn("keep-api-warm: API base URL is not configured");
    return new Response("not configured");
  }
  const url = new URL("/health", API_BASE).toString();
  const started = Date.now();
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(25_000) });
    console.log(`keep-api-warm: ${response.status} in ${Date.now() - started} ms`);
  } catch (error) {
    console.warn(`keep-api-warm: no response after ${Date.now() - started} ms`, error);
  }
  return new Response("ok");
}

export const config = { schedule: "*/10 * * * *" };
