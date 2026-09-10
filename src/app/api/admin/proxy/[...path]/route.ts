import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_API_BASE, callAdminApi, clearSessionCookies, notConfigured, setSessionCookies } from "@/lib/admin/server";

export const dynamic = "force-dynamic";

const PASS_THROUGH_HEADERS = ["content-type", "content-disposition", "location"];

/**
 * Same-origin proxy for the admin API. Adds the bearer token from the httpOnly
 * session cookie. Mutations must carry `x-admin-request: 1` (a header browsers
 * never send cross-site), on top of SameSite=strict cookies, to block CSRF.
 */
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!ADMIN_API_BASE) return notConfigured();
  const { path } = await context.params;

  if (request.method !== "GET" && request.headers.get("x-admin-request") !== "1") {
    return NextResponse.json({ code: "forbidden", message: "This request was blocked." }, { status: 403 });
  }
  if (!path.length || path.some((segment) => segment === "." || segment === ".." || segment.includes("\\"))) {
    return NextResponse.json({ code: "not_found", message: "Not found." }, { status: 404 });
  }

  const target = `/admin/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const contentType = request.headers.get("content-type");

  try {
    const { upstream, refreshed, signedOut } = await callAdminApi(request, target, {
      method: request.method,
      headers: contentType ? { "Content-Type": contentType } : undefined,
      body: hasBody ? await request.arrayBuffer() : undefined,
    });

    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const name of PASS_THROUGH_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    const response = new NextResponse(upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers });
    if (refreshed) setSessionCookies(response, refreshed);
    if (signedOut) clearSessionCookies(response);
    return response;
  } catch {
    return NextResponse.json({ code: "network_error", message: "The admin service can't be reached right now." }, { status: 502 });
  }
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
