import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_API_BASE, ACCESS_COOKIE, callAdminApi, clearSessionCookies, notConfigured, setSessionCookies } from "@/lib/admin/server";

export const dynamic = "force-dynamic";

/** Sign in: exchanges credentials for tokens and stores them in httpOnly cookies. */
export async function POST(request: NextRequest) {
  if (!ADMIN_API_BASE) return notConfigured();
  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;

  let upstream: Response;
  try {
    upstream = await fetch(`${ADMIN_API_BASE}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: body?.email, password: body?.password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ code: "network_error", message: "The admin service can't be reached right now." }, { status: 502 });
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) return NextResponse.json(data, { status: upstream.status });

  const response = NextResponse.json({ admin: data.admin });
  setSessionCookies(response, data);
  return response;
}

/** Current admin profile, permissions and the permission catalogue. */
export async function GET(request: NextRequest) {
  if (!ADMIN_API_BASE) return notConfigured();
  try {
    const { upstream, refreshed, signedOut } = await callAdminApi(request, "/admin/auth/me", { method: "GET" });
    const response = new NextResponse(upstream.body, { status: upstream.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
    if (refreshed) setSessionCookies(response, refreshed);
    if (signedOut) clearSessionCookies(response);
    return response;
  } catch {
    return NextResponse.json({ code: "network_error", message: "The admin service can't be reached right now." }, { status: 502 });
  }
}

/** Sign out: revokes the session upstream (best effort) and clears the cookies. */
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  if (ADMIN_API_BASE && token) {
    await fetch(`${ADMIN_API_BASE}/admin/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => undefined);
  }
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookies(response);
  return response;
}
