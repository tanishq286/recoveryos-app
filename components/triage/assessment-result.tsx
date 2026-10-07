"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  FileMagnifyingGlassIcon,
  InfoIcon,
  MinusCircleIcon,
  PlugsIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

import type { EligibilityAssessment, SourceCheckStatus } from "@/lib/types";
import { formatReceiptTime } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SOURCE_STATUS: Record<
  SourceCheckStatus,
  { label: string; Icon: typeof CheckIcon; tone: string }
> = {
  checked: { label: "Checked", Icon: CheckIcon, tone: "text-confirmed" },
  match_found: { label: "Record found", Icon: CheckIcon, tone: "text-confirmed" },
  no_match: { label: "No record found", Icon: MinusCircleIcon, tone: "text-fg" },
  not_connected: { label: "Not queried", Icon: PlugsIcon, tone: "text-fg-3" },
  insufficient_evidence: {
    label: "Insufficient evidence",
    Icon: WarningCircleIcon,
    tone: "text-signal",
  },
  error: { label: "Check failed", Icon: WarningCircleIcon, tone: "text-blocker" },
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
    <div className="animate-arrive space-y-10">
      <section aria-labelledby="result-heading">
        <h1
          id="result-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-3xl leading-tight text-fg focus:outline-none sm:text-4xl sm:leading-[1.1]"
        >
          {a.headline}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant={conf.variant}>Confidence: {conf.label}</Badge>
          <Badge variant="outline">{a.routeLabel}</Badge>
        </div>
        <p className="mt-5 max-w-2xl text-base text-fg-2">
          This suggests a route. It does not confirm that a holding exists, and nobody, including
          us, can guarantee recovery.
        </p>
      </section>

      {a.missing.length > 0 && (
        <Alert variant="info">
          <FileMagnifyingGlassIcon aria-hidden="true" />
          <AlertTitle>Insufficient evidence: here is exactly what&apos;s missing</AlertTitle>
          <AlertDescription>
            <ul className="space-y-3">
              {a.missing.map((m) => (
                <li key={m.field}>
                  <p className="font-semibold text-fg">{m.field}</p>
                  <p>{m.why}</p>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="why-heading">
          <h2 id="why-heading" className="text-xl text-fg">
            Why we think so
          </h2>
          <ul className="mt-4 space-y-2.5 text-base text-fg">
            {a.reasons.map((r) => (
              <li key={r} className="flex gap-3">
                <span aria-hidden="true" className="mt-[0.8em] h-px w-3 shrink-0 bg-signal" />
                <span className="min-w-0">{r}</span>
              </li>
            ))}
          </ul>
          {a.inputNotes.length > 0 && (
            <div className="mt-5 space-y-2">
              {a.inputNotes.map((n) => (
                <p key={n} className="flex items-start gap-2 text-sm text-fg-3">
                  <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {n}
                </p>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="now-heading">
          <h2 id="now-heading" className="text-xl text-fg">
            What you can do now
          </h2>
          <ol className="tnum mt-4 list-decimal space-y-2.5 pl-5 text-base text-fg marker:font-medium marker:text-signal">
            {a.nextSteps.map((s) => (
              <li key={s} className="pl-1">
                {s}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="routes-heading" className="grid gap-4 md:grid-cols-2">
        <h2 id="routes-heading" className="sr-only">
          Your options
        </h2>
        <div className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg text-fg">Do it yourself</h3>
            <Badge variant="outline">Free</Badge>
          </div>
          <ul className="mt-4 space-y-4">
            {a.selfService.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link inline-flex items-start gap-1.5 font-medium"
                >
                  {l.label}
                  <ArrowUpRightIcon className="mt-1 size-4 shrink-0" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                <p className="mt-0.5 text-sm text-fg-3">{l.note}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg text-fg">With RecoveryOS</h3>
            <Badge variant="progress">Paid only on success</Badge>
          </div>
          {a.inScope ? (
            <>
              <p className="mt-4 text-base text-fg-2">
                We gather the documents, prepare IEPF-5 for your approval, chase the company, and
                show you who holds each step. 10% of what is actually credited, nothing upfront.
              </p>
              <p className="mt-2 text-sm text-fg-3">
                Opening real cases is switched off in this demo.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link href="/cases/rc-2026-0147">
                  See a sample case
                  <ArrowRightIcon weight="bold" aria-hidden="true" />
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-4 text-base text-fg-2">
              We are starting with IEPF shares and dividends only, so we can&apos;t take this case
              yet. The free route on the left is the right place to begin.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="receipt-heading" className="panel panel-lift overflow-hidden">
        <div className="border-b border-dashed border-line px-5 py-5 sm:px-6">
          <h2 id="receipt-heading" className="text-xl text-fg">
            Sources checked
          </h2>
          <p className="tnum mt-1.5 text-sm text-fg-3">
            Receipt <span className="font-mono text-fg-2">{a.id}</span>, generated{" "}
            {formatReceiptTime(a.assessedAt)}
          </p>
          <p className="tnum text-sm text-fg-3">
            {a.ruleVersion.label} (<span className="font-mono">{a.ruleVersion.id}</span>), effective{" "}
            {a.ruleVersion.effectiveFrom}
            {a.ruleVersion.status === "demo" ? ", demo rule set" : ""}
          </p>
        </div>
        <ul className="divide-y divide-line">
          {a.sources.map((s, i) => {
            const st = SOURCE_STATUS[s.status];
            return (
              <li
                key={s.id}
                // Lines print in order, like a statement coming off the printer.
                style={{ animationDelay: `${120 + i * 70}ms` }}
                className="grid animate-print gap-2 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-6"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-fg">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">
                        {s.sourceName}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    ) : (
                      s.sourceName
                    )}
                  </p>
                  <p className="text-sm text-fg-3">{s.operator}</p>
                  <p className="mt-1.5 text-sm text-fg-2">
                    <span className="font-medium text-fg">What we checked: </span>
                    {s.whatWeChecked}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className={cn("flex items-center gap-1.5 font-semibold", st.tone)}>
                    <st.Icon weight="bold" className="size-4 shrink-0" aria-hidden="true" />
                    {st.label}
                  </p>
                  <p className="mt-0.5 text-sm text-fg-2">{s.statusDetail}</p>
                  <p className="tnum mt-1.5 text-sm text-fg-3">
                    Last checked:{" "}
                    {s.checkedAt ? formatReceiptTime(s.checkedAt) : "never, not queried"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-dashed border-line px-5 py-4 text-sm text-fg-3 sm:px-6">
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
