import type { Metadata } from "next";
import { AccountOverview } from "@/components/account/AccountPages";

export const metadata: Metadata = { title: "Overview" };

export default function AccountPage() {
  return <AccountOverview />;
}
