"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/orders/returns", label: "Returns" },
  { href: "/admin/orders/refunds", label: "Refunds" },
];

/** Orders / Returns / Refunds switcher shown above the three list pages. */
export function OrdersSubNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Orders sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[0.75rem] font-medium uppercase tracking-[0.14em] transition-colors",
              active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
