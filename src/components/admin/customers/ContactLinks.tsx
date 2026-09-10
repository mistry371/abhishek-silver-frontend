"use client";

import { adminButton } from "@/components/admin/ui";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { telHref, whatsappHref } from "./shared";

/** Quick contact actions: call, WhatsApp and email. Renders nothing without contact details. */
export function ContactLinks({ phone, email, size = "md" }: { phone?: string | null; email?: string | null; size?: "sm" | "md" }) {
  if (!phone && !email) return null;
  return (
    <>
      {phone && (
        <a href={telHref(phone)} className={adminButton("secondary", size)} title={`Call ${phone}`}>
          <PhoneIcon size={15} />
          Call
        </a>
      )}
      {phone && (
        <a href={whatsappHref(phone)} target="_blank" rel="noopener noreferrer" className={adminButton("secondary", size)} title={`WhatsApp ${phone}`}>
          <WhatsAppIcon size={15} />
          WhatsApp
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={adminButton("secondary", size)} title={`Email ${email}`}>
          <MailIcon size={15} />
          Email
        </a>
      )}
    </>
  );
}
