import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { countActiveFilters } from "./filters";
import type { ProductFilters } from "@/types/catalog";
import type { ImageAsset } from "@/types/common";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Filtered and sorted listing URLs are useful to share but shouldn't compete
 * with the clean category page in search results: canonical → base path,
 * and noindex while filters or sorting are applied.
 */
export function catalogueMetadata({
  title,
  description,
  path,
  filters,
  image,
}: {
  title: string;
  description: string;
  path: string;
  filters: ProductFilters;
  image?: ImageAsset;
}): Metadata {
  const refined = countActiveFilters(filters) > 0 || Boolean(filters.sort && filters.sort !== "featured");
  const page = filters.page && filters.page > 1 ? filters.page : undefined;
  return buildMetadata({
    title: page ? `${title} — Page ${page}` : title,
    description,
    path: page && !refined ? `${path}?page=${page}` : path,
    image,
    noIndex: refined,
  });
}
