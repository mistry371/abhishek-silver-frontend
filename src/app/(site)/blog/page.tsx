import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { JsonLd } from "@/components/seo/JsonLd";
import { PageIntro } from "@/components/ui/PageIntro";
import { getBlogPosts } from "@/lib/api";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { cn, formatDate, slugify } from "@/lib/utils";

export const metadata = buildMetadata({
  title: "The Journal — Jewellery Guides & Stories",
  description: "Buying guides, gold and silver education, styling notes and stories from our studio.",
  path: "/blog",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const { category: rawCategory } = await searchParams;
  const posts = await getBlogPosts();
  const categories = [...new Set(posts.map((post) => post.category))];
  const active = typeof rawCategory === "string" ? categories.find((c) => slugify(c) === rawCategory) : undefined;
  const visible = active ? posts.filter((post) => post.category === active) : posts;
  const [featured, ...rest] = visible;
  const breadcrumbs = [{ label: "Home", href: "/" }, { label: "Journal" }];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <PageIntro breadcrumbs={breadcrumbs} eyebrow="The Journal" title="Guides, stories & styling" description="Thoughtful reading on choosing, wearing and caring for fine jewellery." />

      <div className="container-luxe pb-24">
        <nav aria-label="Journal categories" className="no-scrollbar -mx-[var(--gutter)] mb-12 flex gap-2 overflow-x-auto px-[var(--gutter)] md:mx-0 md:flex-wrap md:px-0">
          {[{ label: "All", href: "/blog", current: !active }, ...categories.map((c) => ({ label: c, href: `/blog?category=${slugify(c)}`, current: active === c }))].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "shrink-0 border px-5 py-2.5 type-caption tracking-[0.14em] transition-colors",
                item.current ? "border-ink bg-ink text-ivory" : "border-line text-ink-soft hover:border-ink hover:text-ink",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {featured && (
          <article className="group grid items-center gap-8 border-b border-line pb-16 lg:grid-cols-12 lg:gap-16">
            <Link href={`/blog/${featured.slug}`} className="relative block aspect-[16/11] overflow-hidden bg-cream lg:col-span-7" tabIndex={-1} aria-hidden="true">
              <Image src={featured.coverImage.url} alt="" fill priority sizes="(min-width: 1024px) 56vw, 100vw" className="object-cover transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.04]" />
            </Link>
            <div className="lg:col-span-5">
              <p className="type-eyebrow text-champagne-deep">
                {featured.category} · {featured.readingMinutes} min read
              </p>
              <h2 className="mt-4 type-h1 text-balance text-ink">
                <Link href={`/blog/${featured.slug}`} className="transition-colors hover:text-champagne-deep">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-5 type-body-lg text-muted">{featured.excerpt}</p>
              <p className="mt-6 type-body-sm text-subtle">
                <time dateTime={featured.publishedAt}>{formatDate(featured.publishedAt)}</time>
              </p>
              <Link href={`/blog/${featured.slug}`} className="mt-8 inline-flex items-center gap-2 type-button link-underline-static">
                Read Article
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          </article>
        )}

        {rest.length > 0 && (
          <ul className="mt-16 grid gap-x-8 gap-y-16 md:grid-cols-2 xl:grid-cols-3">
            {rest.map((post) => (
              <li key={post.id}>
                <article className="group">
                  <Link href={`/blog/${post.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-cream" tabIndex={-1} aria-hidden="true">
                    <Image src={post.coverImage.url} alt="" fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" className="object-cover transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.04]" />
                  </Link>
                  <p className="mt-6 type-eyebrow text-champagne-deep">
                    {post.category} · {post.readingMinutes} min read
                  </p>
                  <h2 className="mt-3 type-h3 text-ink">
                    <Link href={`/blog/${post.slug}`} className="transition-colors hover:text-champagne-deep">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 type-body text-muted">{post.excerpt}</p>
                  <p className="mt-4 type-body-sm text-subtle">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        )}

        {visible.length === 0 && <p className="type-body text-muted">No articles in this category yet.</p>}
      </div>
    </>
  );
}
