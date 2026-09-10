import { notFound } from "next/navigation";
import { PolicyView } from "@/components/content/PolicyView";
import { getPolicy } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Returns & Refund Policy",
  description: "Eligibility, the return process, inspection and refund timelines.",
  path: "/returns",
});

export default async function ReturnsPolicyPage() {
  const policy = await getPolicy("returns");
  if (!policy) notFound();
  return <PolicyView policy={policy} />;
}
