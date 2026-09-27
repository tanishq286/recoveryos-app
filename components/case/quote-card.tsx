import { Check, Info } from "lucide-react";

import type { Quote } from "@/lib/types";
import { formatBps, formatDate, formatPaise, shareOfPaise } from "@/lib/format";
import { PROTECTION_STATUS_NOTE } from "@/lib/pricing";
import { Badge } from "@/components/ui/badge";

const STATUS: Record<
  Quote["status"],
  { label: string; variant: "neutral" | "progress" | "confirmed" }
> = {
  not_shared: { label: "Not shared yet", variant: "neutral" },
  shared: { label: "Shared — awaiting your acceptance", variant: "progress" },
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
    <section
      aria-labelledby="quote-heading"
      className="rounded-lg border border-line bg-pearl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id="quote-heading" className="font-display text-xl font-medium text-ink">
          Your quote
        </h2>
        <Badge variant={s.variant}>
          {quote.status === "accepted" && <Check aria-hidden="true" />}
          {s.label}
        </Badge>
      </div>
      {quote.status === "accepted" && quote.acceptedAt && (
        <p className="tnum mt-1 text-sm text-slate">Accepted on {formatDate(quote.acceptedAt)}</p>
      )}
      {quote.status === "shared" && quote.sharedAt && (
        <p className="tnum mt-1 text-sm text-slate">Shared on {formatDate(quote.sharedAt)}</p>
      )}

      <div className="mt-5 rounded-md bg-mist p-4">
        <p className="eyebrow text-slate">Indicative value</p>
        {value !== null ? (
          <>
            <p className="tnum mt-1 font-display text-3xl font-medium text-ink">
              {formatPaise(value)}
            </p>
            <p className="mt-1 text-sm text-slate">{quote.indicativeValueBasis}</p>
          </>
        ) : (
          <>
            <p className="mt-1 font-display text-2xl font-medium text-ink">Not estimated yet</p>
            <p className="mt-1 text-base text-slate">
              We don&apos;t yet know how many shares or how much in dividends. We won&apos;t put a
              number here until a document shows it.
            </p>
          </>
        )}
        {quote.excludedFromEstimate.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-line pt-3">
            {quote.excludedFromEstimate.map((x) => (
              <li key={x} className="text-sm text-ink">
                <span className="font-semibold">Left out: </span>
                {x}
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="mt-5 divide-y divide-line border-y border-line">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-4">
          <dt className="font-semibold text-ink">
            Success fee · <span className="tnum">{formatBps(quote.successFeeBps)}</span>
          </dt>
          <dd className="tnum text-right font-semibold text-ink">
            {fee !== null ? `≈ ${formatPaise(fee)}` : "—"}
          </dd>
          <dd className="col-span-2 text-base text-ink/85">
            Of the value actually credited to you. Paid only after credit, plus GST.
          </dd>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-4">
          <dt className="font-semibold text-ink">
            Protection allocation ·{" "}
            <span className="tnum">{formatBps(quote.protectionAllocationBps)}</span>
            <Badge variant="outline" className="ml-2 align-middle">
              Planned
            </Badge>
          </dt>
          <dd className="tnum text-right font-semibold text-ink">
            {protection !== null ? `≈ ${formatPaise(protection)}` : "—"}
          </dd>
          <dd className="col-span-2 text-base text-ink/85">
            Set aside toward a life or health insurance policy in your name — subject to licensed
            partner availability, your choice and policy issuance.
          </dd>
          <dd className="col-span-2 mt-1 text-sm text-ink">
            <span className="font-semibold">Your choice: </span>
            {optInText(quote.protectionOptIn)}
          </dd>
          <dd className="col-span-2 flex items-start gap-2 text-sm text-slate">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {PROTECTION_STATUS_NOTE}
          </dd>
        </div>
      </dl>

      <details className="group mt-4">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
          <span className="group-open:hidden">Read all conditions</span>
          <span className="hidden group-open:inline">Hide conditions</span>
        </summary>
        <div className="mt-2 space-y-3">
          <p className="text-base text-ink">
            <span className="font-semibold">How value is fixed: </span>
            {quote.valuationRule}
          </p>
          <ul className="list-disc space-y-2 pl-5 text-base text-ink/90 marker:text-brass">
            {quote.conditions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </details>
      <p className="mt-3 text-sm text-slate">
        Figures marked ≈ are indicative. The final fee is worked out on the credit date, and you see
        the calculation before any invoice.
      </p>
    </section>
  );
}
