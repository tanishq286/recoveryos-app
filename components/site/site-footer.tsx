import Link from "next/link";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";

import { Wordmark } from "@/components/brand/wordmark";
import { OFFICIAL_LINKS } from "@/lib/sources";

function shortName(label: string) {
  return label.split(": ")[0];
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-ink-950">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Wordmark />
          <p className="max-w-sm text-sm text-fg-3">
            An independent service. Not affiliated with the IEPF Authority, the Ministry of
            Corporate Affairs, SEBI, RBI or EPFO. We do not give legal, tax or investment advice.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-medium tracking-normal text-fg [font-stretch:100%]">
            Free official routes
          </h2>
          <ul className="mt-4 space-y-2.5">
            {[
              OFFICIAL_LINKS.iepfSearch,
              OFFICIAL_LINKS.mcaIepf5,
              OFFICIAL_LINKS.udgam,
              OFFICIAL_LINKS.epfo,
            ].map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-sm text-fg-2 transition-colors duration-150 hover:text-fg"
                >
                  {shortName(l.label)}
                  <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-medium tracking-normal text-fg [font-stretch:100%]">
            If something feels wrong
          </h2>
          <p className="mt-4 text-sm text-fg-2">
            Report fraud at{" "}
            <a
              href={OFFICIAL_LINKS.cybercrime.href}
              rel="noopener noreferrer"
              target="_blank"
              className="link"
            >
              cybercrime.gov.in<span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            or call <span className="tnum font-semibold text-fg">1930</span>.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <li>
              <Link href="/check" className="link text-fg-2">
                Guided check
              </Link>
            </li>
            <li>
              <Link href="/cases" className="link text-fg-2">
                Sample cases
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-[1200px] px-4 py-5 text-sm text-fg-3 sm:px-6">
          Product demo, September 2026. All cases shown are fictional.
        </p>
      </div>
    </footer>
  );
}
