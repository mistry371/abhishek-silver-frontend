"use client";

import type { ReactNode } from "react";
import { installSiteContact, type SiteContact } from "@/lib/site-contact";

/** Makes the admin-managed contact details available to client components (SSR and browser). */
export function SiteContactProvider({ contact, children }: { contact: SiteContact; children: ReactNode }) {
  installSiteContact(contact);
  return <>{children}</>;
}
