import Link from "next/link";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { footerNav, paymentMethods, type NavLink } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { contactAddress, contactDirectionsUrl, getSiteContact } from "@/lib/site-contact";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";
import { Logo } from "./Logo";
import { SocialLinks } from "./SocialLinks";

function FooterColumn({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h3 className="type-eyebrow text-champagne-soft">{title}</h3>
      <ul className="mt-6 space-y-3.5">
        {links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link href={link.href} className="type-body-sm text-ivory/65 transition-colors link-underline hover:text-ivory">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const contactLinkClass = "inline-flex items-start gap-3 type-body-sm text-ivory/75 transition-colors hover:text-ivory";

export function Footer() {
  const year = new Date().getFullYear();
  const contact = getSiteContact();
  return (
    <footer className="on-dark bg-onyx text-ivory/80" aria-labelledby="site-footer-title">
      <h2 id="site-footer-title" className="sr-only">
        Site footer
      </h2>
      <div className="container-luxe pb-10 pt-20 lg:pt-24">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <Logo tone="light" />
            <p className="mt-7 max-w-sm type-body text-ivory/60">
              Fine gold and silver jewellery from Surat, chosen with care and priced with transparency.
            </p>
            <ul className="mt-8 space-y-3">
              <li>
                <a href={contactDirectionsUrl(contact)} target="_blank" rel="noopener noreferrer" className={contactLinkClass}>
                  <MapPinIcon size={16} className="mt-0.5 shrink-0" />
                  <span className="max-w-xs">{contactAddress(contact)}</span>
                </a>
              </li>
              {contact.phones.map((phone) => (
                <li key={phone.href}>
                  <a href={phone.href} className={contactLinkClass}>
                    <PhoneIcon size={16} className="mt-0.5 shrink-0" />
                    {phone.display}
                  </a>
                </li>
              ))}
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className={contactLinkClass}>
                    <MailIcon size={16} className="mt-0.5 shrink-0" />
                    {contact.email}
                  </a>
                </li>
              )}
              <li>
                <a href={whatsappUrl(whatsappMessages.general())} target="_blank" rel="noopener noreferrer" className={contactLinkClass}>
                  <WhatsAppIcon size={16} className="mt-0.5 shrink-0" />
                  Chat on WhatsApp
                </a>
              </li>
            </ul>
            <SocialLinks tone="light" className="mt-8" />
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-5">
            <FooterColumn title="Shop" links={footerNav.shop} />
            <FooterColumn title="Customer Care" links={footerNav.care} />
            <FooterColumn title="About" links={footerNav.about} />
          </div>

          <div className="lg:col-span-3">
            <h3 className="type-eyebrow text-champagne-soft">Newsletter</h3>
            <p className="mt-5 font-serif text-[1.75rem] leading-tight text-ivory">Stay in the know</p>
            <p className="mt-3 type-body-sm text-ivory/60">New collections, festive edits and exclusive offers — delivered occasionally.</p>
            <NewsletterForm tone="dark" className="mt-6" />
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-onyx-line pt-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="type-body-sm text-ivory/50">
            © {year} {siteConfig.legalName}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {footerNav.legal.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className="type-body-sm text-ivory/55 transition-colors hover:text-ivory">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="flex flex-wrap gap-2" aria-label="Payment methods">
            {paymentMethods.map((method) => (
              <li key={method} className="border border-onyx-line px-2.5 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-ivory/60">
                {method}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
