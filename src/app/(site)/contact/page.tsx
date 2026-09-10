import { ContactForm } from "@/components/forms/ContactForm";
import { ClockIcon, DirectionsIcon, InstagramIcon, MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { PageIntro } from "@/components/ui/PageIntro";
import { siteConfig } from "@/config/site";
import { getStoreLocation } from "@/lib/api";
import { breadcrumbJsonLd, buildMetadata, localBusinessJsonLd } from "@/lib/seo";
import { getSiteContact } from "@/lib/site-contact";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";

export const metadata = buildMetadata({
  title: "Contact Us",
  description: "Contact Abhishek Silver in Surat about a piece, an order or a custom design — by WhatsApp, phone or at our store in Silver Arcade, Bhagal Main Road.",
  path: "/contact",
});

export default async function ContactPage() {
  const store = await getStoreLocation();
  const contact = getSiteContact();
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Contact" }];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(breadcrumbs), localBusinessJsonLd(store)]} />
      <PageIntro
        breadcrumbs={breadcrumbs}
        eyebrow="We're here to help"
        title="Contact us"
        description="Questions about a piece, an order or a custom design? Choose whichever way suits you best."
      />

      <div className="container-luxe grid grid-cols-1 items-start gap-12 pb-20 lg:grid-cols-12 lg:gap-16">
        <div className="min-w-0 space-y-4 lg:col-span-5">
          <a
            href={whatsappUrl(whatsappMessages.general())}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-5 bg-onyx p-6 text-ivory transition-colors hover:bg-whatsapp md:p-8"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ivory/30">
              <WhatsAppIcon size={26} />
            </span>
            <span>
              <span className="block type-eyebrow text-champagne-soft group-hover:text-ivory">Fastest response</span>
              <span className="mt-1 block font-serif text-2xl">Chat on WhatsApp</span>
              <span className="mt-1 block type-body-sm text-ivory/70">Share photos, ask for videos or get pricing details.</span>
            </span>
          </a>

          <dl className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="bg-porcelain p-6">
              <dt className="flex items-center gap-2 type-caption tracking-[0.16em] text-muted">
                <PhoneIcon size={15} /> Phone
              </dt>
              <dd className="mt-3 space-y-1">
                {contact.phones.map((phone) => (
                  <a key={phone.href} href={phone.href} className="block w-fit type-body text-ink link-underline">
                    {phone.display}
                  </a>
                ))}
              </dd>
            </div>
            <div className="bg-porcelain p-6">
              <dt className="flex items-center gap-2 type-caption tracking-[0.16em] text-muted">
                <MapPinIcon size={15} /> Store address
              </dt>
              <dd className="mt-3 type-body text-ink">
                <span className="block">{siteConfig.name}</span>
                {store.addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
                {store.city}, {store.state} {store.postalCode}
              </dd>
            </div>
            <div className="bg-porcelain p-6">
              <dt className="flex items-center gap-2 type-caption tracking-[0.16em] text-muted">
                <ClockIcon size={15} /> Business hours
              </dt>
              <dd className="mt-3 space-y-1 type-body text-ink">
                {store.hours.map((entry) => (
                  <span key={entry.label} className="block">
                    <span className="text-muted">{entry.label}:</span> {entry.value}
                  </span>
                ))}
              </dd>
            </div>
            {contact.email ? (
              <div className="bg-porcelain p-6">
                <dt className="flex items-center gap-2 type-caption tracking-[0.16em] text-muted">
                  <MailIcon size={15} /> Email
                </dt>
                <dd className="mt-3">
                  <a href={`mailto:${contact.email}`} className="break-all type-body text-ink link-underline">
                    {contact.email}
                  </a>
                </dd>
              </div>
            ) : (
              <div className="bg-porcelain p-6">
                <dt className="flex items-center gap-2 type-caption tracking-[0.16em] text-muted">
                  <InstagramIcon size={15} /> Instagram
                </dt>
                <dd className="mt-3">
                  <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer" className="type-body text-ink link-underline">
                    {contact.instagramHandle}
                  </a>
                </dd>
              </div>
            )}
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-4 border border-line bg-porcelain p-6">
            <p className="type-caption tracking-[0.16em] text-muted">Follow us</p>
            <SocialLinks />
          </div>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <h2 className="mb-6 type-h3 text-ink">Send us a message</h2>
          <ContactForm />
        </div>
      </div>

      <section id="store" className="scroll-mt-32 border-t border-line" aria-labelledby="store-map-title">
        <div className="grid lg:grid-cols-12">
          <div className="flex flex-col justify-center px-[var(--gutter)] py-14 lg:col-span-4 lg:py-20">
            <p className="type-eyebrow text-champagne-deep">Visit Us</p>
            <h2 id="store-map-title" className="mt-4 type-h2 text-ink">
              {store.name}
            </h2>
            <p className="mt-4 type-body text-muted">
              {store.addressLines.join(", ")}, {store.city}, {store.state} {store.postalCode}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={store.directionsUrl} external>
                <DirectionsIcon size={17} />
                Get Directions
              </ButtonLink>
              <ButtonLink href={whatsappUrl(whatsappMessages.store())} external variant="outline">
                Plan a Visit
              </ButtonLink>
            </div>
          </div>
          <div className="relative min-h-[22rem] bg-cream lg:col-span-8 lg:min-h-[32rem]">
            <iframe
              title={`Map showing the location of ${store.name}`}
              src={store.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full grayscale-[30%]"
            />
          </div>
        </div>
      </section>
    </>
  );
}
