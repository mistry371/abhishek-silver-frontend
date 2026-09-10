import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function authorised(request: NextRequest, secret: string) {
  const provided = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/**
 * Called by the API after admin edits so product, price, offer and content
 * changes appear on the website immediately (pages otherwise refresh on a timer).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ code: "not_found" }, { status: 404 });
  if (!authorised(request, secret)) return NextResponse.json({ code: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { tags?: unknown } | null;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string" && tag.length > 0 && tag.length <= 160).slice(0, 100) : [];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: tags.length });
}
