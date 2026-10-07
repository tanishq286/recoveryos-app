import type { Asset } from "@/lib/types";
import { formatCount, formatDate, formatPaise } from "@/lib/format";

function Unknown({ children }: { children: React.ReactNode }) {
  return <span className="text-fg-3">{children}</span>;
}

export function HoldingsCard({ assets }: { assets: Asset[] }) {
  return (
    <section aria-labelledby="holdings-heading" className="panel p-5 sm:p-7">
      <h2 id="holdings-heading" className="text-xl text-fg">
        What we are recovering
      </h2>
      {assets.length === 0 ? (
        <p className="mt-4 text-base text-fg-2">No holdings recorded yet.</p>
      ) : (
        assets.map((a) => (
          <div key={a.id} className="mt-5">
            <h3 className="text-base font-semibold text-fg">{a.issuerName}</h3>
            <dl className="mt-3 grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-2.5 text-base">
              <dt className="text-fg-3">Shares</dt>
              <dd className="tnum text-fg">
                {a.shareQuantity !== null ? (
                  formatCount(a.shareQuantity)
                ) : (
                  <Unknown>Not known yet</Unknown>
                )}
              </dd>
              <dt className="text-fg-3">Dividends</dt>
              <dd className="tnum text-fg">
                {a.dividendAmountPaise !== null ? (
                  formatPaise(a.dividendAmountPaise)
                ) : (
                  <Unknown>Not confirmed yet</Unknown>
                )}
                {a.financialYears.length > 0 && (
                  <span className="block text-sm text-fg-3">
                    FY {a.financialYears[0]} to {a.financialYears[a.financialYears.length - 1]}
                  </span>
                )}
              </dd>
              <dt className="text-fg-3">Folio</dt>
              <dd className="tnum font-mono text-[0.9375rem] text-fg">
                {a.folioNumber ?? <Unknown>Not known yet</Unknown>}
              </dd>
              <dt className="text-fg-3">Registrar</dt>
              <dd className="text-fg">{a.rtaName ?? <Unknown>Not known yet</Unknown>}</dd>
              <dt className="text-fg-3">Moved to IEPF</dt>
              <dd className="tnum text-fg">
                {a.transferredToIepfOn ? (
                  formatDate(a.transferredToIepfOn)
                ) : (
                  <Unknown>Not confirmed</Unknown>
                )}
              </dd>
            </dl>
            <p className="mt-4 border-t border-line pt-4 text-sm text-fg-3">
              <span className="font-semibold text-fg-2">Where these come from: </span>
              {a.sourceNote}
            </p>
          </div>
        ))
      )}
    </section>
  );
}
