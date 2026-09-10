import type { Metadata } from "next";
import { AccountOrders } from "@/components/account/AccountPages";

export const metadata: Metadata = { title: "Orders" };

export default function AccountOrdersPage() {
  return <AccountOrders />;
}
