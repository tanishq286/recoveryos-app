"use client";

import * as React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckIcon, InfoIcon, LoaderCircleIcon, SearchIcon } from "lucide-react";
import {
  CALCULATOR_SITUATIONS,
  DOC_TYPE_LABELS,
  documentChecklist,
  entitlementRangeForDecade,
  holdingValuePaise,
  netRealization,
  pctToBps,
  SCENARIO_LABELS,
  SCENARIO_TIMELINE_MONTHS,
  sevenYearsBefore,
  type CalculatorSituation,
  type EntitlementResult,
} from "@recoveryos/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { callApi } from "@/lib/api/client";
import type { CompanyDetail } from "@/lib/api/types";
import { formatCount, formatDateTime, formatPaise, formatPaiseCompact } from "@/lib/format";

const DECADES = [1970, 1980, 1990, 2000, 2010];
const TODAY = new Date().toISOString().slice(0, 10);

function growthSeries(result: EntitlementResult, decade: number) {
  const points = [{ year: decade, shares: result.steps[0]?.sharesBefore ?? 0 }];
  for (const s of result.steps) {
    if (s.action.actionType === "DIVIDEND") continue;
    points.push({ year: Number(s.action.exDate.slice(0, 4)), shares: s.sharesAfter });
  }
  points.push({ year: Number(TODAY.slice(0, 4)), shares: result.shares });
  return points;
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-fg-3">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-fg tnum [font-stretch:104%]">{value}</dd>
      {note && <dd className="mt-0.5 text-sm text-fg-3">{note}</dd>}
    </div>
  );
}

/**
 * Corporate action and fee calculator. Everything is computed in the
 * browser with the same rules the API uses (packages/shared): bonuses and
 * splits since the purchase decade, dividends from the last seven years, our
 * fee and GST, the indicative timeline and the document checklist.
 */
export function Calculator({
  companies,
  initial,
}: {
  companies: { slug: string; name: string }[];
  initial: CompanyDetail | null;
}) {
  const [company, setCompany] = React.useState<CompanyDetail | null>(initial);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [decade, setDecade] = React.useState(1990);
  const [shares, setShares] = React.useState("100");
  const [situation, setSituation] = React.useState<CalculatorSituation>("ALIVE_WITH_CERTS");
  const [feePct, setFeePct] = React.useState(10);

  async function pick(slug: string) {
    setLoading(true);
    setError(null);
    try {
      setCompany(await callApi<CompanyDetail>(`companies/${slug}`));
      const url = new URL(window.location.href);
      url.searchParams.set("company", slug);
      window.history.replaceState(null, "", url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const original = Math.max(0, Math.min(10_000_000, Math.floor(Number(shares) || 0)));
  const sit = CALCULATOR_SITUATIONS.find((s) => s.key === situation)!;
  const range = company
    ? entitlementRangeForDecade(original, decade, company.corporateActions, {
        dividendsFrom: sevenYearsBefore(TODAY),
      })
    : null;
  const price = company?.currentMarketPrice ?? null;
  const cash = (r: { dividendPaise: number; cashPaise: number }) => r.dividendPaise + r.cashPaise;
  const lowGross = range ? holdingValuePaise(range.low.shares, price ?? 0) + cash(range.low) : 0;
  const highGross = range
    ? holdingValuePaise(range.high.shares, price ?? 0) + cash(range.high)
    : 0;
  const lowNet = netRealization(lowGross, pctToBps(feePct));
  const highNet = netRealization(highGross, pctToBps(feePct));
  const checklist = documentChecklist({ scenario: sit.scenario, certStatus: sit.certStatus });
  const [tMin, tMax] = SCENARIO_TIMELINE_MONTHS[sit.scenario];
  const series = range ? growthSeries(range.high, decade) : [];
  const same = range && range.low.shares === range.high.shares;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form
        className="panel grid min-w-0 grid-cols-1 content-start gap-5 self-start p-5 sm:p-6 lg:sticky lg:top-24"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Your holding"
      >
        <div>
          <label htmlFor="c-company" className="mb-1.5 block text-sm text-fg-2">
            Company
          </label>
          <Select
            id="c-company"
            value={company?.slug ?? ""}
            onChange={(e) => e.target.value && pick(e.target.value)}
          >
            <option value="">Choose a company</option>
            {companies.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm text-fg-2">Bought in the</legend>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-3">
            {DECADES.map((d) => (
              <label key={d} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="decade"
                  value={d}
                  checked={decade === d}
                  onChange={() => setDecade(d)}
                  className="peer sr-only"
                />
                <span className="flex min-h-11 items-center justify-center rounded-[10px] border border-(--glass-border) bg-(--glass-elevated) text-sm text-fg-2 transition-colors peer-checked:border-signal peer-checked:bg-signal-wash peer-checked:text-fg peer-focus-visible:outline-2 peer-focus-visible:outline-signal tnum">
                  {d}s
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="c-shares" className="mb-1.5 block text-sm text-fg-2">
            Shares on the certificate
          </label>
          <Input
            id="c-shares"
            inputMode="numeric"
            value={shares}
            onChange={(e) => setShares(e.target.value.replace(/\D/g, ""))}
            className="tnum"
          />
        </div>
        <div>
          <label htmlFor="c-sit" className="mb-1.5 block text-sm text-fg-2">
            Situation
          </label>
          <Select
            id="c-sit"
            value={situation}
            onChange={(e) => setSituation(e.target.value as CalculatorSituation)}
          >
            {CALCULATOR_SITUATIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="c-fee" className="mb-1.5 flex justify-between text-sm text-fg-2">
            Success fee <span className="text-fg tnum">{feePct}%</span>
          </label>
          <input
            id="c-fee"
            type="range"
            min={5}
            max={20}
            step={0.5}
            value={feePct}
            onChange={(e) => setFeePct(Number(e.target.value))}
            className="w-full accent-(--color-signal)"
          />
          <p className="mt-1 text-sm text-fg-3">
            Ours is 10% of what is credited, nothing upfront.
          </p>
        </div>
      </form>

      <div className="grid min-w-0 grid-cols-1 content-start gap-6" aria-live="polite">
        {error && (
          <Alert variant="blocker" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading && (
          <p className="flex items-center gap-2 text-fg-2">
            <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" /> Loading the
            company&apos;s history…
          </p>
        )}
        {!company || !range ? (
          <div className="panel p-6 text-fg-2">
            Choose a company to see its bonus and split history applied to your shares.
          </div>
        ) : (
          <>
            <section aria-labelledby="calc-shares" className="panel p-5 sm:p-6">
              <h2 id="calc-shares" className="text-lg font-semibold text-fg">
                {formatCount(original)} {company.name} shares from the {decade}s
              </h2>
              <dl className="mt-4 grid gap-6 sm:grid-cols-3">
                <Figure
                  label="Shares today"
                  value={
                    same
                      ? formatCount(range.high.shares)
                      : `${formatCount(range.low.shares)} to ${formatCount(range.high.shares)}`
                  }
                  note={
                    same
                      ? "No actions inside the decade change it"
                      : "Depends on when in the decade they were bought"
                  }
                />
                <Figure
                  label="Value at today's price"
                  value={
                    price === null
                      ? "Price pending"
                      : same
                        ? formatPaiseCompact(highGross)
                        : `${formatPaiseCompact(lowGross)} to ${formatPaiseCompact(highGross)}`
                  }
                  note={
                    price !== null
                      ? `${formatPaise(Math.round(price * 100), { exact: true })} a share (${company.priceSource ?? "exchange feed"}${company.priceUpdatedAt ? `, ${formatDateTime(company.priceUpdatedAt)}` : ""}), with dividends`
                      : "Waiting for the first price from the exchange feed"
                  }
                />
                <Figure
                  label={range.high.cashPaise > 0 ? "Dividends (7 years) and cash" : "Dividends, last 7 years"}
                  value={formatPaiseCompact(cash(range.high))}
                  note={
                    range.high.cashPaise > 0
                      ? `Includes ${formatPaiseCompact(range.high.cashPaise)} of other cash entitlements`
                      : "Claimable with the shares if unpaid"
                  }
                />
              </dl>
              {series.length > 2 && (
                <figure className="mt-6">
                  <div className="h-56" aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        accessibilityLayer={false}
                        data={series}
                        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                      >
                        <CartesianGrid stroke="var(--color-line)" vertical={false} />
                        <XAxis
                          dataKey="year"
                          type="number"
                          domain={["dataMin", "dataMax"]}
                          allowDecimals={false}
                          stroke="var(--color-fg-3)"
                          tick={{ fill: "var(--color-fg-3)", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--color-fg-3)"
                          tick={{ fill: "var(--color-fg-3)", fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                          width={56}
                          tickFormatter={(v: number) => formatCount(v)}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--color-ink-850)",
                            border: "1px solid var(--color-line)",
                            borderRadius: 10,
                            color: "var(--color-fg)",
                          }}
                          formatter={(v) => [formatCount(Number(v)), "Shares"]}
                          labelFormatter={(l) => `Year ${l}`}
                        />
                        <Area
                          type="stepAfter"
                          dataKey="shares"
                          stroke="var(--color-chart-signal)"
                          strokeWidth={2}
                          fill="var(--color-chart-signal)"
                          fillOpacity={0.18}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <figcaption className="mt-2 text-sm text-fg-3">
                    Shares held since the start of the {decade}s, after each bonus or split:{" "}
                    {series.map((p) => `${p.year}: ${formatCount(p.shares)}`).join(", ")}.
                  </figcaption>
                </figure>
              )}
            </section>

            <section aria-labelledby="calc-net" className="panel p-5 sm:p-6">
              <h2 id="calc-net" className="text-lg font-semibold text-fg">
                What would reach you
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[26rem] text-left">
                  <thead className="text-sm text-fg-3">
                    <tr>
                      <th scope="col" className="pb-2 font-medium">
                        <span className="sr-only">Line</span>
                      </th>
                      <th scope="col" className="pb-2 text-right font-medium">
                        Bought late in the decade
                      </th>
                      <th scope="col" className="pb-2 text-right font-medium">
                        Bought early
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--glass-border) tnum">
                    {(
                      [
                        ["Estimated value", lowNet.grossPaise, highNet.grossPaise, ""],
                        [`Success fee (${feePct}%)`, lowNet.feePaise, highNet.feePaise, "− "],
                        ["GST on the fee (18%)", lowNet.gstPaise, highNet.gstPaise, "− "],
                      ] as const
                    ).map(([label, a, b, sign]) => (
                      <tr key={label}>
                        <th scope="row" className="py-2.5 font-normal text-fg-2">
                          {label}
                        </th>
                        <td className="py-2.5 text-right text-fg">
                          {sign}
                          {formatPaise(a)}
                        </td>
                        <td className="py-2.5 text-right text-fg">
                          {sign}
                          {formatPaise(b)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <th scope="row" className="py-2.5 font-semibold text-fg">
                        To you
                      </th>
                      <td className="py-2.5 text-right text-lg font-semibold text-confirmed">
                        {formatPaise(lowNet.netPaise)}
                      </td>
                      <td className="py-2.5 text-right text-lg font-semibold text-confirmed">
                        {formatPaise(highNet.netPaise)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-fg-3">
                Filing IEPF-5 yourself costs nothing in government fees. Our fee applies only if we
                do the work and value is credited.
              </p>
            </section>

            <section aria-labelledby="calc-docs" className="panel p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="calc-docs" className="text-lg font-semibold text-fg">
                  {SCENARIO_LABELS[sit.scenario]}
                </h2>
                <p className="text-sm text-fg-2 tnum">
                  About {tMin} to {tMax} months
                </p>
              </div>
              <ul className="mt-4 grid gap-3">
                {checklist.map((d) => (
                  <li key={d.docType} className="flex items-start gap-3">
                    <CheckIcon className="mt-1 size-4 shrink-0 text-confirmed" aria-hidden="true" />
                    <span>
                      <span className="text-fg">{DOC_TYPE_LABELS[d.docType]}</span>
                      {!d.beforeFiling && (
                        <span className="text-sm text-fg-3"> (after filing)</span>
                      )}
                      <span className="block text-sm text-fg-3">{d.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <Alert variant="info">
              <InfoIcon aria-hidden="true" />
              <AlertDescription className="text-sm">
                An estimate from {company.name}&apos;s recorded bonuses, splits and dividends and the
                latest exchange price, never a quote. The registrar confirms the real count, and value
                is fixed on the day shares are credited.
              </AlertDescription>
            </Alert>
            <div>
              <Button asChild size="lg">
                <Link href="/search">
                  <SearchIcon aria-hidden="true" />
                  Find the holding by name
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
