import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { getDataSource } from "@/lib/data";
import { ROUTE_LABELS, stateInfo } from "@/lib/rules/case-states";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { VaultCard } from "@/components/ui/vault-card";
import { caseStatusTone } from "@/components/case/status-tone";
import { CHECK_CTA } from "@/components/site/cta";
import { RouteProgress } from "@/components/viz/route-progress";
import { RouteMark } from "@/components/brand/route-mark";
import { CaseTitleTransition, PageTransition } from "@/components/motion/page-transition";

export const metadata: Metadata = { title: "Sample cases" };

export default async function CasesPage() {
  const cases = await getDataSource().listCases();

  return (
    <PageTransition>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm font-medium text-signal">Sample cases</p>
        <h1 className="text-gradient-cyan mt-2 max-w-2xl text-3xl leading-tight sm:text-[2.75rem] sm:leading-[1.08]">
          What a case looks like from the inside
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-fg-2">
          Three fictional cases at different stages: one mid-review, one with a query from the
          company, and one heir claim that has only just started.
        </p>

        {cases.length === 0 ? (
          <div className="panel mt-10 border-dashed p-6">
            <RouteMark variant="start" className="mb-6 w-48" />
            <p className="font-semibold text-fg">No cases yet</p>
            <p className="mt-1 text-base text-fg-2">
              A case opens after the guided check and your consent.
            </p>
            <Button asChild className="mt-5">
              <Link href="/check">{CHECK_CTA}</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-10 space-y-4">
            {cases.map((c) => {
              const tone = caseStatusTone(c.status);
              return (
                <li key={c.id}>
                  <VaultCard as="article" interactive className="group p-5 sm:p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tnum mr-1 font-mono text-sm text-fg-3">{c.reference}</span>
                      <StatusBadge tone={c.hasBlocker ? "error" : tone.tone} live={tone.live}>
                        {stateInfo(c.status).label}
                      </StatusBadge>
                      <Badge variant={c.route === "iepf" ? "iepf" : "outline"}>
                        {ROUTE_LABELS[c.route]}
                      </Badge>
                    </div>
                    <CaseTitleTransition caseId={c.id}>
                      <h2 className="mt-3 text-xl text-fg sm:text-2xl">
                        <Link
                          href={`/cases/${c.id}`}
                          transitionTypes={["nav-forward"]}
                          className="underline decoration-transparent underline-offset-4 transition-[text-decoration-color] duration-[160ms] hover:decoration-signal"
                        >
                          {c.title}
                        </Link>
                      </h2>
                    </CaseTitleTransition>
                    <p className="mt-1 text-base text-fg-3">Claimant: {c.claimantName}</p>
                    <p className="mt-4 text-base text-fg">
                      We are waiting for {c.waitingFor}.{" "}
                      <span className="tnum text-fg-3">
                        {c.nextOwner.role === "client" ? c.claimantName : c.nextOwner.name}, by{" "}
                        {formatDate(c.nextDate)}
                      </span>
                    </p>
                    <RouteProgress status={c.status} className="mt-5 max-w-md" />
                    <Link
                      href={`/cases/${c.id}`}
                      transitionTypes={["nav-forward"]}
                      aria-label={`Open case ${c.reference}`}
                      className="link mt-3 inline-flex min-h-11 items-center gap-1.5 font-medium"
                    >
                      Open case
                      <ArrowRightIcon
                        className="size-4 transition-transform duration-[220ms] ease-(--ease-out) group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </VaultCard>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
