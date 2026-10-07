import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, FolderOpenIcon } from "@phosphor-icons/react/dist/ssr";

import { getDataSource } from "@/lib/data";
import { ROUTE_LABELS, stateInfo } from "@/lib/rules/case-states";
import { byNewest, formatDate, formatDateTime, formatPaise } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NextStepCard } from "@/components/case/next-step-card";
import { StatusRail } from "@/components/case/status-rail";
import { TaskList } from "@/components/case/task-list";
import { Timeline } from "@/components/case/timeline";
import { QuoteCard } from "@/components/case/quote-card";
import { ConsentList } from "@/components/case/consent-list";
import { HoldingsCard } from "@/components/case/holdings-card";
import { PartyLine } from "@/components/case/party";
import { DocumentPreview } from "@/components/evidence/document-preview";
import { ProofCard } from "@/components/evidence/proof-card";
import { orderFields } from "@/components/evidence/evidence-detail";
import { CaseTitleTransition, PageTransition } from "@/components/motion/page-transition";

export async function generateMetadata(props: PageProps<"/cases/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = await getDataSource().getCase(id);
  return { title: c ? `Case ${c.reference}` : "Case not found" };
}

export default async function CaseOverviewPage(props: PageProps<"/cases/[id]">) {
  const { id } = await props.params;
  const data = getDataSource();
  const [c, room] = await Promise.all([data.getCase(id), data.getEvidenceRoom(id)]);
  if (!c || !room) notFound();

  const needsYou = room.fields.filter(
    (f) => f.reviewStatus === "pending" && f.needsClientCheck && f.value !== null,
  );
  const previewFile =
    room.files.find((f) => needsYou.some((n) => n.evidenceFileId === f.id)) ??
    room.files.find(
      (f) => f.extractionStatus === "extracted" || f.extractionStatus === "needs_review",
    ) ??
    null;
  const previewFields = previewFile
    ? room.fields.filter((f) => f.evidenceFileId === previewFile.id)
    : [];
  const previewCards = previewFile
    ? orderFields(previewFields).filter(
        (f) => f.needsClientCheck || f.crossCheck?.outcome === "mismatch",
      )
    : [];
  const previewPage = previewCards[0]?.sourcePage ?? 1;
  const failed = room.files.filter((f) => f.extractionStatus === "failed").length;
  const state = stateInfo(c.status);
  const evidenceHref = `/cases/${c.id}/evidence`;
  const value = c.quote.indicativeValuePaise;
  const latest = [...c.timeline].sort((a, b) => byNewest(a.occurredAt, b.occurredAt))[0];

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-fg-3">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/cases" transitionTypes={["nav-back"]} className="link text-fg-2">
                Sample cases
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="tnum font-mono text-fg-2">
              {c.reference}
            </li>
          </ol>
        </nav>

        <header className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12">
          <div className="max-w-3xl min-w-0">
            <CaseTitleTransition caseId={c.id}>
              <h1 className="text-3xl leading-tight text-fg sm:text-4xl sm:leading-[1.1]">
                {c.title}
              </h1>
            </CaseTitleTransition>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant={c.status === "query_deficiency" ? "blocker" : "progress"}>
                {state.label}
              </Badge>
              <Badge variant="outline">{ROUTE_LABELS[c.route]}</Badge>
              <Badge variant="neutral">Sample case</Badge>
            </div>
            <p className="mt-4 text-base text-fg-2">{c.routeNote}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              <PartyLine party={c.caseLead} />
              <p className="tnum text-sm text-fg-3">Last updated {formatDateTime(c.updatedAt)}</p>
            </div>
          </div>

          {/* The one number this page leads with: what is at stake. */}
          <div className="border-t border-line pt-6 lg:min-w-[19rem] lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <p className="text-sm text-fg-3">Indicative value at stake</p>
            {value !== null ? (
              <p className="display mt-1 text-[clamp(2.75rem,5.2vw,4rem)] text-fg">
                {formatPaise(value)}
              </p>
            ) : (
              <p className="mt-1 text-2xl font-[560] tracking-[-0.02em] text-fg [font-stretch:106%]">
                Not estimated yet
              </p>
            )}
            <p className="mt-2 text-sm text-fg-3">
              {value !== null ? "Before our fee. " : "We wait for a document to show it. "}
              <a href="#quote-heading" className="link text-fg-2">
                What reaches you
              </a>
            </p>
            {latest && (
              <p className="mt-5 border-t border-line pt-4 text-sm text-fg-3">
                <span className="text-fg-2">Latest:</span> {latest.title},{" "}
                <span className="tnum">{formatDate(latest.occurredAt)}</span>
              </p>
            )}
          </div>
        </header>

        <div className="mt-8 space-y-6">
          <NextStepCard
            step={c.nextStep}
            action={
              needsYou.length > 0
                ? {
                    href: "#proof-cards",
                    label: `Review ${needsYou.length === 1 ? "the detail" : `the ${needsYou.length} details`}`,
                  }
                : room.files.length === 0
                  ? { href: evidenceHref, label: "Go to the evidence room" }
                  : undefined
            }
          />
          <StatusRail
            status={c.status}
            history={c.statusHistory}
            updatedAt={c.updatedAt}
            nextStep={c.nextStep}
          />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-8">
          <div className="space-y-10">
            <TaskList tasks={c.tasks} />
            <Timeline events={c.timeline} />
          </div>

          <div className="space-y-6">
            <section
              id="proof-cards"
              aria-labelledby="evidence-preview-heading"
              className="scroll-mt-6 rounded-[var(--radius-panel)] border border-line bg-ink-900 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="evidence-preview-heading" className="text-xl text-fg">
                    Evidence preview
                  </h2>
                  <p className="tnum mt-1 text-base text-fg-3">
                    {room.files.length} document{room.files.length === 1 ? "" : "s"}
                    {needsYou.length > 0 && `, ${needsYou.length} waiting for you`}
                    {failed > 0 && `, ${failed} couldn't be read`}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={evidenceHref} transitionTypes={["nav-forward"]}>
                    <FolderOpenIcon aria-hidden="true" />
                    Open evidence room
                  </Link>
                </Button>
              </div>

              {previewFile ? (
                <div className="mt-4 space-y-4">
                  <DocumentPreview
                    file={previewFile}
                    fields={previewFields}
                    page={previewPage}
                    highlightFieldId={previewCards[0]?.id}
                  />
                  {previewCards.length > 0 ? (
                    <ul className="space-y-3">
                      {previewCards.map((f) => (
                        <li key={f.id}>
                          <ProofCard field={f} fileName={previewFile.fileName} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-base text-fg-3">
                      Nothing on this document needs your check.
                    </p>
                  )}
                  <Link
                    href={`${evidenceHref}?doc=${previewFile.id}#doc-detail`}
                    transitionTypes={["nav-forward"]}
                    className="link inline-flex min-h-11 items-center gap-1.5 font-medium"
                  >
                    See everything read from {previewFile.fileName}
                    <ArrowRightIcon weight="bold" className="size-4 shrink-0" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className="mt-4 rounded-[var(--radius-control)] border border-dashed border-control/60 p-5">
                  <p className="font-semibold text-fg">No documents yet</p>
                  <p className="mt-1 text-base text-fg-2">
                    {room.files.length > 0
                      ? "Documents are still being read. Details will appear here with the page they came from."
                      : "When documents arrive, each detail we read shows up here with its page, our confidence, and buttons for you to approve or correct it."}
                  </p>
                </div>
              )}
            </section>

            <QuoteCard quote={c.quote} />
            <HoldingsCard assets={c.assets} />
            <ConsentList consents={c.consents} />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
