import type { ReactNode } from "react";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SiteContactProvider } from "@/components/layout/SiteContactProvider";
import { loadSiteContact } from "@/lib/api/services/site-contact";
import { installSiteContact } from "@/lib/site-contact";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const contact = await loadSiteContact();
  installSiteContact(contact);
  return (
    <SiteContactProvider contact={contact}>
      <SiteChrome>{children}</SiteChrome>
    </SiteContactProvider>
  );
}
