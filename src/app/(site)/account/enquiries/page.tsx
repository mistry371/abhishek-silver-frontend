import type { Metadata } from "next";
import { AccountEnquiries } from "@/components/account/AccountPages";

export const metadata: Metadata = { title: "Enquiries" };

export default function AccountEnquiriesPage() {
  return <AccountEnquiries />;
}
