import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, ArrowUpRightIcon, LockKeyholeIcon } from "lucide-react";
import { CUSTODY_LABELS } from "@finsol/shared";

import { api } from "@/lib/api/server";
import { handleApiError } from "@/lib/api/guard";
import type { AdminCompany } from "@/lib/api/types";
import { formatCount, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Company file", robots: { index: false } };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[12rem_1fr]">
      <dt className="text-sm text-fg-3">{label}</dt>
      <dd className="text-fg break-words">{children}</dd>
    </div>
  );
}

function External({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link inline-flex items-center gap-1"
    >
      {children}
      <ArrowUpRightIcon className="size-3.5" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Staff only: the full internal file for one company. */
export default async function AdminCompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const path = `/admin/companies/${slug}`;
  let c: AdminCompany;
  try {
    c = await api<AdminCompany>(`admin/companies/${encodeURIComponent(slug)}`, { session: true });
  } catch (e) {
    handleApiError(e, path);
  }
  return (
    <div className="mx-auto max-w-[64rem] px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/admin/companies"
        className="link inline-flex min-h-11 items-center gap-1.5 text-sm text-fg-2"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Company files
      </Link>
      <h1 className="display mt-2 text-[clamp(1.75rem,3.6vw,2.5rem)] text-fg">{c.name}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-fg-3">
        <LockKeyholeIcon className="size-4 text-signal" aria-hidden="true" />
        Internal company file
        {c.contacts.verifiedAt ? ` · contacts verified ${formatDate(c.contacts.verifiedAt)}` : ""}
        {c.contacts.source ? ` · ${c.contacts.source}` : ""}
      </p>

      <section aria-labelledby="ids" className="panel mt-8 p-5 sm:p-6">
        <h2 id="ids" className="text-lg font-semibold text-fg">
          Identifiers
        </h2>
        <dl className="mt-2 divide-y divide-(--glass-border)">
          <Row label="CIN">{c.cin ?? c.statutoryBasis ?? "—"}</Row>
          <Row label="ISIN">
            <span className="font-mono">{c.isin ?? "—"}</span>
          </Row>
          <Row label="NSE / BSE">
            {[c.tickerNse, c.tickerBse].filter(Boolean).join(" / ") || "—"}
          </Row>
          <Row label="Sector">{c.sector ?? "—"}</Row>
        </dl>
      </section>

      <section aria-labelledby="nodal" className="panel mt-6 p-5 sm:p-6">
        <h2 id="nodal" className="text-lg font-semibold text-fg">
          IEPF nodal officer
        </h2>
        <dl className="mt-2 divide-y divide-(--glass-border)">
          <Row label="Name">{c.nodalOfficer.name}</Row>
          <Row label="Email">
            {c.nodalOfficer.emails.length
              ? c.nodalOfficer.emails.map((e) => (
                  <a key={e} href={`mailto:${e}`} className="link block">
                    {e}
                  </a>
                ))
              : "—"}
          </Row>
          <Row label="Phone">{c.nodalOfficer.phone ?? "—"}</Row>
          <Row label="Address">{c.nodalOfficer.address ?? "—"}</Row>
          {c.nodalOfficer.deputies.length > 0 && (
            <Row label="Deputies">
              {c.nodalOfficer.deputies.map((d) => (
                <span key={d.name} className="block">
                  {d.name}
                  {d.email ? ` · ${d.email}` : ""}
                </span>
              ))}
            </Row>
          )}
        </dl>
      </section>

      <section aria-labelledby="rta" className="panel mt-6 p-5 sm:p-6">
        <h2 id="rta" className="text-lg font-semibold text-fg">
          Registrar (RTA)
        </h2>
        <dl className="mt-2 divide-y divide-(--glass-border)">
          <Row label="Registrar">{c.rta.label}</Row>
          <Row label="Address">{c.rta.address ?? "—"}</Row>
          <Row label="Email">
            {c.rta.email ? (
              <a href={`mailto:${c.rta.email}`} className="link">
                {c.rta.email}
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Phone">{c.rta.phone ?? "—"}</Row>
          <Row label="Website">
            {c.rta.website ? <External href={c.rta.website}>{c.rta.website}</External> : "—"}
          </Row>
          <Row label="IEPF statements page">
            {c.irPageUrl ? <External href={c.irPageUrl}>{c.irPageUrl}</External> : "—"}
          </Row>
        </dl>
      </section>

      <section aria-labelledby="records" className="panel mt-6 p-5 sm:p-6">
        <h2 id="records" className="text-lg font-semibold text-fg">
          Holders on record
        </h2>
        {c.records.length === 0 ? (
          <p className="mt-2 text-fg-2">No statements imported yet.</p>
        ) : (
          <dl className="mt-2 divide-y divide-(--glass-border)">
            {c.records.map((r) => (
              <Row key={r.custodyStatus} label={CUSTODY_LABELS[r.custodyStatus]}>
                <span className="tnum">
                  {formatCount(r.folios)} holders · {formatCount(r.shares)} shares
                </span>
              </Row>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}
