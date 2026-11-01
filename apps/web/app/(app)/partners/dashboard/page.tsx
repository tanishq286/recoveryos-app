import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheckIcon, ClockIcon, WalletIcon } from "lucide-react";
import { CRM_STAGE_LABELS } from "@recoveryos/shared";

import { LeadForm } from "@/components/partners/lead-form";
import { LedgerChart } from "@/components/partners/ledger-chart";
import { ReferralLink } from "@/components/partners/referral-link";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api/server";
import { handleApiError, requireViewer } from "@/lib/api/guard";
import type { AssociateDashboard } from "@/lib/api/types";
import { formatDate, formatPaise } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Partner desk", robots: { index: false } };

export default async function PartnerDashboard() {
  const viewer = await requireViewer("/partners/dashboard");
  if (viewer.role !== "ASSOCIATE_PARTNER") redirect("/partners/join");
  let d: AssociateDashboard;
  try {
    d = await api<AssociateDashboard>("associates/me", { session: true });
  } catch (e) {
    handleApiError(e, "/partners/dashboard");
  }
  const totals = [
    { label: "Accrued", value: d.totals.accruedPaise },
    { label: "Paid out", value: d.totals.paidPaise },
    { label: "Due to you", value: d.totals.balancePaise },
  ];
  return (
    <div className="mx-auto max-w-[84rem] px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(2rem,4vw,2.75rem)] text-fg">Partner desk</h1>
          <p className="mt-2 text-fg-2">
            {d.profile.firmName} · {d.profile.professionLabel} · {d.profile.city}
          </p>
        </div>
        <StatusBadge
          tone={d.profile.isVerified ? "success" : "pending"}
          live={!d.profile.isVerified}
        >
          {d.profile.isVerified ? "Verified, on the locator" : "Verification in progress"}
        </StatusBadge>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <section aria-labelledby="ledger-heading" className="panel p-5 sm:p-6">
            <h2
              id="ledger-heading"
              className="flex items-center gap-2 text-lg font-semibold text-fg"
            >
              <WalletIcon className="size-5 text-signal" aria-hidden="true" />
              Commission ledger
            </h2>
            <p className="mt-1 text-sm text-fg-2">
              {d.profile.revenueSharePct}% of our fee on each referred case, accrued on credit.
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              {totals.map((t) => (
                <div key={t.label}>
                  <dt className="text-sm text-fg-3">{t.label}</dt>
                  <dd className="mt-1 text-xl font-semibold text-fg tnum">
                    {formatPaise(t.value)}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-6">
              <LedgerChart monthly={d.monthly} />
            </div>
            {d.ledger.length === 0 ? (
              <p className="mt-4 text-fg-3">
                No entries yet. Commission appears here when a referred client&apos;s shares are
                credited.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="text-fg-3">
                    <tr className="border-b border-(--glass-border)">
                      <th scope="col" className="py-2 font-medium">
                        Date
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Entry
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Amount
                      </th>
                      <th scope="col" className="py-2 text-right font-medium">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--glass-border) tnum">
                    {d.ledger.map((e) => (
                      <tr key={e.id}>
                        <td className="py-2.5 text-fg-2">{formatDate(e.occurredAt)}</td>
                        <td className="py-2.5 text-fg">{e.description}</td>
                        <td
                          className={
                            e.amountPaise < 0
                              ? "py-2.5 text-right text-fg-2"
                              : "py-2.5 text-right text-confirmed"
                          }
                        >
                          {e.amountPaise < 0 ? "− " : "+ "}
                          {formatPaise(Math.abs(e.amountPaise))}
                        </td>
                        <td className="py-2.5 text-right text-fg">{formatPaise(e.balancePaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <LeadForm />
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <ReferralLink code={d.profile.referralCode} origin={SITE_URL} />
          <section aria-labelledby="leads-heading" className="panel p-5 sm:p-6">
            <h2
              id="leads-heading"
              className="flex items-center gap-2 text-lg font-semibold text-fg"
            >
              <ClockIcon className="size-5 text-signal" aria-hidden="true" />
              Your referrals
            </h2>
            {d.leads.length === 0 && d.cases.length === 0 ? (
              <p className="mt-3 text-fg-3">Nothing yet. Share your link or submit a client.</p>
            ) : (
              <ul className="mt-3 divide-y divide-(--glass-border)">
                {d.cases.map((c) => (
                  <li key={c.caseCode} className="flex items-start justify-between gap-3 py-3">
                    <div>
                      <Link href={`/portal/cases/${c.caseCode}`} className="link font-medium">
                        {c.clientName}
                      </Link>
                      <p className="text-sm text-fg-3">
                        <span className="font-mono">{c.caseCode}</span> · {c.companyName}
                      </p>
                    </div>
                    <StatusBadge
                      tone={c.dematCreditStatus === "DONE" ? "success" : "active"}
                      live={false}
                    >
                      {c.dematCreditStatus === "DONE" ? (
                        <>
                          <BadgeCheckIcon aria-hidden="true" /> Credited
                        </>
                      ) : (
                        `Step ${c.recoverStep} of 7`
                      )}
                    </StatusBadge>
                  </li>
                ))}
                {d.leads
                  .filter((l) => l.crmStage !== "CONVERTED_TO_CASE")
                  .map((l) => (
                    <li key={l.id} className="flex items-start justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium text-fg">{l.claimantName}</p>
                        <p className="text-sm text-fg-3">Submitted {formatDate(l.createdAt)}</p>
                      </div>
                      <StatusBadge tone="pending" live={false}>
                        {CRM_STAGE_LABELS[l.crmStage]}
                      </StatusBadge>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
