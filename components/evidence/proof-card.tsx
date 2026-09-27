"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  Check,
  CircleAlert,
  CircleHelp,
  FileText,
  Pencil,
  SearchX,
  ShieldCheck,
} from "lucide-react";

import type { ExtractedField } from "@/lib/types";
import { reviewFieldAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONFIDENCE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const CONFIDENCE_ICON = {
  high: ShieldCheck,
  medium: CircleHelp,
  low: CircleAlert,
  not_found: SearchX,
} as const;

function ReviewBadge({ field }: { field: ExtractedField }) {
  if (field.reviewStatus === "approved") {
    return (
      <Badge variant="confirmed">
        <Check aria-hidden="true" />
        Confirmed
      </Badge>
    );
  }
  if (field.reviewStatus === "corrected") {
    return (
      <Badge variant="confirmed">
        <Pencil aria-hidden="true" />
        Corrected
      </Badge>
    );
  }
  if (field.value === null) return <Badge variant="neutral">Missing</Badge>;
  return field.needsClientCheck ? (
    <Badge variant="progress">Waiting for you</Badge>
  ) : (
    <Badge variant="neutral">With our reviewer</Badge>
  );
}

/**
 * One extracted detail, with where it came from and how sure we are.
 * The client can approve it or correct it; both write an audit event.
 */
export function ProofCard({
  field: initial,
  fileName,
  headingLevel = "h3",
}: {
  field: ExtractedField;
  fileName: string;
  headingLevel?: "h3" | "h4";
}) {
  const [local, setLocal] = useState<ExtractedField | null>(null);
  const field = local ?? initial;
  const [mode, setMode] = useState<"view" | "correct">("view");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ value?: string; reason?: string }>({});
  const [announce, setAnnounce] = useState("");
  const [pending, startTransition] = useTransition();

  const ids = useId();
  const correctBtnRef = useRef<HTMLButtonElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  const Heading = headingLevel;
  const ConfIcon = CONFIDENCE_ICON[field.confidence];
  const canReview =
    field.reviewStatus === "pending" && field.needsClientCheck && field.value !== null;
  const shownValue = field.reviewStatus === "corrected" ? field.correctedValue : field.value;

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await reviewFieldAction({
        caseId: field.caseId,
        fieldId: field.id,
        decision: "approve",
      });
      if (res.ok) {
        setLocal(res.field);
        setAnnounce(`${field.label} confirmed. Recorded in the audit log.`);
        requestAnimationFrame(() => statusRef.current?.focus());
      } else {
        setError(res.error);
      }
    });
  }

  function openCorrect() {
    setError(null);
    setFieldErrors({});
    setMode("correct");
    requestAnimationFrame(() => valueRef.current?.focus());
  }

  function cancelCorrect() {
    setMode("view");
    setFieldErrors({});
    requestAnimationFrame(() => correctBtnRef.current?.focus());
  }

  function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const correctedValue = String(formData.get("correctedValue") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();
    const errs: typeof fieldErrors = {};
    if (!correctedValue) errs.value = "Enter the value exactly as it appears on your document.";
    else if (correctedValue === field.value)
      errs.value = "This is the same as what we read. Use Approve instead, or change the value.";
    if (!reason) errs.reason = "Tell us briefly what we got wrong — it helps the reviewer.";
    setFieldErrors(errs);
    if (errs.value || errs.reason) {
      requestAnimationFrame(() =>
        document.getElementById(errs.value ? `${ids}-value` : `${ids}-reason`)?.focus(),
      );
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reviewFieldAction({
        caseId: field.caseId,
        fieldId: field.id,
        decision: "correct",
        correctedValue,
        reason,
      });
      if (res.ok) {
        setLocal(res.field);
        setMode("view");
        setAnnounce(`${field.label} corrected. Recorded in the audit log.`);
        requestAnimationFrame(() => statusRef.current?.focus());
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <article
      aria-labelledby={`${ids}-label`}
      className={cn(
        "rounded-lg border bg-pearl p-4 transition-colors duration-200 sm:p-5",
        canReview ? "border-brass/70" : "border-line",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Heading
          id={`${ids}-label`}
          className="font-sans text-sm font-semibold tracking-wide text-slate uppercase"
        >
          {field.label}
        </Heading>
        <ReviewBadge field={field} />
      </div>

      {/* The value itself — or an explicit, honest gap */}
      {shownValue !== null ? (
        <p className="tnum mt-1.5 font-mono text-xl font-medium break-words text-ink">
          {shownValue}
        </p>
      ) : (
        <p className="mt-1.5 text-lg font-medium text-ink">Not found — left blank, not estimated</p>
      )}
      {field.reviewStatus === "corrected" && (
        <p className="mt-1 text-sm text-slate">
          We read: <s className="tnum font-mono">{field.value}</s>
          {field.correctionReason ? ` — ${field.correctionReason}` : ""}
        </p>
      )}

      <dl className="mt-3 grid gap-2 text-sm">
        <div>
          <dt className="sr-only">Source</dt>
          <dd className="flex min-w-0 items-start gap-2 text-ink">
            <FileText className="mt-0.5 size-4 shrink-0 text-slate" aria-hidden="true" />
            <span className="min-w-0">
              {field.sourcePage !== null ? (
                <>
                  {fileName}, <span className="tnum">page {field.sourcePage}</span>
                </>
              ) : (
                <>{fileName} — no page contains it</>
              )}
            </span>
          </dd>
        </div>
        {field.sourceSnippet && (
          <div>
            <dt className="sr-only">Line as read</dt>
            <dd className="rounded-sm border-l-2 border-brass bg-ivory px-3 py-1.5 font-mono text-[0.9375rem] break-words text-ink">
              {field.sourceSnippet}
            </dd>
          </div>
        )}
        <div>
          <dt className="sr-only">Confidence</dt>
          <dd className="flex min-w-0 items-start gap-2 text-ink">
            <ConfIcon
              className={cn(
                "mt-0.5 size-4 shrink-0",
                field.confidence === "high"
                  ? "text-teal-ink"
                  : field.confidence === "not_found"
                    ? "text-slate"
                    : "text-brass-ink",
              )}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="font-semibold">{CONFIDENCE_LABELS[field.confidence].label}.</span>{" "}
              <span className="text-ink/85">{field.confidenceReason}</span>
            </span>
          </dd>
        </div>
        {field.crossCheck && (
          <div>
            <dt className="sr-only">Cross-check</dt>
            <dd
              className={cn(
                "flex min-w-0 items-start gap-2 rounded-sm px-2 py-1.5 text-ink",
                field.crossCheck.outcome === "mismatch" && "bg-alert-wash",
              )}
            >
              {field.crossCheck.outcome === "match" ? (
                <Check className="mt-0.5 size-4 shrink-0 text-teal-ink" aria-hidden="true" />
              ) : field.crossCheck.outcome === "mismatch" ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-alert" aria-hidden="true" />
              ) : (
                <CircleHelp className="mt-0.5 size-4 shrink-0 text-slate" aria-hidden="true" />
              )}
              <span className="min-w-0">
                <span className="font-semibold">
                  {field.crossCheck.outcome === "match"
                    ? "Cross-check passed."
                    : field.crossCheck.outcome === "mismatch"
                      ? "Mismatch."
                      : "Not cross-checked."}
                </span>{" "}
                {field.crossCheck.note}
              </span>
            </dd>
          </div>
        )}
      </dl>

      {(field.reviewStatus === "approved" || field.reviewStatus === "corrected") &&
        field.reviewedAt && (
          <p
            ref={statusRef}
            tabIndex={-1}
            className="tnum mt-3 border-t border-line pt-3 text-sm text-teal-ink"
          >
            {field.reviewStatus === "approved" ? "Confirmed" : "Corrected"} by{" "}
            {field.reviewedBy ?? "you"} · {formatDateTime(field.reviewedAt)}
            {local && " · written to the audit log"}
          </p>
        )}

      {canReview && mode === "view" && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
          <Button
            variant="confirm"
            onClick={approve}
            disabled={pending}
            aria-describedby={`${ids}-label`}
          >
            <Check aria-hidden="true" />
            {pending ? "Saving…" : "Approve — this is correct"}
          </Button>
          <Button
            ref={correctBtnRef}
            variant="outline"
            onClick={openCorrect}
            disabled={pending}
            aria-describedby={`${ids}-label`}
          >
            <Pencil aria-hidden="true" />
            Correct it
          </Button>
        </div>
      )}

      {canReview && mode === "correct" && (
        <form
          onSubmit={submitCorrection}
          noValidate
          className="mt-4 grid gap-4 border-t border-line pt-4"
        >
          <div className="grid gap-1.5">
            <Label htmlFor={`${ids}-value`}>Correct value</Label>
            <p id={`${ids}-value-hint`} className="text-sm text-slate">
              Type it exactly as it appears on your document.
            </p>
            <Input
              ref={valueRef}
              id={`${ids}-value`}
              name="correctedValue"
              defaultValue={field.value ?? ""}
              autoComplete="off"
              maxLength={200}
              aria-invalid={fieldErrors.value ? true : undefined}
              aria-describedby={`${ids}-value-hint${fieldErrors.value ? ` ${ids}-value-err` : ""}`}
              className="font-mono"
            />
            {fieldErrors.value && (
              <p
                id={`${ids}-value-err`}
                className="flex items-start gap-1.5 text-sm font-medium text-alert"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {fieldErrors.value}
              </p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${ids}-reason`}>What did we get wrong?</Label>
            <Textarea
              id={`${ids}-reason`}
              name="reason"
              rows={2}
              maxLength={500}
              placeholder="For example: the last two digits are 10, not 01"
              aria-invalid={fieldErrors.reason ? true : undefined}
              aria-describedby={fieldErrors.reason ? `${ids}-reason-err` : undefined}
            />
            {fieldErrors.reason && (
              <p
                id={`${ids}-reason-err`}
                className="flex items-start gap-1.5 text-sm font-medium text-alert"
              >
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {fieldErrors.reason}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save correction"}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelCorrect} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-medium text-alert">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </article>
  );
}
