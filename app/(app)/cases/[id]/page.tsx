import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, FolderOpenIcon, ScanSearchIcon } from "lucide-react";

import { getDataSource } from "@/lib/data";
import { ROUTE_LABELS, stateInfo } from "@/lib/rules/case-states";
import { lifecycleStages } from "@/lib/rules/lifecycle";
import { byNewest, daysBetween, formatDate, formatDateTime, formatPaise } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCounter } from "@/components/ui/metric-counter";
import { StatusBadge } from "@/components/ui/status-badge";
import { VaultCard } from "@/components/ui/vault-card";
import { NextStepCard } from "@/components/case/next-step-card";
import { LifecycleTracker } from "@/components/case/lifecycle-tracker";
import { CasePanes } from "@/components/case/case-panes";
import { caseStatusTone } from "@/components/case/status-tone";
import { TaskList } from "@/components/case/task-list";
import { Timeline } from "@/components/case/timeline";
import { QuoteCard } from "@/components/case/quote-card";
import { ConsentList } from "@/components/case/consent-list";
import { HoldingsCard } from "@/components/case/holdings-card";
import { PartyLine } from "@/components/case/party";
import { DocumentPreview } from "@/components/evidence/document-preview";
import { ExtractionBadge } from "@/components/evidence/extraction-badge";
import { FieldDataCard, ProofCard } from "@/components/evidence/proof-card";
import { orderFields } from "@/components/evidence/evidence-detail";
import { HashGlyph } from "@/components/viz/hash-glyph";
import { CaseTitleTransition, PageTransition } from "@/components/motion/page-transition";
import { cn } from "@/lib/utils";

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
  const ordered = orderFields(previewFields);
  // Full proof cards where the client has something to do or a mismatch to see;
  // compact data cards for everything else read from the same document.
  const actionCards = ordered.filter(
    (f) => f.needsClientCheck || f.crossCheck?.outcome === "mismatch",
  );
  const dataCards = ordered.filter((f) => !actionCards.includes(f));
  const previewPage = actionCards[0]?.sourcePage ?? ordered[0]?.sourcePage ?? 1;
  const failed = room.files.filter((f) => f.extractionStatus === "failed").length;
  const state = stateInfo(c.status);
  const tone = caseStatusTone(c.status);
  const evidenceHref = `/cases/${c.id}/evidence`;
  const value = c.quote.indicativeValuePaise;
  const latest = [...c.timeline].sort((a, b) => byNewest(a.occurredAt, b.occurredAt))[0];
  const stages = lifecycleStages({
    status: c.status,
    history: c.statusHistory,
    updatedAt: c.updatedAt,
    holderType: c.claimant.holderType,
  });
  const currentStage = stages.find((s) => s.state === "current" || s.state === "blocked");
  const confirmedCount = room.fields.filter((f) => f.reviewStatus !== "pending").length;
  const startedAt = c.statusHistory[0]?.at ?? c.createdAt;
  // At-a-glance figures, every one read straight from the case and its documents.
  const metrics = [
    {
      label: "Documents",
      value: room.files.length,
      note: failed > 0 ? `${failed} couldn't be read` : "Fingerprinted on arrival",
    },
    {
      label: "Details confirmed",
      value: confirmedCount,
      note: `Of ${room.fields.length} read so far`,
    },
    {
      label: "Waiting for you",
      value: needsYou.length,
      note: needsYou.length > 0 ? "In the document inspector" : "Nothing right now",
      lit: needsYou.length > 0,
    },
    {
      label: "Days since the check",
      value: daysBetween(startedAt, c.updatedAt),
      note: `Started ${formatDate(startedAt)}`,
    },
  ];

  const milestones = (
    <>
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
      <LifecycleTracker
        stages={stages}
        status={c.status}
        history={c.statusHistory}
        updatedAt={c.updatedAt}
        nextStep={c.nextStep}
      />
      <TaskList tasks={c.tasks} />
      <Timeline events={c.timeline} />
    </>
  );

  const documents = (
    <>
      <section
        id="proof-cards"
        aria-labelledby="inspector-heading"
        className="panel scroll-mt-24 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-signal">
              <ScanSearchIcon className="size-4" aria-hidden="true" />
              Document inspector
            </p>
            <h2 id="inspector-heading" className="mt-1 text-xl text-fg">
              What we read, and how sure we are
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
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-(--glass-border) bg-(--glass-elevated) p-3">
              <HashGlyph sha256={previewFile.sha256} className="size-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg">{previewFile.fileName}</p>
                <p className="text-sm text-fg-3">{CATEGORY_LABELS[previewFile.category]}</p>
              </div>
              <ExtractionBadge status={previewFile.extractionStatus} />
            </div>
            <DocumentPreview
              file={previewFile}
              fields={previewFields}
              page={previewPage}
              highlightFieldId={actionCards[0]?.id}
            />
            {actionCards.length > 0 && (
              <ul className="space-y-3">
                {actionCards.map((f) => (
                  <li key={f.id}>
                    <ProofCard field={f} fileName={previewFile.fileName} />
                  </li>
                ))}
              </ul>
            )}
            {dataCards.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-fg">
                  {actionCards.length > 0
                    ? "Also read from this document"
                    : "Read from this document"}
                </h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {dataCards.map((f) => (
                    <li key={f.id}>
                      <FieldDataCard field={f} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {ordered.length === 0 && (
              <p className="text-base text-fg-3">Nothing on this document needs your check.</p>
            )}
            <Link
              href={`${evidenceHref}?doc=${previewFile.id}#doc-detail`}
              transitionTypes={["nav-forward"]}
              className="link inline-flex min-h-11 items-center gap-1.5 font-medium"
            >
              See every page of {previewFile.fileName}
              <ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <div className="mt-4 rounded-[var(--radius-control)] border border-dashed border-control/60 p-5">
            <p className="font-semibold text-fg">No documents yet</p>
            <p className="mt-1 text-base text-fg-2">
              {room.files.length > 0
                ? "Documents are still being read. Details will appear here with the page they came from."
                : "When documents arrive, each detail we read shows up here with its page, our confidence, and buttons for you to approve it or flag a discrepancy."}
            </p>
          </div>
        )}
      </section>

      <QuoteCard quote={c.quote} />
      <HoldingsCard assets={c.assets} />
      <ConsentList consents={c.consents} />
    </>
  );

  return (
    <PageTransition>
      <div className="mx-auto max-w-[84rem] px-4 py-8 sm:px-6 sm:py-10">
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

        <header className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-stretch lg:gap-10">
          <div className="max-w-3xl min-w-0 py-1">
            <CaseTitleTransition caseId={c.id}>
              <h1 className="text-3xl leading-tight text-fg sm:text-[2.75rem] sm:leading-[1.08]">
                {c.title}
              </h1>
            </CaseTitleTransition>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <StatusBadge tone={tone.tone} live={tone.live}>
                {state.label}
              </StatusBadge>
              {c.route === "iepf" ? (
                <Badge variant="iepf">{ROUTE_LABELS[c.route]}</Badge>
              ) : (
                <Badge variant="outline">{ROUTE_LABELS[c.route]}</Badge>
              )}
              <Badge variant="neutral">Sample case</Badge>
            </div>
            <p className="mt-5 text-base text-fg-2">{c.routeNote}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
              <PartyLine party={c.caseLead} />
              <p className="tnum text-sm text-fg-3">Last updated {formatDateTime(c.updatedAt)}</p>
            </div>
          </div>

          {/* The one number this page leads with: what is at stake. */}
          <VaultCard lift className="flex flex-col p-6">
            <p className="text-sm text-fg-3">Indicative value at stake</p>
            {value !== null ? (
              <p className="display text-gradient-cyan tnum mt-1 text-[clamp(2.5rem,4.6vw,3.75rem)]">
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

            {/* Six-stage progress, a compact twin of the tracker below. */}
            <div className="mt-6">
              <div aria-hidden="true" className="flex gap-1">
                {stages.map((s) => (
                  <span
                    key={s.key}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      s.state === "done" && "bg-status-success",
                      s.state === "current" &&
                        "bg-brand shadow-[0_0_10px_-1px_var(--color-brand-cyan)]",
                      s.state === "blocked" && "bg-status-error",
                      (s.state === "upcoming" || s.state === "skipped") && "bg-line",
                    )}
                  />
                ))}
              </div>
              {currentStage && (
                <p className="tnum mt-2 text-sm text-fg-2">
                  Stage {currentStage.index + 1} of {stages.length}: {currentStage.label}
                </p>
              )}
            </div>

            {latest && (
              <p className="mt-auto border-t border-(--glass-border) pt-4 text-sm text-fg-3 max-lg:mt-5">
                <span className="text-fg-2">Latest:</span> {latest.title},{" "}
                <span className="tnum">{formatDate(latest.occurredAt)}</span>
              </p>
            )}
          </VaultCard>
        </header>

        <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map((m) => (
            <VaultCard key={m.label} className={cn("p-4 sm:p-5", m.lit && "border-signal/40")}>
              <dt className="text-sm text-fg-3">{m.label}</dt>
              <dd className="mt-1">
                <MetricCounter
                  value={m.value}
                  className={cn(
                    "display block text-[clamp(1.75rem,3vw,2.25rem)]",
                    m.lit ? "text-signal" : "text-fg",
                  )}
                />
                <span className="mt-1 block text-sm text-fg-3">{m.note}</span>
              </dd>
            </VaultCard>
          ))}
        </dl>

        <div className="mt-8">
          <CasePanes
            milestones={milestones}
            documents={documents}
            documentsToCheck={needsYou.length}
          />
        </div>
      </div>
    </PageTransition>
  );
}
