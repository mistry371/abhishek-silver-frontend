import { notFound } from "next/navigation";
import { PolicyView } from "@/components/content/PolicyView";
import { getPolicy } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms & Conditions",
  description: "The terms that apply when you use this website and place an order.",
  path: "/terms",
});

export default async function TermsPage() {
  const policy = await getPolicy("terms");
  if (!policy) notFound();
  return <PolicyView policy={policy} />;
}
