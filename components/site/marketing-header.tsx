import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#what-we-dont-do", label: "What we don't do" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/cases", label: "Sample case" },
];

export function MarketingHeader() {
  return (
    <header className="border-b border-line/80 bg-ivory">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="order-3 w-full sm:order-2 sm:w-auto">
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-base text-ink/85 underline-offset-4 hover:text-ink hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Button asChild size="sm" className="order-2 sm:order-3">
          <Link href="/check">Start the check</Link>
        </Button>
      </div>
    </header>
  );
}
