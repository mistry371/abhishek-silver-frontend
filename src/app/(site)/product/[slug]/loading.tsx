import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="container-luxe pb-20 pt-8" aria-busy="true" aria-label="Loading product">
      <Skeleton className="h-3 w-56" />
      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-20">
        <div className="grid gap-4 md:grid-cols-[4.5rem_1fr] lg:col-span-7 lg:grid-cols-[5.5rem_1fr]">
          <div className="hidden flex-col gap-3 md:flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
          <Skeleton className="aspect-[4/5] w-full" />
        </div>
        <div className="space-y-5 lg:col-span-5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
