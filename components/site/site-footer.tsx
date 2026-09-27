import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { OFFICIAL_LINKS } from "@/lib/sources";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-ivory">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-4">
          <Wordmark />
          <p className="max-w-sm text-base text-slate">
            An independent service. Not affiliated with the IEPF Authority, the Ministry of
            Corporate Affairs, SEBI, RBI or EPFO. We do not give legal, tax or investment advice.
          </p>
        </div>
        <div>
          <h2 className="eyebrow text-slate">Free official routes</h2>
          <ul className="mt-3 space-y-2">
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
                  className="text-base text-ink underline decoration-ink/30 hover:decoration-ink"
                >
                  {l.label.split(" — ")[0]}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="eyebrow text-slate">If something feels wrong</h2>
          <p className="mt-3 text-base text-ink">
            Report fraud at{" "}
            <a
              href={OFFICIAL_LINKS.cybercrime.href}
              rel="noopener noreferrer"
              target="_blank"
              className="underline decoration-ink/30 hover:decoration-ink"
            >
              cybercrime.gov.in<span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            or call <span className="tnum font-semibold">1930</span>.
          </p>
          <p className="mt-4 text-sm text-slate">
            <Link href="/check" className="underline decoration-slate/40 hover:decoration-ink">
              Guided check
            </Link>{" "}
            ·{" "}
            <Link href="/cases" className="underline decoration-slate/40 hover:decoration-ink">
              Sample cases
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-4 text-sm text-slate sm:px-6">
          Product demo, September 2026. All cases shown are fictional.
        </p>
      </div>
    </footer>
  );
}
