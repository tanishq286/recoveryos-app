import Link from "next/link";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr";

import { Wordmark } from "@/components/brand/wordmark";

const NAV = [
  { href: "/check", label: "Guided check" },
  { href: "/cases", label: "Sample cases" },
];

export function AppHeader() {
  return (
    <header className="chrome relative top-0 z-40 border-b border-line/70 lg:sticky">
      <div role="note" className="border-b border-line/70 bg-signal-wash/60">
        <p className="mx-auto flex max-w-[1280px] items-start gap-2 px-4 py-2 text-sm text-fg-2 sm:px-6">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-fg">Demo.</strong> Every case, person and company
            here is fictional. Nothing you enter is stored, and no real registry is contacted.
          </span>
        </p>
      </div>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 px-4 py-1.5 sm:px-6">
        <Wordmark />
        <nav aria-label="App">
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
      </div>
    </header>
  );
}
