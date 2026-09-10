import type { Metadata } from "next";
import { AccountProfile } from "@/components/account/AccountPages";

export const metadata: Metadata = { title: "Profile" };

export default function AccountProfilePage() {
  return <AccountProfile />;
}
