import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { CHECK_CTA } from "@/components/site/cta";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#what-we-dont-do", label: "What we don't do" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/cases", label: "Sample case" },
];

export function MarketingHeader() {
  return (
    <header className="chrome relative top-0 z-40 border-b border-line/70 lg:sticky">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-2.5 sm:px-6 lg:flex-nowrap">
        <Wordmark />
        <nav aria-label="Main" className="order-3 w-full lg:order-2 lg:w-auto">
          <ul className="-mx-2 flex flex-wrap gap-x-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-md px-2 text-[0.9375rem] text-fg-2 transition-colors duration-150 hover:text-fg"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Button asChild size="sm" className="order-2 hidden sm:inline-flex lg:order-3">
          <Link href="/check">{CHECK_CTA}</Link>
        </Button>
      </div>
    </header>
  );
}
