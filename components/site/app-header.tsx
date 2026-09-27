import Link from "next/link";
import { Info } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";

const NAV = [
  { href: "/check", label: "Guided check" },
  { href: "/cases", label: "Sample cases" },
];

export function AppHeader() {
  return (
    <header className="border-b border-line bg-pearl">
      <div role="note" className="border-b border-brass/40 bg-brass-wash">
        <p className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-2 text-sm text-ink sm:px-6">
          <Info className="mt-0.5 size-4 shrink-0 text-brass-ink" aria-hidden="true" />
          <span>
            <strong className="font-semibold">Demo.</strong> Every case, person and company here is
            fictional. Nothing you enter is stored, and no real registry is contacted.
          </span>
        </p>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Wordmark />
        <nav aria-label="App">
          <ul className="flex flex-wrap gap-x-5">
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
      </div>
    </header>
  );
}
