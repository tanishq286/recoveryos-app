import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";

import { getDataSource } from "@/lib/data";
import { ROUTE_LABELS, stateInfo } from "@/lib/rules/case-states";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sample cases" };

export default async function CasesPage() {
  const cases = await getDataSource().listCases();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-brass-ink">Sample cases</p>
      <h1 className="mt-2 font-display text-3xl font-medium text-ink sm:text-4xl">
        What a case looks like from the inside
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-ink/85">
        Three fictional cases at different stages: one mid-review, one with a query from the
        company, and one heir claim that has only just started.
      </p>

      {cases.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-control/70 bg-pearl p-6">
          <p className="font-semibold text-ink">No cases yet</p>
          <p className="mt-1 text-base text-slate">
            A case opens after the guided check and your consent.
          </p>
          <Button asChild className="mt-4">
            <Link href="/check">Start the guided check</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {cases.map((c) => (
            <li key={c.id}>
              <article className="rounded-lg border border-line bg-pearl p-5 transition-colors duration-200 hover:border-ink/40 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tnum text-sm text-slate">{c.reference}</span>
                  <Badge variant={c.hasBlocker ? "blocker" : "progress"}>
                    {c.hasBlocker && <CircleAlert aria-hidden="true" />}
                    {stateInfo(c.status).label}
                  </Badge>
                  <Badge variant="outline">{ROUTE_LABELS[c.route]}</Badge>
                </div>
                <h2 className="mt-2 font-display text-xl font-medium text-ink sm:text-2xl">
                  <Link
                    href={`/cases/${c.id}`}
                    className="underline decoration-transparent underline-offset-4 hover:decoration-ink"
                  >
                    {c.title}
                  </Link>
                </h2>
                <p className="mt-1 text-base text-slate">Claimant: {c.claimantName}</p>
                <p className="mt-3 text-base text-ink">
                  We are waiting for {c.waitingFor}.{" "}
                  <span className="tnum text-slate">
                    {c.nextOwner.role === "client" ? c.claimantName : c.nextOwner.name} · by{" "}
                    {formatDate(c.nextDate)}
                  </span>
                </p>
                <Link
                  href={`/cases/${c.id}`}
                  aria-label={`Open case ${c.reference}`}
                  className="mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                >
                  Open case
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
