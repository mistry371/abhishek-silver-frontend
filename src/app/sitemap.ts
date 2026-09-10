import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { getAllProductSlugs, getBlogPosts, getCategories, getCollections } from "@/lib/api";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();
  const [products, categories, collections, posts] = await Promise.all([
    getAllProductSlugs(),
    getCategories(),
    getCollections(),
    getBlogPosts(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { path: "", priority: 1, changeFrequency: "daily" as const },
    { path: "/shop", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/custom-jewellery", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.6, changeFrequency: "weekly" as const },
    { path: "/shipping", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/returns", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  ].map(({ path, priority, changeFrequency }) => ({ url: `${base}${path}`, lastModified: now, changeFrequency, priority }));

  return [
    ...staticRoutes,
    ...categories
      .filter((category) => category.slug !== "custom-jewellery")
      .map((category) => ({ url: `${base}/shop/${category.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...collections.map((collection) => ({ url: `${base}/collection/${collection.slug}`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...products.map((product) => ({ url: `${base}/product/${product.slug}`, lastModified: new Date(product.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...posts.map((post) => ({ url: `${base}/blog/${post.slug}`, lastModified: new Date(post.updatedAt), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
