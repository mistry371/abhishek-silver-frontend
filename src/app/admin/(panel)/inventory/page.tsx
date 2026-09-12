"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImportAction } from "@/components/admin/ImportDialog";
import { AdminButton, AdminLinkButton, ErrorState, InlineAlert, PageHeader, StatCard } from "@/components/admin/ui";
import { InventoryTable } from "@/components/admin/inventory/InventoryTable";
import type { InventorySummary } from "@/components/admin/inventory/types";
import { SearchIcon } from "@/components/icons";
import { adminApi, errorMessage } from "@/lib/admin/client";
import { money, number } from "@/lib/admin/format";
import { useAdminResource } from "@/lib/admin/hooks";
import { Skeleton } from "@/components/ui/primitives";

export default function InventoryPage() {
  const summary = useAdminResource<InventorySummary>("/inventory/summary");
  // Remounting the table is the simplest way to re-read stock after an import.
  const [tableKey, setTableKey] = useState(0);

  if (summary.error?.code === "forbidden") {
    return (
      <>
        <PageHeader title="Inventory" />
        <ErrorState error={summary.error} />
      </>
    );
  }

  const data = summary.latest;

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Live stock by product and location. Every change is recorded as a stock movement."
        actions={
          <>
            <AdminLinkButton href="/admin/inventory/stock-movements">Stock movements</AdminLinkButton>
            <AdminLinkButton href="/admin/inventory/low-stock">Low stock</AdminLinkButton>
            <AdminLinkButton href="/admin/inventory/out-of-stock">Out of stock</AdminLinkButton>
            <ImportAction
              entity={["inventory", "stock"]}
              variant="primary"
              label="Import stock"
              onImported={() => {
                summary.reload();
                setTableKey((value) => value + 1);
              }}
            />
          </>
        }
      />

      <div className="mb-6 space-y-4">
        {summary.error && !data && (
          <InlineAlert>
            {summary.error.message}{" "}
            <button type="button" className="underline" onClick={summary.reload}>
              Retry
            </button>
          </InlineAlert>
        )}
        {!data && !summary.error && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        )}
        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Products" value={number(data.products)} />
              <StatCard label="Units in stock" value={number(data.totalUnits)} />
              <StatCard label="Low stock" value={number(data.lowStock)} tone={data.lowStock ? "warning" : "neutral"} href="/admin/inventory/low-stock" hint="Active products" />
              <StatCard label="Out of stock" value={number(data.outOfStock)} tone={data.outOfStock ? "danger" : "neutral"} href="/admin/inventory/out-of-stock" hint="Active products" />
              {data.valuation !== undefined && (
                <StatCard
                  label="Inventory value"
                  value={money(data.valuation)}
                  tone={data.productsMissingCost ? "warning" : "neutral"}
                  hint={data.productsMissingCost ? `${data.productsMissingCost} stocked products have no purchase price and are excluded` : "At purchase price"}
                />
              )}
            </div>
            {data.byLocation.length > 0 && (
              <ul className="flex flex-wrap gap-2 text-[0.8125rem]">
                {data.byLocation.map((location) => (
                  <li key={location.locationId} className="border border-line bg-porcelain px-3 py-1.5">
                    <span className="text-muted">{location.name}:</span> <span className="tabular-nums text-ink">{number(location.units)} units</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <LookupBox />
      </div>

      <InventoryTable key={tableKey} />
    </>
  );
}

function LookupBox() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    const value = code.trim();
    if (!value) {
      setError("Enter or scan a SKU or barcode.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const match = await adminApi.get<{ productId: string; name: string; sku: string }>("/inventory/lookup", { code: value });
      router.push(`/admin/inventory/${match.productId}`);
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  return (
    <form onSubmit={lookup} className="border border-line bg-porcelain px-5 py-4" role="search" aria-label="Find product by SKU or barcode">
      <label htmlFor="inventory-lookup" className="text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-muted">
        SKU / barcode lookup
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="inventory-lookup"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              if (error) setError(null);
            }}
            maxLength={64}
            autoComplete="off"
            placeholder="Scan or type an exact SKU or barcode"
            aria-invalid={error ? true : undefined}
            className="h-10 w-full border border-line bg-porcelain pl-9 pr-3 text-[0.875rem] text-ink outline-none placeholder:text-subtle focus:border-ink"
          />
        </div>
        <AdminButton type="submit" variant="primary" loading={pending}>
          Open product stock
        </AdminButton>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
