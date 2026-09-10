import type { Metadata } from "next";
import { OrderConfirmationClient } from "@/components/orders/OrderConfirmationClient";

export const metadata: Metadata = {
  title: "Order Confirmation",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderConfirmationClient orderId={id} />;
}
