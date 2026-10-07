"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "framer-motion";

import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

/**
 * Header navigation with a real active state: the current section is marked
 * with aria-current and a lit rule under the label. The rule is one shared
 * layout element, so it springs across when the section changes.
 */
export function NavLinks({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  const layoutId = `nav-rule-${label}`;
  return (
    <nav aria-label={label}>
      {/* Below lg: one row that scrolls sideways, fading where more waits,
          with room inside the scroller for the focus ring. */}
      <ul className="-mx-2 flex gap-x-1 whitespace-nowrap max-lg:scroll-fade-x max-lg:-mx-3.5 max-lg:-my-1.5 max-lg:overflow-x-auto max-lg:px-1.5 max-lg:py-1.5 max-lg:[scrollbar-width:none] max-lg:after:block max-lg:after:w-8 max-lg:after:shrink-0">
        {items.map((item) => {
          const path = item.href.split("#")[0];
          const active = !item.href.includes("#") && path !== "/" && pathname.startsWith(path);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center rounded-md px-2 text-[0.9375rem] transition-colors duration-150",
                  active ? "text-fg" : "text-fg-2 hover:text-fg",
                )}
              >
                {item.label}
                {active && (
                  <m.span
                    layoutId={layoutId}
                    aria-hidden="true"
                    className="absolute inset-x-2 bottom-2 h-px rounded-full bg-brand shadow-[0_0_10px_var(--color-brand-cyan)]"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
