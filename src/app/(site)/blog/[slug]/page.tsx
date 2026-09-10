import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogContent } from "@/components/blog/BlogContent";
import { ShareArticle } from "@/components/blog/ShareArticle";
import { JsonLd } from "@/components/seo/JsonLd";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumbs } from "@/components/ui/primitives";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/api";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: "Article not found", robots: { index: false } };
  return buildMetadata({
    title: post.seo?.title ?? post.title,
    description: post.seo?.description ?? post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.coverImage,
    type: "article",
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [post, posts] = await Promise.all([getBlogPostBySlug(slug), getBlogPosts()]);
  if (!post) notFound();

  const related = [...posts.filter((p) => p.slug !== post.slug && p.category === post.category), ...posts.filter((p) => p.slug !== post.slug && p.category !== post.category)].slice(0, 3);
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Journal", href: "/blog" },
    { label: post.title },
  ];

  return (
    <>
      <JsonLd data={[articleJsonLd(post), breadcrumbJsonLd(breadcrumbs)]} />
      <article>
        <header className="container-narrow pt-8 text-center md:pt-10">
          <Breadcrumbs items={breadcrumbs} className="flex justify-center" />
          <p className="mt-10 type-eyebrow text-champagne-deep">
            {post.category} · {post.readingMinutes} min read
          </p>
          <h1 className="mt-5 type-display-l text-balance text-ink">{post.title}</h1>
          <p className="mx-auto mt-6 max-w-xl type-body-lg text-muted">{post.excerpt}</p>
          <p className="mt-6 type-body-sm text-subtle">
            {post.author.name} · <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </p>
        </header>

        <div className="container-luxe mt-12 md:mt-16">
          <div className="relative aspect-[4/3] overflow-hidden bg-cream md:aspect-[21/9]">
            <Image src={post.coverImage.url} alt={post.coverImage.alt} fill priority sizes="(min-width: 1536px) 1424px, 100vw" className="object-cover" />
          </div>
        </div>

        <div className="container-narrow py-14 md:py-20">
          <BlogContent blocks={post.content} />
          <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-line pt-8">
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {post.tags.map((tag) => (
                <li key={tag} className="border border-line px-3 py-1 text-[0.6875rem] uppercase tracking-[0.14em] text-ink-soft">
                  {tag}
                </li>
              ))}
            </ul>
            <ShareArticle title={post.title} path={`/blog/${post.slug}`} />
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-line bg-cream py-16 md:py-24" aria-labelledby="related-articles-title">
          <div className="container-luxe">
            <h2 id="related-articles-title" className="type-h2 text-ink">
              Continue reading
            </h2>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <Link href={`/blog/${item.slug}`} className="group block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-sand">
                      <Image src={item.coverImage.url} alt="" fill sizes="(min-width: 768px) 30vw, 100vw" className="object-cover transition-transform duration-[1200ms] ease-luxe group-hover:scale-[1.04]" />
                    </div>
                    <p className="mt-5 type-eyebrow text-champagne-deep">{item.category}</p>
                    <p className="mt-2 type-h3 text-ink group-hover:text-champagne-deep">{item.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="py-16 md:py-20">
        <div className="container-narrow text-center">
          <h2 className="type-h2 text-ink">Find a piece that speaks to you</h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/shop">Explore the Collection</ButtonLink>
            <ButtonLink href="/custom-jewellery" variant="outline">
              Create Your Jewellery
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
