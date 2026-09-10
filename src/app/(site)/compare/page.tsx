import type { Metadata } from "next";
import { CompareView } from "@/components/compare/CompareView";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Compare Jewellery",
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <>
      <PageIntro
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Compare" }]}
        title="Compare Pieces"
        description="Weigh up price, purity, weight and making charges side by side."
      />
      <div className="container-luxe pb-24">
        <CompareView />
      </div>
    </>
  );
}
