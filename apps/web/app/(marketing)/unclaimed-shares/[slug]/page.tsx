import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  Building2Icon,
  CalculatorIcon,
  MailIcon,
  PhoneIcon,
  SearchIcon,
  TrendingUpIcon,
  UserRoundCheckIcon,
} from "lucide-react";
import { computeEntitlement, CUSTODY_LABELS, holdingValuePaise } from "@recoveryos/shared";

import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { getCompany, listCompanies } from "@/lib/companies";
import { formatCount, formatDate, formatDateTime, formatPaise } from "@/lib/format";
import { OFFICIAL_LINKS } from "@/lib/sources";
import { SITE_URL } from "@/lib/site";

// Matches the API's 15-minute price sync.
export const revalidate = 900;

export async function generateStaticParams() {
  return (await listCompanies()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getCompany((await params).slug);
  if (!c) return {};
  return {
    title: `Unclaimed ${c.name} shares: IEPF claim, nodal officer and registrar`,
    description: `Recover ${c.name} shares and dividends from the IEPF: IEPF nodal officer ${c.nodalOfficer.name}, registrar ${c.rta.label}, bonus and split history, live share price and the IEPF-5 steps.`,
    alternates: { canonical: `/unclaimed-shares/${c.slug}` },
  };
}

const EXAMPLE_YEAR = 1995;
const EXAMPLE_SHARES = 100;

function ratioText(a: { actionType: string; ratioFrom: number | null; ratioTo: number | null; dividendPerShare: number | null }) {
  if (a.actionType === "CASH_ENTITLEMENT") return `₹${a.dividendPerShare} cash per equity share`;
  if (a.ratioFrom === null || a.ratioTo === null) return "";
  if (a.actionType === "SPLIT") return `Face value ₹${a.ratioFrom} to ₹${a.ratioTo}`;
  return `${a.ratioTo} new for every ${a.ratioFrom} held`;
}

const ACTION_LABEL: Record<string, string> = {
  BONUS: "Bonus issue",
  SPLIT: "Stock split",
  MERGER: "Merger",
  CASH_ENTITLEMENT: "Cash entitlement",
};

function ContactLines({ emails, phone, address }: { emails: string[]; phone: string | null; address: string | null }) {
  return (
    <ul className="mt-2 grid gap-1.5 text-sm">
      {emails.map((e) => (
        <li key={e}>
          <a href={`mailto:${e}`} className="link inline-flex items-center gap-1.5 break-all text-fg-2">
            <MailIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {e}
          </a>
        </li>
      ))}
      {phone &&
        phone.split("/").map((p) => {
          const label = p.trim();
          const digits = label.replace(/[^\d+]/g, "");
          return (
            <li key={label} className="inline-flex items-center gap-1.5 text-fg-2">
              <PhoneIcon className="size-3.5 shrink-0" aria-hidden="true" />
              {digits.length >= 8 ? (
                <a href={`tel:${digits}`} className="link tnum">
                  {label}
                </a>
              ) : (
                <span className="tnum">{label}</span>
              )}
            </li>
          );
        })}
      {address && <li className="text-fg-2">{address}</li>}
    </ul>
  );
}

export default async function CompanyGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await getCompany(slug);
  if (!c) notFound();

  const structural = c.corporateActions.filter((a) => a.actionType !== "DIVIDEND");
  const dividends = c.corporateActions.filter((a) => a.actionType === "DIVIDEND").slice(-7).reverse();
  const dividendSource = dividends[0]?.source;
  const example = computeEntitlement(
    EXAMPLE_SHARES,
    c.corporateActions.map((a) => ({ ...a })),
    { acquiredOn: `${EXAMPLE_YEAR}-01-01` },
  );
  const price = c.currentMarketPrice;
  const exampleValue = price !== null ? holdingValuePaise(example.shares, price) : null;
  const totalFolios = c.records.reduce((n, r) => n + r.folios, 0);

  const steps = [
    {
      name: "Confirm what moved, and when",
      text: `Write to ${c.rta.label}, ${c.name}'s registrar, for an entitlement letter listing the folio, the shares and dividends transferred to the IEPF and the transfer dates.`,
    },
    {
      name: "Gather the documents",
      text: "PAN, Aadhaar, a client master list of your own demat account, a cancelled cheque, Forms ISR-1 and ISR-2, the original certificates (or an FIR if lost), and succession papers if the holder has died.",
    },
    {
      name: "File Form IEPF-5 on the MCA portal",
      text: "Fill the e-form online with the entitlement details. There is no government filing fee. Note the SRN it generates.",
    },
    {
      name: `Send the signed pack to ${c.name}'s IEPF nodal officer`,
      text: `Print the e-form, sign it with the indemnity bond and advance receipt, and send them with the documents to ${c.nodalOfficer.name}${c.nodalOfficer.address ? `, ${c.nodalOfficer.address}` : ""}.`,
    },
    {
      name: "Company verification, then the IEPF Authority",
      text: "The company verifies the claim and sends its report to the IEPF Authority, which approves the refund. Shares are credited to your demat account and dividends to your bank account.",
    },
  ];

  return (
    <article className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: `How to recover unclaimed ${c.name} shares from the IEPF`,
          estimatedCost: { "@type": "MonetaryAmount", currency: "INR", value: "0" },
          step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Company guides", item: `${SITE_URL}/unclaimed-shares` },
            { "@type": "ListItem", position: 2, name: c.name, item: `${SITE_URL}/unclaimed-shares/${c.slug}` },
          ],
        }}
      />

      <nav aria-label="Breadcrumb" className="text-sm text-fg-3">
        <Link href="/unclaimed-shares" className="link text-fg-2">
          Company guides
        </Link>{" "}
        / {c.name}
      </nav>
      <h1 className="display mt-4 max-w-[22ch] text-[clamp(2rem,4.4vw,3.25rem)] text-fg">
        Recover unclaimed {c.name} shares and dividends
      </h1>
      <p className="mt-4 max-w-[62ch] text-lg text-fg-2">
        If dividends on {c.name} shares went unclaimed for seven years in a row, the company had to move the shares to the
        Investor Education and Protection Fund. They are still claimable, by the holder or their heirs, on Form IEPF-5.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/search">
            <SearchIcon aria-hidden="true" />
            Search by the holder&apos;s name
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={`/calculator?company=${c.slug}`}>
            <CalculatorIcon aria-hidden="true" />
            What are old shares worth today?
          </Link>
        </Button>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-10">
          <section aria-labelledby="nodal-heading" className="panel border-iepf/30 p-5 sm:p-6">
            <h2 id="nodal-heading" className="flex items-center gap-2 text-xl font-semibold text-fg">
              <UserRoundCheckIcon className="size-5 text-iepf" aria-hidden="true" />
              IEPF nodal officer
            </h2>
            <p className="mt-3 text-lg font-medium text-fg">{c.nodalOfficer.name}</p>
            <ContactLines emails={c.nodalOfficer.emails} phone={c.nodalOfficer.phone} address={c.nodalOfficer.address} />
            {c.nodalOfficer.deputies.length > 0 && (
              <div className="mt-4 border-t border-(--glass-border) pt-4">
                <h3 className="text-sm font-medium text-fg-3">Deputy nodal officers</h3>
                <ul className="mt-2 grid gap-1.5 text-sm">
                  {c.nodalOfficer.deputies.map((d) => (
                    <li key={d.name} className="text-fg-2">
                      <span className="text-fg">{d.name}</span>
                      {d.email && (
                        <>
                          {" · "}
                          <a href={`mailto:${d.email}`} className="link break-all">
                            {d.email}
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {c.contacts.verifiedAt && (
              <p className="mt-4 flex items-start gap-1.5 text-sm text-fg-3">
                <BadgeCheckIcon className="mt-0.5 size-4 shrink-0 text-confirmed" aria-hidden="true" />
                Verified {formatDate(c.contacts.verifiedAt)}
                {c.contacts.source ? ` · ${c.contacts.source}` : ""}
              </p>
            )}
          </section>

          <section aria-labelledby="example-heading" className="panel p-5 sm:p-6">
            <h2 id="example-heading" className="text-xl font-semibold text-fg">
              {EXAMPLE_SHARES} shares bought in {EXAMPLE_YEAR}, today
            </h2>
            <p className="mt-3 text-fg-2">
              After the bonuses and splits below, {formatCount(EXAMPLE_SHARES)} shares held since {EXAMPLE_YEAR} would now be{" "}
              <strong className="text-fg tnum">{formatCount(example.shares)} shares</strong>
              {exampleValue !== null ? (
                <>
                  , worth about <strong className="text-fg tnum">{formatPaise(exampleValue)}</strong> at today&apos;s price
                </>
              ) : null}
              {example.cashPaise > 0 && (
                <>
                  , plus <strong className="text-fg tnum">{formatPaise(example.cashPaise)}</strong> in cash entitlements
                </>
              )}
              . The registrar&apos;s entitlement letter confirms the real figure.
            </p>
          </section>

          <section aria-labelledby="actions-heading">
            <h2 id="actions-heading" className="text-xl font-semibold text-fg">
              Bonus, split and cash history
            </h2>
            {structural.length === 0 ? (
              <p className="mt-3 text-fg-2">{c.name} has made no bonus issue or share split.</p>
            ) : (
              <div className="panel mt-4 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left">
                  <thead className="text-sm text-fg-3">
                    <tr className="border-b border-(--glass-border)">
                      <th scope="col" className="px-4 py-3 font-medium">Ex-date</th>
                      <th scope="col" className="px-4 py-3 font-medium">Action</th>
                      <th scope="col" className="px-4 py-3 font-medium">Terms</th>
                      <th scope="col" className="px-4 py-3 font-medium">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--glass-border)">
                    {structural.map((a) => (
                      <tr key={`${a.actionType}-${a.exDate}`} className="align-top">
                        <td className="px-4 py-3 text-fg-2 tnum">{formatDate(a.exDate)}</td>
                        <td className="px-4 py-3 text-fg">{ACTION_LABEL[a.actionType] ?? a.actionType}</td>
                        <td className="px-4 py-3 text-fg-2">
                          {ratioText(a)}
                          {a.notes && a.actionType !== "BONUS" && a.notes !== ratioText(a) && (
                            <span className="mt-1 block text-sm text-fg-3">{a.notes}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-fg-3">{a.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {dividends.length > 0 && (
              <p className="mt-4 text-sm text-fg-2">
                Recent dividends per share:{" "}
                {dividends.map((d, i) => (
                  <span key={d.exDate} className="tnum">
                    {i > 0 ? ", " : ""}₹{d.dividendPerShare} ({formatDate(d.exDate)})
                  </span>
                ))}
                .{dividendSource ? <span className="text-fg-3"> Source: {dividendSource}.</span> : null}
              </p>
            )}
          </section>

          <section aria-labelledby="steps-heading">
            <h2 id="steps-heading" className="text-xl font-semibold text-fg">
              How to claim {c.name} shares from the IEPF
            </h2>
            <ol className="mt-5 grid gap-5">
              {steps.map((s, i) => (
                <li key={s.name} className="grid grid-cols-[2.5rem_1fr] gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full border border-iepf/40 bg-iepf-wash font-semibold text-iepf tnum">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-fg">{s.name}</h3>
                    <p className="mt-1 text-fg-2">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-fg-2">
              You can do all of this yourself, free, on the{" "}
              <a href={OFFICIAL_LINKS.mcaIepf5.href} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                MCA portal
                <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              . If you would rather we prepare and track it, our fee is a share of what is actually credited, nothing upfront.
            </p>
          </section>
        </div>

        <aside className="grid min-w-0 grid-cols-1 content-start gap-6">
          <section aria-labelledby="price-heading" className="panel p-5 sm:p-6">
            <h2 id="price-heading" className="flex items-center gap-2 text-lg font-semibold text-fg">
              <TrendingUpIcon className="size-5 text-signal" aria-hidden="true" />
              Share price
            </h2>
            {price !== null ? (
              <>
                <p className="mt-2 text-3xl font-semibold text-fg tnum [font-stretch:104%]">
                  {formatPaise(Math.round(price * 100), { exact: true })}
                </p>
                <p className="mt-1 text-sm text-fg-3">
                  {c.priceSource}
                  {c.priceUpdatedAt ? ` · updated ${formatDateTime(c.priceUpdatedAt)}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-fg-2">Waiting for the first price from the exchange feed.</p>
            )}
          </section>

          <section aria-labelledby="facts-heading" className="panel p-5 sm:p-6">
            <h2 id="facts-heading" className="text-lg font-semibold text-fg">
              {c.name}
            </h2>
            <dl className="mt-3 grid gap-2 text-sm">
              {(
                [
                  ["Sector", c.sector],
                  ["NSE", c.tickerNse],
                  ["BSE", c.tickerBse],
                  ["ISIN", c.isin],
                  ["CIN", c.cin],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-fg-3">{k}</dt>
                    <dd className="text-right font-mono break-all text-fg tnum">{v}</dd>
                  </div>
                ))}
            </dl>
            {c.statutoryBasis && <p className="mt-3 text-sm text-fg-3">{c.statutoryBasis}.</p>}
          </section>

          <section aria-labelledby="rta-heading" className="panel p-5 sm:p-6">
            <h2 id="rta-heading" className="flex items-center gap-2 text-lg font-semibold text-fg">
              <Building2Icon className="size-5 text-signal" aria-hidden="true" />
              Registrar (RTA)
            </h2>
            <p className="mt-3 font-medium text-fg">{c.rta.label}</p>
            <ContactLines emails={c.rta.email ? [c.rta.email] : []} phone={c.rta.phone} address={c.rta.address} />
            {c.rta.website && (
              <a href={c.rta.website} target="_blank" rel="noopener noreferrer" className="link mt-3 inline-flex items-center gap-1 text-sm">
                Registrar&apos;s investor services
                <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </section>

          {totalFolios > 0 && (
            <section aria-labelledby="records-heading" className="panel p-5 sm:p-6">
              <h2 id="records-heading" className="text-lg font-semibold text-fg">
                From {c.name}&apos;s IEPF statements
              </h2>
              <ul className="mt-3 grid gap-2 text-sm">
                {c.records.map((r) => (
                  <li key={r.custodyStatus} className="flex justify-between gap-4">
                    <span className="text-fg-2">{CUSTODY_LABELS[r.custodyStatus]}</span>
                    <span className="text-fg tnum">{formatCount(r.folios)} holders</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/search">
                  Search them by name
                  <ArrowRightIcon aria-hidden="true" />
                </Link>
              </Button>
            </section>
          )}

          {c.irPageUrl && (
            <a href={c.irPageUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 text-sm">
              {c.name}&apos;s unclaimed dividend and IEPF page
              <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </aside>
      </div>
    </article>
  );
}
