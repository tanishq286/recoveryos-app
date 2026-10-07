"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Header navigation with a real active state: the current section is marked
 * with aria-current and a 1px signal rule that grows in under the label.
 */
export function NavLinks({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label}>
      <ul className="-mx-2 flex flex-wrap gap-x-1">
        {items.map((item) => {
          const path = item.href.split("#")[0];
          const active = !item.href.includes("#") && path !== "/" && pathname.startsWith(path);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center rounded-md px-2 text-[0.9375rem] transition-colors duration-150",
                  active ? "text-fg" : "text-fg-2 hover:text-fg",
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-2 bottom-2 h-px origin-left bg-signal transition-transform duration-[240ms] ease-(--ease-out)",
                    active ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
