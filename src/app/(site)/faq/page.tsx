import { WhatsAppIcon } from "@/components/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Accordion } from "@/components/ui/Disclosure";
import { PageIntro } from "@/components/ui/PageIntro";
import { getFaqs } from "@/lib/api";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/lib/seo";
import { slugify } from "@/lib/utils";
import { whatsappMessages, whatsappUrl } from "@/lib/whatsapp";

export const metadata = buildMetadata({
  title: "Frequently Asked Questions",
  description: "Answers about jewellery pricing, purity, orders, payments, shipping, returns, custom designs and care.",
  path: "/faq",
});

export default async function FaqPage() {
  const faqs = await getFaqs();
  const categories = [...new Set(faqs.map((faq) => faq.category))];
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "FAQ" }];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(breadcrumbs), faqJsonLd(faqs)]} />
      <PageIntro breadcrumbs={breadcrumbs} eyebrow="Help Centre" title="Frequently asked questions" description="Everything you need to know about choosing, buying and caring for your jewellery." />

      <div className="container-luxe grid grid-cols-1 items-start gap-12 pb-24 lg:grid-cols-12 lg:gap-16">
        <nav aria-label="FAQ categories" className="min-w-0 lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:col-span-3">
          <ul className="no-scrollbar -mx-[var(--gutter)] flex gap-2 overflow-x-auto px-[var(--gutter)] lg:mx-0 lg:flex-col lg:gap-0 lg:border-t lg:border-line lg:px-0">
            {categories.map((category) => (
              <li key={category}>
                <a
                  href={`#${slugify(category)}`}
                  className="block whitespace-nowrap border border-line px-4 py-2.5 type-caption tracking-[0.14em] text-ink-soft transition-colors hover:text-ink lg:border-0 lg:border-b lg:px-0 lg:py-4"
                >
                  {category}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-16 lg:col-span-9">
          {categories.map((category) => (
            <section key={category} id={slugify(category)} aria-labelledby={`${slugify(category)}-title`} className="scroll-mt-40">
              <h2 id={`${slugify(category)}-title`} className="mb-4 type-h2 text-ink">
                {category}
              </h2>
              <Accordion
                anchors
                allowMultiple
                items={faqs
                  .filter((faq) => faq.category === category)
                  .map((faq) => ({ id: faq.id, title: faq.question, content: <p className="max-w-3xl">{faq.answer}</p> }))}
              />
            </section>
          ))}

          <div className="flex flex-col items-start justify-between gap-6 border border-line bg-porcelain p-8 md:flex-row md:items-center md:p-10">
            <div>
              <h2 className="type-h3 text-ink">Still have a question?</h2>
              <p className="mt-2 type-body text-muted">Our team is happy to help with anything not covered here.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={whatsappUrl(whatsappMessages.general())} external variant="whatsapp">
                <WhatsAppIcon size={18} />
                WhatsApp
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                Contact Us
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
