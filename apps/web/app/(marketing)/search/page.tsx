import type { Metadata } from "next";
import { InfoIcon, SearchXIcon } from "lucide-react";
import {
  BRAND,
  ALL_INDIA,
  BRAND_EMAILS,
  isIndianState,
  STATE_LABELS,
  type SearchResponse,
  type SearchScope,
} from "@finsol/shared";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LiveRefresh } from "@/components/search/live-refresh";
import { SearchResults } from "@/components/search/search-results";
import { UnclaimedSearchForm } from "@/components/search/unclaimed-search-form";
import { api, ApiError } from "@/lib/api/server";

export const metadata: Metadata = {
  title: "3-Minute Check for unclaimed shares",
  description:
    "Check for unclaimed shares and dividends with just a name and a state. Free, confidential, no folio number needed.",
  // Results name private individuals; keep them out of search engines.
  robots: { index: false, follow: true },
};

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  // `name` is the 3-Minute Check; first/last names still work for links shared earlier.
  const name =
    one(p.name) || [one(p.firstName), one(p.middleName), one(p.lastName)].filter(Boolean).join(" ");
  const joint = one(p.joint);
  const stateRaw = one(p.state);
  const state: SearchScope | "" =
    stateRaw === ALL_INDIA ? ALL_INDIA : isIndianState(stateRaw) ? stateRaw : "";
  const ref = one(p.ref) || undefined;
  const asked = name.length > 0;

  let data: SearchResponse | null = null;
  let error: string | null = null;
  if (asked && state) {
    const qs = new URLSearchParams({ state, fullName: name });
    if (joint) qs.set("jointHolderName", joint);
    try {
      data = await api<SearchResponse>(`search/unclaimed?${qs}`, { session: true });
    } catch (e) {
      error =
        e instanceof ApiError && e.status < 500
          ? e.message
          : "The check is not available right now. Please try again in a few minutes.";
    }
  } else if (asked && !state) {
    error = "Choose the state on the investor's last known address.";
  }

  const who = [name, joint].filter(Boolean).join(" or ");
  const where = !data
    ? ""
    : data.query.state === ALL_INDIA
      ? "all of India"
      : data.query.state === "OUT_OF_INDIA"
        ? "Out of India / NRI"
        : STATE_LABELS[data.query.state];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display max-w-[20ch] text-[clamp(2rem,4vw,3rem)] text-fg">
        Start your 3-Minute Check
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg text-fg-2">
        Just a name and a state. {BRAND.promise.join(" • ")}.
      </p>
      <UnclaimedSearchForm
        className="mt-8 max-w-[56rem]"
        defaults={{ name, jointHolder: joint, state }}
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
              Nothing found yet for {who} in {where}
            </h2>
            <p className="max-w-[60ch] text-fg-2">
              Try the surname alone, or the state of an older address. Our analysts can also run a
              deeper trace across more companies at no cost.
            </p>
            {data.liveRefreshId && <LiveRefresh id={data.liveRefreshId} />}
            <Button asChild variant="outline">
              <a
                href={`mailto:${BRAND_EMAILS.claims}?subject=${encodeURIComponent(`Free trace request: ${who}, ${where}`)}`}
              >
                Ask for a free deeper trace
              </a>
            </Button>
          </div>
        )}

        {data && data.total > 0 && (
          <>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2 className="text-xl font-semibold text-fg">
                <span className="tnum">{data.total}</span> {data.total === 1 ? "record" : "records"}{" "}
                for {who} in {where}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {data.liveRefreshId && <LiveRefresh id={data.liveRefreshId} />}
                <p className="text-sm text-fg-3 tnum">Checked in {data.tookMs} ms</p>
              </div>
            </div>
            <SearchResults results={data.results} access={data.access} referralCode={ref} />
            {data.access !== "public" && (
              <Alert variant="info" className="mt-8">
                <InfoIcon aria-hidden="true" />
                <AlertTitle>How the estimate is worked out</AlertTitle>
                <AlertDescription>{data.valuationBasis}</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </section>
    </div>
  );
}
