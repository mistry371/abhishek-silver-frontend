import type { Metadata } from "next";
import { AccountOrderDetail } from "@/components/account/AccountPages";

export const metadata: Metadata = { title: "Order Details" };

export default async function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountOrderDetail orderId={id} />;
}
