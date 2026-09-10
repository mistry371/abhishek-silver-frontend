import { notFound } from "next/navigation";
import { PolicyView } from "@/components/content/PolicyView";
import { getPolicy } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How we collect, use and protect your personal information.",
  path: "/privacy",
});

export default async function PrivacyPolicyPage() {
  const policy = await getPolicy("privacy");
  if (!policy) notFound();
  return <PolicyView policy={policy} />;
}
