import Link from "next/link";
import { MailIcon } from "lucide-react";
import { BRAND, BRAND_DESKS } from "@finsol/shared";

import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

/** `wide` matches the app shell's container (84rem); the default matches marketing pages. */
export function SiteFooter({ wide = false }: { wide?: boolean }) {
  const width = wide ? "max-w-[84rem]" : "max-w-[1200px]";
  return (
    <footer className="mt-auto border-t border-(--glass-border) bg-ink-950/60">
      <div
        className={cn(
          "mx-auto grid gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.3fr_1.2fr_1fr]",
          width,
        )}
      >
        <div className="space-y-4">
          <Wordmark />
          <p className="text-sm font-medium text-signal">{BRAND.promise.join(" • ")}</p>
          <p className="max-w-sm text-sm text-fg-3">
            An independent recovery firm, not a government body. We do not give legal, tax or
            investment advice.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-medium tracking-normal text-fg [font-stretch:100%]">
            Write to us
          </h2>
          <ul className="mt-4 space-y-2.5">
            {BRAND_DESKS.map((d) => (
              <li key={d.key} className="text-sm">
                <span className="block text-fg-3">{d.label}</span>
                <a
                  href={`mailto:${d.email}`}
                  className="link inline-flex items-center gap-1.5 break-all text-fg-2"
                >
                  <MailIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  {d.email}
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
            We never ask for a fee upfront or for any code over the phone. Report fraud at{" "}
            <a
              href="https://cybercrime.gov.in"
              rel="noopener noreferrer"
              target="_blank"
              className="link"
            >
              cybercrime.gov.in<span className="sr-only"> (opens in a new tab)</span>
            </a>{" "}
            or call <span className="tnum font-semibold text-fg">1930</span>.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {[
              ["/search", "3-Minute Check"],
              ["/services", "Services"],
              ["/calculator", "Calculator"],
              ["/unclaimed-shares", "Companies"],
              ["/partners", "Partners"],
              ["/login", "Client login"],
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="link text-fg-2">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-(--glass-border)">
        <p className={cn("mx-auto px-4 py-5 text-sm text-fg-3 sm:px-6", width)}>
          © {new Date().getFullYear()} {BRAND.name} · {BRAND.domain}
        </p>
      </div>
    </footer>
  );
}
