"use client";

import { Carousel } from "@/components/ui/Carousel";
import { cn } from "@/lib/utils";
import type { ProductSummary } from "@/types/catalog";
import { ProductCard } from "./ProductCard";

const defaultItemWidths =
  "w-[70%] sm:w-[42%] md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-4.5rem)/4)] 3xl:w-[calc((100%-6rem)/5)]";

const defaultSizes = "(min-width: 1600px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, (min-width: 640px) 42vw, 70vw";

export function ProductCarousel({
  products,
  label,
  className,
  itemClassName,
  sizes = defaultSizes,
}: {
  products: ProductSummary[];
  label: string;
  className?: string;
  itemClassName?: string;
  sizes?: string;
}) {
  if (products.length === 0) return null;
  return (
    <Carousel label={label} className={className} itemClassName={cn(itemClassName ?? defaultItemWidths)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} sizes={sizes} />
      ))}
    </Carousel>
  );
}
