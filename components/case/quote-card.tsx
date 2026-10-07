import { CheckIcon, InfoIcon } from "@phosphor-icons/react/dist/ssr";

import type { Quote } from "@/lib/types";
import { formatBps, formatDate, formatPaise, shareOfPaise } from "@/lib/format";
import { PROTECTION_STATUS_NOTE } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";

const STATUS: Record<
  Quote["status"],
  { label: string; variant: "neutral" | "progress" | "confirmed" }
> = {
  not_shared: { label: "Not shared yet", variant: "neutral" },
  shared: { label: "Shared, awaiting your acceptance", variant: "progress" },
  accepted: { label: "Accepted", variant: "confirmed" },
};

function optInText(optIn: boolean | null): string {
  if (optIn === null) return "You haven't chosen yet. Nothing is set aside unless you say yes.";
  return optIn
    ? "You said yes, if a suitable policy becomes available."
    : "You opted out. This 10% stays with you.";
}

export function QuoteCard({ quote }: { quote: Quote }) {
  const s = STATUS[quote.status];
  const value = quote.indicativeValuePaise;
  const fee = value !== null ? shareOfPaise(value, quote.successFeeBps) : null;
  const protection = value !== null ? shareOfPaise(value, quote.protectionAllocationBps) : null;

  return (
    <section aria-labelledby="quote-heading" className="panel p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="quote-heading" className="text-xl text-fg">
          Your quote
        </h2>
        <Badge variant={s.variant}>
          {quote.status === "accepted" && <CheckIcon weight="bold" aria-hidden="true" />}
          {s.label}
        </Badge>
      </div>
      {quote.status === "accepted" && quote.acceptedAt && (
        <p className="tnum mt-1 text-sm text-fg-3">Accepted on {formatDate(quote.acceptedAt)}</p>
      )}
      {quote.status === "shared" && quote.sharedAt && (
        <p className="tnum mt-1 text-sm text-fg-3">Shared on {formatDate(quote.sharedAt)}</p>
      )}

      <div className="mt-6 border-t border-line pt-6">
        <p className="text-sm text-fg-3">Indicative value</p>
        {value !== null ? (
          <>
            <p className="display tnum mt-1 text-[2.5rem] text-fg">{formatPaise(value)}</p>
            <p className="mt-2 text-sm text-fg-3">{quote.indicativeValueBasis}</p>
          </>
        ) : (
          <>
            <p className="mt-1 text-2xl font-[560] tracking-[-0.02em] text-fg [font-stretch:106%]">
              Not estimated yet
            </p>
            <p className="mt-2 text-base text-fg-2">
              We don&apos;t yet know how many shares or how much in dividends. We won&apos;t put a
              number here until a document shows it.
            </p>
          </>
        )}
        {quote.excludedFromEstimate.length > 0 && (
          <ul className="mt-4 space-y-1 rounded-[var(--radius-control)] bg-ink-900 p-3">
            {quote.excludedFromEstimate.map((x) => (
              <li key={x} className="text-sm text-fg-2">
                <span className="font-semibold text-fg">Left out: </span>
                {x}
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="mt-6 border-t border-line">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-5">
          <dt className="font-semibold text-fg">
            Success fee, <span className="tnum">{formatBps(quote.successFeeBps)}</span>
          </dt>
          <dd className="tnum text-right font-semibold text-fg">
            {fee !== null ? `≈ ${formatPaise(fee)}` : "Not yet"}
          </dd>
          <dd className="col-span-2 text-base text-fg-2">
            Of the value actually credited to you. Paid only after credit, plus GST.
          </dd>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-[var(--radius-control)] border border-dashed border-control/70 p-4">
          <dt className="flex flex-wrap items-center gap-2 font-semibold text-fg">
            <span>
              Protection allocation,{" "}
              <span className="tnum">{formatBps(quote.protectionAllocationBps)}</span>
            </span>
            <Badge variant="outline">Planned</Badge>
          </dt>
          <dd className="tnum text-right font-semibold text-fg-2">
            {protection !== null ? `≈ ${formatPaise(protection)}` : "Not yet"}
          </dd>
          <dd className="col-span-2 text-base text-fg-2">
            Set aside toward a life or health insurance policy in your name, subject to licensed
            partner availability, your choice and policy issuance.
          </dd>
          <dd className="col-span-2 text-sm text-fg">
            <span className="font-semibold">Your choice: </span>
            {optInText(quote.protectionOptIn)}
          </dd>
          <dd className="col-span-2 flex items-start gap-2 text-sm text-fg-3">
            <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {PROTECTION_STATUS_NOTE}
          </dd>
        </div>
      </dl>

      <details className="group mt-5">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-fg underline decoration-fg/30 underline-offset-[0.22em] hover:decoration-signal">
          <span className="group-open:hidden">Read all conditions</span>
          <span className="hidden group-open:inline">Hide conditions</span>
        </summary>
        <div className="mt-3 animate-arrive space-y-3">
          <p className="text-base text-fg-2">
            <span className="font-semibold text-fg">How value is fixed: </span>
            {quote.valuationRule}
          </p>
          <ul className="space-y-2 text-base text-fg-2">
            {quote.conditions.map((c) => (
              <li key={c} className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.7em] h-px w-3 shrink-0 bg-control" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </details>
      <p className="mt-4 text-sm text-fg-3">
        Figures marked ≈ are indicative. The final fee is worked out on the credit date, and you see
        the calculation before any invoice.
      </p>
    </section>
  );
}
