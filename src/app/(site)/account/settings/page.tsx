import type { Metadata } from "next";
import { AccountSettings } from "@/components/account/AccountPages";

export const metadata: Metadata = { title: "Settings" };

export default function AccountSettingsPage() {
  return <AccountSettings />;
}
