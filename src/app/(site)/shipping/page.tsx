import { notFound } from "next/navigation";
import { PolicyView } from "@/components/content/PolicyView";
import { getPolicy } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Shipping Policy",
  description: "Delivery locations, timelines, charges, packaging and order tracking.",
  path: "/shipping",
});

export default async function ShippingPolicyPage() {
  const policy = await getPolicy("shipping");
  if (!policy) notFound();
  return <PolicyView policy={policy} />;
}
