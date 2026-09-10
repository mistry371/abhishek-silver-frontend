import Image from "next/image";
import { CustomEnquiryForm } from "@/components/forms/CustomEnquiryForm";
import { WhatsAppIcon } from "@/components/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Disclosure";
import { Breadcrumbs } from "@/components/ui/primitives";
import { getFaqs } from "@/lib/api";
import { media } from "@/lib/media";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";

export const metadata = buildMetadata({
  title: "Custom Jewellery — Personalised Designs",
  description: "Create personalised gold and silver jewellery for your occasion. Share your idea, choose your metal and budget, and our team will guide you through the design.",
  path: "/custom-jewellery",
  image: media.editorial.custom,
});

const process = [
  { title: "Share your idea", text: "Tell us about the occasion, the style you love and your budget. Reference images help." },
  { title: "Consultation", text: "We discuss design direction, metal, purity, stones and size with you." },
  { title: "Design approval", text: "You review and approve the final design and price before anything is made." },
  { title: "Crafted for you", text: "Your piece is made and finished to the approved design." },
];

export default async function CustomJewelleryPage() {
  const faqs = (await getFaqs()).filter((faq) => faq.category === "Custom Jewellery");
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Custom Jewellery" }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <section className="on-dark relative isolate overflow-hidden bg-onyx text-ivory">
        <div className="container-luxe grid items-center gap-12 py-12 md:py-16 lg:grid-cols-2 lg:gap-20 lg:py-20">
          <div>
            <Breadcrumbs items={breadcrumbs} tone="light" />
            <p className="mt-10 type-eyebrow text-champagne-soft">Custom Jewellery</p>
            <h1 className="mt-4 type-display-l text-balance">Personalised designs, created for your occasion</h1>
            <p className="mt-6 max-w-lg type-body-lg text-ivory/75">
              From an engraved band to a bridal set inspired by family heirlooms — tell us what you imagine and we&apos;ll help bring it to life.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="#design-brief" variant="light" size="lg">
                Create Your Jewellery
              </ButtonLink>
              <ButtonLink href={whatsappUrl(whatsappMessages.custom())} external variant="outline-light" size="lg">
                <WhatsAppIcon size={18} />
                WhatsApp
              </ButtonLink>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className="relative col-span-3 aspect-[3/4] overflow-hidden">
              <Image src={media.editorial.custom.url} alt={media.editorial.custom.alt} fill priority sizes="(min-width: 1024px) 28vw, 60vw" className="object-cover" />
            </div>
            <div className="relative col-span-2 mt-20 aspect-[3/4] overflow-hidden">
              <Image src={media.editorial.customDetail.url} alt={media.editorial.customDetail.alt} fill priority sizes="(min-width: 1024px) 19vw, 40vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="section-y-sm border-b border-line" aria-labelledby="process-title">
        <div className="container-luxe">
          <h2 id="process-title" className="type-h2 text-ink">
            How it works
          </h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {process.map((step, index) => (
              <li key={step.title} className="border-t border-ink pt-6" data-reveal="" style={{ "--reveal-delay": `${index * 90}ms` } as React.CSSProperties}>
                <p className="font-serif text-4xl text-champagne-deep">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-4 type-h4 text-ink">{step.title}</h3>
                <p className="mt-2 type-body-sm text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="design-brief" className="section-y scroll-mt-32" aria-labelledby="brief-title">
        <div className="container-luxe grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:col-span-4">
            <p className="type-eyebrow text-champagne-deep">Design brief</p>
            <h2 id="brief-title" className="mt-4 type-h1 text-ink">
              Tell us about your piece
            </h2>
            <p className="mt-5 type-body-lg text-muted">The more you share, the better we can guide you. There&apos;s no obligation — every design begins with a conversation.</p>
            {faqs.length > 0 && <Accordion className="mt-10" items={faqs.map((faq) => ({ id: faq.id, title: faq.question, content: faq.answer }))} />}
          </div>
          <div className="lg:col-span-8">
            <CustomEnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
