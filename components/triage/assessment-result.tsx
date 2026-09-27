"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleAlert,
  CircleSlash,
  ExternalLink,
  FileSearch,
  Info,
  Unplug,
  type LucideIcon,
} from "lucide-react";

import type { EligibilityAssessment, SourceCheckStatus } from "@/lib/types";
import { formatReceiptTime } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SOURCE_STATUS: Record<SourceCheckStatus, { label: string; Icon: LucideIcon; tone: string }> =
  {
    checked: { label: "Checked", Icon: Check, tone: "text-teal-ink" },
    match_found: { label: "Record found", Icon: Check, tone: "text-teal-ink" },
    no_match: { label: "No record found", Icon: CircleSlash, tone: "text-ink" },
    not_connected: { label: "Not queried", Icon: Unplug, tone: "text-slate" },
    insufficient_evidence: {
      label: "Insufficient evidence",
      Icon: CircleAlert,
      tone: "text-brass-ink",
    },
    error: { label: "Check failed", Icon: CircleAlert, tone: "text-alert" },
  };

const CONFIDENCE_BADGE: Record<
  EligibilityAssessment["confidence"],
  { label: string; variant: "progress" | "neutral" | "outline" }
> = {
  likely: { label: "Likely", variant: "progress" },
  possible: { label: "Possible", variant: "outline" },
  undetermined: { label: "Undetermined", variant: "neutral" },
};

export function AssessmentResult({
  assessment: a,
  onRestart,
  headingRef,
}: {
  assessment: EligibilityAssessment;
  onRestart: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const conf = CONFIDENCE_BADGE[a.confidence];

  return (
    <div className="animate-step-in space-y-8">
      <section aria-labelledby="result-heading">
        <p className="eyebrow text-brass-ink">Your route assessment</p>
        <h1
          id="result-heading"
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 font-display text-3xl leading-tight font-medium text-ink focus:outline-none sm:text-4xl"
        >
          {a.headline}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={conf.variant}>Confidence: {conf.label}</Badge>
          <Badge variant="outline">{a.routeLabel}</Badge>
        </div>
        <p className="mt-4 max-w-2xl text-base text-slate">
          This suggests a route. It does not confirm that a holding exists, and nobody — including
          us — can guarantee recovery.
        </p>
      </section>

      {a.missing.length > 0 && (
        <Alert variant="info">
          <FileSearch aria-hidden="true" />
          <AlertTitle>Insufficient evidence — here is exactly what&apos;s missing</AlertTitle>
          <AlertDescription>
            <ul className="space-y-3">
              {a.missing.map((m) => (
                <li key={m.field}>
                  <p className="font-semibold text-ink">{m.field}</p>
                  <p>{m.why}</p>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="why-heading">
          <h2 id="why-heading" className="font-display text-xl font-medium text-ink">
            Why we think so
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-ink marker:text-brass">
            {a.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {a.inputNotes.length > 0 && (
            <div className="mt-4 space-y-2">
              {a.inputNotes.map((n) => (
                <p key={n} className="flex items-start gap-2 text-sm text-slate">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {n}
                </p>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="now-heading">
          <h2 id="now-heading" className="font-display text-xl font-medium text-ink">
            What you can do now
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-base text-ink marker:font-semibold marker:text-brass-ink">
            {a.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="routes-heading" className="grid gap-4 md:grid-cols-2">
        <h2 id="routes-heading" className="sr-only">
          Your options
        </h2>
        <div className="rounded-lg border border-line bg-pearl p-5">
          <p className="eyebrow text-slate">Do it yourself · free</p>
          <ul className="mt-3 space-y-3">
            {a.selfService.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1.5 font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                >
                  {l.label}
                  <ExternalLink className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <p className="text-sm text-slate">{l.note}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-pearl p-5">
          <p className="eyebrow text-slate">With RecoveryOS · paid only on success</p>
          {a.inScope ? (
            <>
              <p className="mt-3 text-base text-ink">
                We gather the documents, prepare IEPF-5 for your approval, chase the company, and
                show you who holds each step. 10% of what is actually credited, nothing upfront.
              </p>
              <p className="mt-2 text-sm text-slate">
                Opening real cases is switched off in this demo.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/cases/rc-2026-0147">
                  See a sample case
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-3 text-base text-ink">
              We are starting with IEPF shares and dividends only, so we can&apos;t take this case
              yet. The free route on the left is the right place to begin.
            </p>
          )}
        </div>
      </section>

      <section
        aria-labelledby="receipt-heading"
        className="rounded-lg border border-ink/20 bg-pearl"
      >
        <div className="border-b border-dashed border-line px-5 py-4">
          <h2 id="receipt-heading" className="font-display text-xl font-medium text-ink">
            Sources checked
          </h2>
          <p className="tnum mt-1 text-sm text-slate">
            Receipt {a.id} · generated {formatReceiptTime(a.assessedAt)}
          </p>
          <p className="tnum text-sm text-slate">
            {a.ruleVersion.label} ({a.ruleVersion.id}), effective {a.ruleVersion.effectiveFrom}
            {a.ruleVersion.status === "demo" ? " · demo rule set" : ""}
          </p>
        </div>
        <ul className="divide-y divide-line">
          {a.sources.map((s) => {
            const st = SOURCE_STATUS[s.status];
            return (
              <li
                key={s.id}
                className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                      >
                        {s.sourceName}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      s.sourceName
                    )}
                  </p>
                  <p className="text-sm text-slate">{s.operator}</p>
                  <p className="mt-1 text-sm text-ink/85">
                    <span className="font-medium">What we checked: </span>
                    {s.whatWeChecked}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className={cn("flex items-center gap-1.5 font-semibold", st.tone)}>
                    <st.Icon className="size-4 shrink-0" aria-hidden="true" />
                    {st.label}
                  </p>
                  <p className="mt-0.5 text-sm text-ink/85">{s.statusDetail}</p>
                  <p className="tnum mt-1 text-sm text-slate">
                    Last checked:{" "}
                    {s.checkedAt ? formatReceiptTime(s.checkedAt) : "never — not queried"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-dashed border-line px-5 py-3 text-sm text-slate">
          We only show a match when a source actually returned one. Nothing here is inferred or
          filled in.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onRestart}>
          Start a new check
        </Button>
      </div>
    </div>
  );
}
