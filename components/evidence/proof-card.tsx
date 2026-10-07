"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  BadgeCheckIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleHelpIcon,
  FileTextIcon,
  FlagIcon,
  SearchIcon,
} from "lucide-react";

import type { ExtractedField } from "@/lib/types";
import { reviewFieldAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONFIDENCE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

const CONFIDENCE_ICON = {
  high: BadgeCheckIcon,
  medium: CircleHelpIcon,
  low: CircleAlertIcon,
  not_found: SearchIcon,
} as const;

/** Real identifiers are set in mono; names, counts and dates are not. */
const IDENTIFIER_KEYS = new Set([
  "folio_number",
  "certificate_number",
  "distinctive_numbers",
  "pan",
  "dp_client_id",
  "srn",
]);

function ReviewBadge({ field }: { field: ExtractedField }) {
  if (field.reviewStatus === "approved") {
    return (
      <StatusBadge tone="success" className="animate-settle">
        Confirmed
      </StatusBadge>
    );
  }
  if (field.reviewStatus === "corrected") {
    return (
      <StatusBadge tone="success" className="animate-settle">
        Corrected
      </StatusBadge>
    );
  }
  if (field.value === null) return <StatusBadge tone="neutral">Missing</StatusBadge>;
  return field.needsClientCheck ? (
    <StatusBadge tone="active" live>
      Waiting for you
    </StatusBadge>
  ) : (
    <StatusBadge tone="pending">With our reviewer</StatusBadge>
  );
}

/** Sentence case with a closing full stop, whatever the record holds. */
function sentence(note: string): string {
  const t = note.trim().replace(/\.$/, "");
  return `${t.charAt(0).toUpperCase()}${t.slice(1)}.`;
}

/**
 * The grounded line: our confidence as a short pill, then what it was checked
 * against and the page in plain text. Every word comes from the extraction
 * record; nothing is scored. The pill stays one line at any width so the
 * note, not the pill, does the wrapping.
 */
export function GroundingLine({ field }: { field: ExtractedField }) {
  const check = field.crossCheck;
  const pill =
    field.confidence === "not_found"
      ? CONFIDENCE_LABELS.not_found.short
      : `${CONFIDENCE_LABELS[field.confidence].short} confidence`;
  const tone =
    check?.outcome === "mismatch"
      ? "border-blocker/40 bg-blocker-wash text-blocker"
      : field.confidence === "high" && check?.outcome === "match"
        ? "border-confirmed/35 bg-confirmed-wash text-confirmed"
        : field.confidence === "not_found"
          ? "border-(--glass-border) bg-(--glass-elevated) text-fg-2"
          : "border-pending/35 bg-pending-wash text-pending";
  const Icon = check?.outcome === "mismatch" ? CircleAlertIcon : CONFIDENCE_ICON[field.confidence];
  return (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1.5 text-sm text-fg-2">
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 self-start rounded-[8px] border px-2 py-0.5 font-medium whitespace-nowrap",
          tone,
        )}
      >
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {pill}
      </span>
      {/* Note and page wrap as one run, so the page never sits alone. */}
      <span>
        {check?.outcome === "match" ? `${sentence(check.note)} ` : null}
        {check?.outcome === "mismatch" ? (
          <>
            <strong className="font-semibold text-blocker">Mismatch:</strong>{" "}
            {sentence(check.note)}{" "}
          </>
        ) : null}
        {check?.outcome === "not_checked" ? "Not cross-checked. " : null}
        {field.sourcePage !== null ? (
          <span className="whitespace-nowrap text-fg-3">
            <span aria-hidden="true">p.{field.sourcePage}</span>
            <span className="sr-only">Page {field.sourcePage}</span>
          </span>
        ) : null}
      </span>
    </p>
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
    if (!reason) errs.reason = "Tell us briefly what we got wrong. It helps the reviewer.";
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

  const isIdentifier = IDENTIFIER_KEYS.has(field.fieldKey);

  return (
    <article
      id={`field-${field.id}`}
      aria-labelledby={`${ids}-label`}
      className={cn(
        "panel vault-card scroll-mt-32 p-4 transition-[border-color,box-shadow] duration-300 ease-(--ease-out) sm:p-5",
        canReview &&
          "border-signal/45 shadow-[var(--glass-rim),0_18px_40px_-24px_var(--color-signal)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Heading
          id={`${ids}-label`}
          className="text-sm font-medium tracking-normal text-fg-3 [font-stretch:100%]"
        >
          {field.label}
        </Heading>
        <ReviewBadge field={field} />
      </div>

      {/* The value itself, or an explicit, honest gap */}
      {shownValue !== null ? (
        <p
          key={field.reviewStatus}
          className={cn(
            "tnum mt-1.5 animate-settle text-xl font-medium break-words text-fg",
            isIdentifier ? "font-mono tracking-[-0.01em]" : "tracking-[-0.01em]",
          )}
        >
          {shownValue}
        </p>
      ) : (
        <p className="mt-1.5 text-lg font-medium text-fg">Not found. Left blank, not estimated.</p>
      )}
      {field.reviewStatus === "corrected" && (
        <p className="mt-1 text-sm text-fg-3">
          We read: <s className="tnum font-mono">{field.value}</s>
          {field.correctionReason ? `. ${field.correctionReason}` : ""}
        </p>
      )}
      <div>
        <GroundingLine field={field} />
      </div>

      <dl className="mt-4 grid gap-2.5 text-sm">
        <div>
          <dt className="sr-only">Source</dt>
          <dd className="flex min-w-0 items-start gap-2 text-fg-2">
            <FileTextIcon className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden="true" />
            <span className="min-w-0">
              {field.sourcePage !== null ? (
                <>
                  {fileName}, <span className="tnum">page {field.sourcePage}</span>
                </>
              ) : (
                <>{fileName}: no page contains it</>
              )}
            </span>
          </dd>
        </div>
        {field.sourceSnippet && (
          <div>
            <dt className="sr-only">Line as read</dt>
            <dd className="rounded-[var(--radius-control)] border border-(--glass-border) bg-(--glass-elevated) px-3 py-2 font-mono text-[0.9375rem] break-words text-fg">
              {field.sourceSnippet}
            </dd>
          </div>
        )}
        {/* The grounding line above already names the confidence and the check;
            these rows give the reasons behind them. */}
        <div>
          <dt className="sr-only">Why we are this sure</dt>
          <dd className="flex min-w-0 items-start gap-2 text-fg-2">
            <ConfIcon className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden="true" />
            <span className="min-w-0">{field.confidenceReason}</span>
          </dd>
        </div>
        {field.crossCheck?.outcome === "not_checked" && (
          <div>
            <dt className="sr-only">Cross-check</dt>
            <dd className="flex min-w-0 items-start gap-2 text-fg-2">
              <CircleHelpIcon className="mt-0.5 size-4 shrink-0 text-fg-3" aria-hidden="true" />
              <span className="min-w-0">{field.crossCheck.note}</span>
            </dd>
          </div>
        )}
      </dl>

      {(field.reviewStatus === "approved" || field.reviewStatus === "corrected") &&
        field.reviewedAt && (
          <p
            ref={statusRef}
            tabIndex={-1}
            className="tnum mt-4 animate-settle border-t border-(--glass-border) pt-3 text-sm text-confirmed"
          >
            {field.reviewStatus === "approved" ? "Confirmed" : "Corrected"} by{" "}
            {field.reviewedBy ?? "you"}, {formatDateTime(field.reviewedAt)}
            {local && ". Written to the audit log."}
          </p>
        )}

      {canReview && mode === "view" && (
        <div className="mt-5 border-t border-(--glass-border) pt-4">
          {/* One verification switch: approve, or flag what we got wrong. */}
          <div
            role="group"
            aria-label={`Verify ${field.label}`}
            className="grid gap-1 rounded-[12px] border border-(--glass-border) bg-(--glass-elevated) p-1 min-[420px]:grid-cols-2"
          >
            <button
              type="button"
              onClick={approve}
              disabled={pending}
              aria-describedby={`${ids}-label`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] px-3 text-[0.9375rem] font-semibold text-confirmed transition-[background-color,box-shadow,transform] duration-150 hover:bg-confirmed-wash hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-confirmed)_40%,transparent)] active:scale-[0.98] disabled:opacity-50"
            >
              <CheckIcon className="size-[18px]" aria-hidden="true" />
              {pending ? "Saving…" : "Approve"}
            </button>
            <button
              ref={correctBtnRef}
              type="button"
              onClick={openCorrect}
              disabled={pending}
              aria-describedby={`${ids}-label`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[9px] px-3 text-[0.9375rem] font-semibold text-pending transition-[background-color,box-shadow,transform] duration-150 hover:bg-pending-wash hover:shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-pending)_40%,transparent)] active:scale-[0.98] disabled:opacity-50"
            >
              <FlagIcon className="size-[18px]" aria-hidden="true" />
              Flag a discrepancy
            </button>
          </div>
        </div>
      )}

      {canReview && mode === "correct" && (
        <form
          onSubmit={submitCorrection}
          noValidate
          className="mt-5 grid animate-arrive gap-4 border-t border-(--glass-border) pt-4"
        >
          <p className="flex items-center gap-2 text-base font-semibold text-pending">
            <FlagIcon className="size-4" aria-hidden="true" />
            What does your document say?
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor={`${ids}-value`}>Correct value</Label>
            <p id={`${ids}-value-hint`} className="text-sm text-fg-3">
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
              className={isIdentifier ? "font-mono" : undefined}
            />
            {fieldErrors.value && (
              <p
                id={`${ids}-value-err`}
                className="flex items-start gap-1.5 text-sm font-medium text-blocker"
              >
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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
                className="flex items-start gap-1.5 text-sm font-medium text-blocker"
              >
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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
        <p
          role="alert"
          className="mt-3 flex animate-settle items-start gap-1.5 text-sm font-medium text-blocker"
        >
          <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>
    </article>
  );
}

/**
 * A read-only data card for a detail that needs nothing from the client:
 * label, value and the grounded confidence line. Used by the inspector next
 * to the full proof cards.
 */
export function FieldDataCard({ field }: { field: ExtractedField }) {
  const shown = field.reviewStatus === "corrected" ? field.correctedValue : field.value;
  return (
    <div id={`field-${field.id}`} className="panel vault-card h-full scroll-mt-32 p-4">
      <p className="text-sm text-fg-3">{field.label}</p>
      <p
        className={cn(
          "tnum mt-1 text-lg font-medium break-words text-fg",
          IDENTIFIER_KEYS.has(field.fieldKey) && "font-mono text-base tracking-[-0.01em]",
          shown === null && "text-fg-2",
        )}
      >
        {shown ?? "Not found"}
      </p>
      <GroundingLine field={field} />
    </div>
  );
}
