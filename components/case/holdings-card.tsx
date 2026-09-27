import type { Asset } from "@/lib/types";
import { formatCount, formatDate, formatPaise } from "@/lib/format";

function Unknown({ children }: { children: React.ReactNode }) {
  return <span className="text-slate italic">{children}</span>;
}

export function HoldingsCard({ assets }: { assets: Asset[] }) {
  return (
    <section
      aria-labelledby="holdings-heading"
      className="rounded-lg border border-line bg-pearl p-5 sm:p-6"
    >
      <h2 id="holdings-heading" className="font-display text-xl font-medium text-ink">
        What we are recovering
      </h2>
      {assets.length === 0 ? (
        <p className="mt-3 text-base text-slate">No holdings recorded yet.</p>
      ) : (
        assets.map((a) => (
          <div key={a.id} className="mt-4">
            <h3 className="font-sans text-base font-semibold text-ink">{a.issuerName}</h3>
            <dl className="mt-2 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-2 text-base">
              <dt className="text-slate">Shares</dt>
              <dd className="tnum text-ink">
                {a.shareQuantity !== null ? (
                  formatCount(a.shareQuantity)
                ) : (
                  <Unknown>Not known yet</Unknown>
                )}
              </dd>
              <dt className="text-slate">Dividends</dt>
              <dd className="tnum text-ink">
                {a.dividendAmountPaise !== null ? (
                  formatPaise(a.dividendAmountPaise)
                ) : (
                  <Unknown>Not confirmed yet</Unknown>
                )}
                {a.financialYears.length > 0 && (
                  <span className="block text-sm text-slate">
                    FY {a.financialYears[0]} to {a.financialYears[a.financialYears.length - 1]}
                  </span>
                )}
              </dd>
              <dt className="text-slate">Folio</dt>
              <dd className="tnum font-mono text-ink">
                {a.folioNumber ?? <Unknown>Not known yet</Unknown>}
              </dd>
              <dt className="text-slate">Registrar</dt>
              <dd className="text-ink">{a.rtaName ?? <Unknown>Not known yet</Unknown>}</dd>
              <dt className="text-slate">Moved to IEPF</dt>
              <dd className="tnum text-ink">
                {a.transferredToIepfOn ? (
                  formatDate(a.transferredToIepfOn)
                ) : (
                  <Unknown>Not confirmed</Unknown>
                )}
              </dd>
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-sm text-slate">
              <span className="font-semibold text-ink">Where these come from: </span>
              {a.sourceNote}
            </p>
          </div>
        ))
      )}
    </section>
  );
}
