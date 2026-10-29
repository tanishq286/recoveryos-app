import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeftIcon,
  Building2Icon,
  ClockIcon,
  LandmarkIcon,
  ScrollTextIcon,
} from "lucide-react";
import { TRACK_LABELS, type TrackStatus } from "@recoveryos/shared";

import { DocumentVault } from "@/components/portal/document-vault";
import { EsignPanel } from "@/components/portal/esign-panel";
import { RecoverTracker } from "@/components/portal/recover-tracker";
import { StaffControls } from "@/components/portal/staff-controls";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { api } from "@/lib/api/server";
import { handleApiError, requireViewer } from "@/lib/api/guard";
import type { CaseDetail } from "@/lib/api/types";
import { formatCount, formatDateTime, formatPaise } from "@/lib/format";

export const metadata: Metadata = { title: "Case", robots: { index: false } };

const TRACK_TONE: Record<TrackStatus, StatusTone> = {
  NOT_STARTED: "neutral",
  REQUESTED: "pending",
  IN_PROGRESS: "pending",
  QUERY_RAISED: "error",
  DONE: "success",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-fg-3">{label}</dt>
      <dd className="text-right text-base text-fg">{children}</dd>
    </div>
  );
}

export default async function CasePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const path = `/portal/cases/${code}`;
  await requireViewer(path);
  let d: CaseDetail;
  try {
    d = await api<CaseDetail>(`cases/${encodeURIComponent(code)}`, { session: true });
  } catch (e) {
    handleApiError(e, path);
  }
  const current = d.steps.find((s) => s.state === "current");

  return (
    <div className="mx-auto max-w-[84rem] px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/portal"
        className="link inline-flex min-h-11 items-center gap-1.5 text-sm text-fg-2"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        All cases
      </Link>
      <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-fg-3 tnum">{d.caseCode}</p>
          <h1 className="display mt-1 text-[clamp(1.75rem,3.6vw,2.5rem)] text-fg">
            {d.companyName}
          </h1>
          <p className="mt-1 text-fg-2">
            {d.scenarioLabel} · {d.client.name}
            {d.associate ? ` · referred by ${d.associate.firmName}` : ""}
          </p>
        </div>
        <StatusBadge tone={current ? "active" : "success"} live={false}>
          {current ? `Step ${current.step} of 7: ${current.name}` : "Credited"}
        </StatusBadge>
      </header>

      <div className="panel mt-8 p-5 sm:p-6">
        <RecoverTracker steps={d.steps} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          {d.viewerRole === "staff" && <StaffControls detail={d} />}
          <EsignPanel detail={d} />
          <DocumentVault detail={d} />
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <section aria-labelledby="track-heading" className="panel p-5 sm:p-6">
            <h2
              id="track-heading"
              className="flex items-center gap-2 text-lg font-semibold text-fg"
            >
              <ScrollTextIcon className="size-5 text-iepf" aria-hidden="true" />
              Filing and verification
            </h2>
            <dl className="mt-3 divide-y divide-(--glass-border)">
              <Row label="IEPF-5 SRN">
                {d.tracking.mcaIepf5Srn ? (
                  <span className="font-mono tnum">{d.tracking.mcaIepf5Srn}</span>
                ) : (
                  <span className="text-fg-3">Not filed yet</span>
                )}
              </Row>
              {(
                [
                  ["Registrar entitlement", d.tracking.rtaEntitlementStatus],
                  ["Nodal officer verification", d.tracking.nodalVerificationStatus],
                  ["Demat credit", d.tracking.dematCreditStatus],
                ] as const
              ).map(([label, status]) => (
                <Row key={label} label={label}>
                  <StatusBadge tone={TRACK_TONE[status]} live={status === "IN_PROGRESS"}>
                    {TRACK_LABELS[status]}
                  </StatusBadge>
                </Row>
              ))}
            </dl>
            <p className="mt-3 text-sm text-fg-3">
              Indicative time for this route: {d.timelineMonths[0]} to {d.timelineMonths[1]} months
              after signing. The IEPF Authority sets the pace; nobody can promise a date.
            </p>
          </section>

          {d.holding && (
            <section aria-labelledby="holding-heading" className="panel p-5 sm:p-6">
              <h2
                id="holding-heading"
                className="flex items-center gap-2 text-lg font-semibold text-fg"
              >
                <LandmarkIcon className="size-5 text-signal" aria-hidden="true" />
                The holding
              </h2>
              <dl className="mt-3 divide-y divide-(--glass-border)">
                <Row label="Holder">{d.holding.holderName}</Row>
                <Row label="Folio">
                  <span className="font-mono tnum">{d.holding.folioNumber}</span>
                </Row>
                {d.holding.certificateNumbers && (
                  <Row label="Certificates">
                    <span className="font-mono tnum">{d.holding.certificateNumbers}</span>
                  </Row>
                )}
                <Row label="Shares bought → today">
                  <span className="tnum">
                    {formatCount(d.holding.originalShares)} →{" "}
                    {formatCount(d.holding.postActionShares)}
                  </span>
                </Row>
                <Row label="Unclaimed dividends">
                  <span className="tnum">{formatPaise(d.holding.unclaimedDividendPaise)}</span>
                </Row>
                <Row label="Where it is">{d.holding.custodyLabel}</Row>
              </dl>
            </section>
          )}

          <section aria-labelledby="money-heading" className="panel p-5 sm:p-6">
            <h2 id="money-heading" className="text-lg font-semibold text-fg">
              {d.money.basis === "credited" ? "What reached you" : "What could reach you"}
            </h2>
            <dl className="mt-3 divide-y divide-(--glass-border)">
              <Row label={d.money.basis === "credited" ? "Value credited" : "Estimated value"}>
                <span className="tnum">{formatPaise(d.money.grossPaise)}</span>
              </Row>
              <Row label={`Our fee (${d.money.feePct}%)`}>
                <span className="tnum">− {formatPaise(d.money.feePaise)}</span>
              </Row>
              <Row label="GST on our fee (18%)">
                <span className="tnum">− {formatPaise(d.money.gstPaise)}</span>
              </Row>
              <Row label="To you">
                <span className="tnum text-lg font-semibold text-confirmed">
                  {formatPaise(d.money.netPaise)}
                </span>
              </Row>
            </dl>
            {d.money.basis === "estimate" && (
              <p className="mt-3 text-sm text-fg-3">
                {d.money.sharePricePaise !== null ? (
                  <>
                    An estimate at {formatPaise(d.money.sharePricePaise, { exact: true })} a share (
                    {d.money.priceSource}
                    {d.money.priceUpdatedAt ? `, ${formatDateTime(d.money.priceUpdatedAt)}` : ""}).
                  </>
                ) : (
                  "Shares are not valued yet: the exchange price has not synced."
                )}{" "}
                The fee is worked out on the closing price on the day of credit.
              </p>
            )}
          </section>

          <section aria-labelledby="rta-heading" className="panel p-5 sm:p-6">
            <h2 id="rta-heading" className="flex items-center gap-2 text-lg font-semibold text-fg">
              <Building2Icon className="size-5 text-signal" aria-hidden="true" />
              Registrar and nodal officer
            </h2>
            <p className="mt-3 font-medium text-fg">{d.company.rtaLabel}</p>
            {d.company.rtaAddress && (
              <p className="mt-1 text-sm text-fg-2">{d.company.rtaAddress}</p>
            )}
            <p className="mt-3 text-sm text-fg-2">
              Nodal officer:{" "}
              {d.company.nodalOfficerName ? (
                <>
                  {d.company.nodalOfficerName}
                  {d.company.nodalOfficerEmail ? ` (${d.company.nodalOfficerEmail})` : ""}
                </>
              ) : (
                <span className="text-fg-3">
                  confirmed by your case team from the company&apos;s IEPF page
                </span>
              )}
            </p>
            <Link
              href={`/unclaimed-shares/${d.company.slug}`}
              className="link mt-3 inline-block text-sm"
            >
              Company guide
            </Link>
          </section>

          <section aria-labelledby="activity-heading" className="panel p-5 sm:p-6">
            <h2
              id="activity-heading"
              className="flex items-center gap-2 text-lg font-semibold text-fg"
            >
              <ClockIcon className="size-5 text-signal" aria-hidden="true" />
              Activity
            </h2>
            <ol className="mt-4 grid gap-4">
              {[...d.events].reverse().map((e) => (
                <li key={e.id} className="relative border-l border-(--glass-border) pl-4">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[3px] size-1.5 rounded-full bg-signal"
                  />
                  <p className="text-base text-fg">{e.message}</p>
                  <p className="mt-0.5 text-sm text-fg-3 tnum">
                    {formatDateTime(e.createdAt)}
                    {e.actorName ? ` · ${e.actorName}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
