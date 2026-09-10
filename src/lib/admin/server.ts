import type { NextRequest, NextResponse } from "next/server";

/**
 * ADMIN SESSION (server side)
 * ------------------------------------------------------------------
 * Admin tokens never reach browser JavaScript. The Next.js server keeps them
 * in httpOnly, SameSite=strict cookies and forwards admin API calls with the
 * bearer token, refreshing it when it expires.
 */

/** Base URL the Next.js server uses to reach the API (can be a private/internal address). */
export const ADMIN_API_BASE = (process.env.API_INTERNAL_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

export const ACCESS_COOKIE = "as_admin_access";
export const REFRESH_COOKIE = "as_admin_refresh";

const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

export interface AdminTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge };
}

export function setSessionCookies(response: NextResponse, tokens: AdminTokens) {
  const accessMaxAge = Math.max(60, Math.floor((Date.parse(tokens.expiresAt) - Date.now()) / 1000));
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOptions(accessMaxAge));
  if (tokens.refreshToken) response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(REFRESH_MAX_AGE));
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", cookieOptions(0));
  response.cookies.set(REFRESH_COOKIE, "", cookieOptions(0));
}

export function notConfigured() {
  return Response.json(
    { code: "server_error", message: "The admin API isn't configured. Set NEXT_PUBLIC_API_BASE_URL (or API_INTERNAL_BASE_URL)." },
    { status: 503 },
  );
}

async function refreshTokens(refreshToken: string): Promise<AdminTokens | null> {
  try {
    const response = await fetch(`${ADMIN_API_BASE}/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as AdminTokens;
    return data.accessToken ? data : null;
  } catch {
    return null;
  }
}

/**
 * Calls the admin API with the session's access token. On an expired or
 * missing access token it refreshes once and retries.
 */
export async function callAdminApi(
  request: NextRequest,
  path: string,
  init: { method: string; headers?: HeadersInit; body?: ArrayBuffer },
): Promise<{ upstream: Response; refreshed: AdminTokens | null; signedOut: boolean }> {
  const access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!access && !refresh) {
    return { upstream: Response.json({ code: "unauthorized", message: "Please sign in to continue." }, { status: 401 }), refreshed: null, signedOut: true };
  }

  const send = (token: string | undefined) =>
    fetch(`${ADMIN_API_BASE}${path}`, {
      method: init.method,
      headers: { Accept: "application/json", ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: init.body,
      cache: "no-store",
      redirect: "manual",
    });

  let refreshed: AdminTokens | null = null;
  let token = access;
  if (!token && refresh) {
    refreshed = await refreshTokens(refresh);
    token = refreshed?.accessToken;
  }

  let upstream = await send(token);
  if (upstream.status === 401 && refresh && !refreshed) {
    refreshed = await refreshTokens(refresh);
    if (refreshed) upstream = await send(refreshed.accessToken);
  }
  return { upstream, refreshed, signedOut: upstream.status === 401 };
}
