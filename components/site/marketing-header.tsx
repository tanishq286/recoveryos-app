import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { CHECK_CTA } from "@/components/site/cta";
import { CommandTrigger } from "@/components/command/command-trigger";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NavLinks } from "@/components/site/nav-links";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#what-we-dont-do", label: "What we don't do" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/cases", label: "Sample case" },
];

export function MarketingHeader() {
  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="chrome relative top-0 z-(--z-chrome) border-b border-line/70 lg:sticky"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-2.5 sm:px-6 lg:flex-nowrap">
        <Wordmark />
        <div className="order-3 w-full lg:order-2 lg:w-auto">
          <NavLinks items={NAV} label="Main" />
        </div>
        <div className="order-2 flex items-center gap-3 lg:order-3">
          <CommandTrigger />
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/check">{CHECK_CTA}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
