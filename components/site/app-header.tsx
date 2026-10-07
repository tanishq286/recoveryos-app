import { InfoIcon } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";
import { CommandTrigger } from "@/components/command/command-trigger";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NavLinks } from "@/components/site/nav-links";

const NAV = [
  { href: "/check", label: "Guided check" },
  { href: "/cases", label: "Sample cases" },
];

export function AppHeader() {
  return (
    <header
      style={{ viewTransitionName: "site-header" }}
      className="chrome relative top-0 z-(--z-chrome) border-b border-(--glass-border) lg:sticky"
    >
      <div role="note" className="border-b border-(--glass-border) bg-signal-wash/50">
        <p className="mx-auto flex max-w-[84rem] items-start gap-2 px-4 py-2 text-sm text-fg-2 sm:px-6">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-fg">Demo.</strong> Every case, person and company
            here is fictional. Nothing you enter is stored, and no real registry is contacted.
          </span>
        </p>
      </div>
      <div className="mx-auto flex max-w-[84rem] flex-wrap items-center justify-between gap-x-6 px-4 py-1.5 sm:px-6">
        <Wordmark />
        {/* Phones: utilities share the logo row, navigation gets its own row. */}
        <div className="order-3 -mt-1 w-full sm:order-2 sm:mt-0 sm:ml-auto sm:w-auto">
          <NavLinks items={NAV} label="App" />
        </div>
        <div className="order-2 flex items-center gap-2 sm:order-3">
          <CommandTrigger />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
