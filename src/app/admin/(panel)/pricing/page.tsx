"use client";

import { AdminLinkButton, ErrorState, LoadingBlock, PageHeader, Tabs } from "@/components/admin/ui";
import { ChargeRatesTab } from "@/components/admin/pricing/ChargeRatesTab";
import { HistoryTab, RunningOffersTab } from "@/components/admin/pricing/HistoryTab";
import { MakingDefaultsTab } from "@/components/admin/pricing/MakingDefaultsTab";
import { PreviewTab } from "@/components/admin/pricing/PreviewTab";
import { GstTab, MetalRatesTab } from "@/components/admin/pricing/RatesTab";
import type { PricingOverview } from "@/components/admin/pricing/shared";
import { useAdminResource, useUrlFilters } from "@/lib/admin/hooks";

const TABS = [
  { value: "rates", label: "Metal rates" },
  { value: "gst", label: "GST" },
  { value: "making", label: "Making defaults" },
  { value: "charges", label: "Stone & other charges" },
  { value: "preview", label: "Price preview" },
  { value: "offers", label: "Offer discounts" },
  { value: "history", label: "History" },
] as const;

type TabKey = (typeof TABS)[number]["value"];

export default function PricingPage() {
  const { values, setFilters } = useUrlFilters(["tab"] as const, { tab: "rates" });
  const tab: TabKey = TABS.find((item) => item.value === values.tab)?.value ?? "rates";
  const { latest, error, reload } = useAdminResource<PricingOverview>("/pricing");
  const categoryNames = Object.fromEntries((latest?.makingDefaults ?? []).map((row) => [row.categoryId, row.categoryName]));

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Metal rates, GST and charges behind every live website price. Each change needs a reason and is kept in price history."
        actions={
          <>
            <AdminLinkButton href="/admin/offers" variant="ghost">
              Offers
            </AdminLinkButton>
            <AdminLinkButton href="/admin/coupons" variant="ghost">
              Coupons
            </AdminLinkButton>
          </>
        }
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={(value) => setFilters({ tab: value })}
        tabs={TABS.map((item) => ({
          value: item.value,
          label: item.label,
          count: item.value === "offers" && latest ? latest.runningOfferDiscounts.length : undefined,
        }))}
      />

      {tab === "history" ? (
        <HistoryTab categoryNames={categoryNames} />
      ) : error && !latest ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !latest ? (
        <LoadingBlock rows={6} />
      ) : (
        <>
          {tab === "rates" && <MetalRatesTab overview={latest} onChanged={reload} />}
          {tab === "gst" && <GstTab key={`${latest.gst.rate}|${latest.gst.updatedAt}`} overview={latest} onChanged={reload} />}
          {tab === "making" && <MakingDefaultsTab key={JSON.stringify(latest.makingDefaults)} overview={latest} onChanged={reload} />}
          {tab === "charges" && <ChargeRatesTab overview={latest} onChanged={reload} />}
          {tab === "preview" && <PreviewTab overview={latest} />}
          {tab === "offers" && <RunningOffersTab overview={latest} />}
        </>
      )}
    </>
  );
}
