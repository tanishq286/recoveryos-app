import type { Metadata } from "next";
import { ArrowUpRightIcon, InfoIcon, SearchXIcon } from "lucide-react";
import {
  isIndianState,
  STATE_LABELS,
  type IndianState,
  type SearchResponse,
} from "@recoveryos/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SearchResults } from "@/components/search/search-results";
import { UnclaimedSearchForm } from "@/components/search/unclaimed-search-form";
import { api, ApiError } from "@/lib/api/server";
import { OFFICIAL_LINKS } from "@/lib/sources";

export const metadata: Metadata = {
  title: "Search unclaimed shares by name",
  description:
    "Search IEPF and unclaimed share records by the holder's name and state. Free, with spelling variants matched.",
  // Results name private individuals; keep them out of search engines.
  robots: { index: false, follow: true },
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const firstName = one(p.firstName);
  const middleName = one(p.middleName);
  const lastName = one(p.lastName);
  const stateRaw = one(p.state);
  const state: IndianState | "" = isIndianState(stateRaw) ? stateRaw : "";
  const ref = one(p.ref) || undefined;
  const asked = !!(firstName || middleName || lastName);

  let data: SearchResponse | null = null;
  let error: string | null = null;
  if (asked && state) {
    const qs = new URLSearchParams({ state });
    if (firstName) qs.set("firstName", firstName);
    if (middleName) qs.set("middleName", middleName);
    if (lastName) qs.set("lastName", lastName);
    try {
      data = await api<SearchResponse>(`search/unclaimed?${qs}`, { unlock: true });
    } catch (e) {
      error =
        e instanceof ApiError && e.status < 500
          ? e.message
          : "Search is not available right now. Please try again in a few minutes.";
    }
  } else if (asked && !state) {
    error = "Choose the state on the holder's last known address.";
  }

  const who = [firstName, middleName, lastName].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display max-w-[20ch] text-[clamp(2rem,4vw,3rem)] text-fg">
        Search unclaimed shares by name
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg text-fg-2">
        Records from companies&apos; IEPF-2 and IEPF-4 statements. Search is free; the company and
        folio unlock once you verify your phone.
      </p>
      <UnclaimedSearchForm
        className="mt-8 max-w-[56rem]"
        defaults={{ firstName, middleName, lastName, state }}
      />

      <section aria-live="polite" aria-label="Results" className="mt-12">
        {error && (
          <Alert variant="pending" role="alert">
            <InfoIcon aria-hidden="true" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data && data.total === 0 && (
          <div className="panel flex flex-col items-start gap-3 p-6">
            <SearchXIcon className="size-6 text-fg-3" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-fg">
              No records for {who} in {STATE_LABELS[data.query.state]}
            </h2>
            <p className="max-w-[60ch] text-fg-2">
              Try only the surname, an initial for the middle name, or the state of an older
              address. Our records cover the filings we have imported; the IEPF Authority&apos;s own
              search covers every company.
            </p>
            <a
              href={OFFICIAL_LINKS.iepfSearch.href}
              target="_blank"
              rel="noopener noreferrer"
              className="link inline-flex items-center gap-1 font-medium"
            >
              Search on iepf.gov.in
              <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        )}

        {data && data.total > 0 && (
          <>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 className="text-xl font-semibold text-fg">
                <span className="tnum">{data.total}</span> {data.total === 1 ? "record" : "records"}{" "}
                for {who} in {STATE_LABELS[data.query.state]}
              </h2>
              <p className="text-sm text-fg-3 tnum">Searched in {data.tookMs} ms</p>
            </div>
            <SearchResults results={data.results} referralCode={ref} />
            <Alert variant="info" className="mt-8">
              <InfoIcon aria-hidden="true" />
              <AlertTitle>How the estimate is worked out</AlertTitle>
              <AlertDescription>{data.valuationBasis}</AlertDescription>
            </Alert>
          </>
        )}
      </section>
    </div>
  );
}
