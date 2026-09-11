import { redirect } from "next/navigation";

/** Staff and customers share one sign-in page; this keeps old /admin/login links working. */
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { redirect: target, expired } = await searchParams;
  const next = typeof target === "string" && target.startsWith("/admin") && !target.startsWith("/admin/login") ? target : "/admin";
  const params = new URLSearchParams({ redirect: next });
  if (expired) params.set("expired", "1");
  redirect(`/login?${params}`);
}
