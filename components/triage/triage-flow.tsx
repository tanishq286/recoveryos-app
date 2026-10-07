"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  LockSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";

import type {
  AssetType,
  EligibilityAssessment,
  HolderType,
  IdentifierKind,
  TriageInput,
} from "@/lib/types";
import { assessEligibilityAction } from "@/lib/actions";
import { ASSET_LABELS, IDENTIFIER_LABELS, validateIdentifier } from "@/lib/rules/triage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AssessmentResult } from "@/components/triage/assessment-result";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- config */

const STEPS = [
  { key: "asset", short: "Holding" },
  { key: "issuer", short: "Company" },
  { key: "dates", short: "Dates" },
  { key: "reference", short: "Reference" },
  { key: "holder", short: "Holder" },
  { key: "review", short: "Check" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

const ASSET_OPTIONS: { value: AssetType; title: string; body: string }[] = [
  {
    value: "iepf_shares_dividends",
    title: "Shares or dividends",
    body: "Old share certificates, dividend warrants never cashed, or shares a company moved to IEPF.",
  },
  {
    value: "mutual_funds",
    title: "Mutual funds",
    body: "Folios you have lost track of, or redemptions and dividends never received.",
  },
  {
    value: "provident_fund",
    title: "Provident fund (PF)",
    body: "EPF from a past job that was never withdrawn or transferred.",
  },
  {
    value: "bank_deposits",
    title: "Bank deposits",
    body: "Savings accounts or fixed deposits not touched for many years.",
  },
];

const HOLDER_OPTIONS: { value: HolderType; title: string; body: string }[] = [
  { value: "self", title: "In my own name", body: "You are the holder, alone." },
  {
    value: "joint",
    title: "Jointly with someone",
    body: "Two or three names on the holding, including yours.",
  },
  {
    value: "nominee",
    title: "As the nominee",
    body: "The holder has died and named you as nominee.",
  },
  {
    value: "heir",
    title: "As a legal heir",
    body: "The holder has died and you are claiming as family, with or without a will.",
  },
];

const ISSUER_COPY: Record<AssetType, { question: string; label: string; hint: string }> = {
  iepf_shares_dividends: {
    question: "Which company issued the shares?",
    label: "Company name",
    hint: "As printed on the certificate or dividend warrant. Old names are fine. Companies change names.",
  },
  mutual_funds: {
    question: "Which fund house was it with?",
    label: "Fund house (AMC)",
    hint: "For example, the name on an old account statement.",
  },
  provident_fund: {
    question: "Which employer was it with?",
    label: "Employer name",
    hint: "The company that deducted PF from your salary.",
  },
  bank_deposits: {
    question: "Which bank held the account?",
    label: "Bank name",
    hint: "Branch is not needed.",
  },
};

const DATE_COPY: Record<AssetType, { question: string; lastLabel: string; lastHint: string }> = {
  iepf_shares_dividends: {
    question: "Roughly when did you last receive a dividend?",
    lastLabel: "Year of the last dividend received or cashed",
    lastHint: "A rough year is enough. Old bank passbooks often show dividend credits.",
  },
  mutual_funds: {
    question: "Roughly when did you last transact?",
    lastLabel: "Year of the last purchase, redemption or statement",
    lastHint: "A rough year is enough.",
  },
  provident_fund: {
    question: "Roughly when did you leave that job?",
    lastLabel: "Year of the last PF contribution",
    lastHint: "Usually the year you left the employer.",
  },
  bank_deposits: {
    question: "Roughly when was the account last used?",
    lastLabel: "Year of the last deposit or withdrawal",
    lastHint: "A rough year is enough.",
  },
};

const IDENTIFIER_OPTIONS: Record<AssetType, IdentifierKind[]> = {
  iepf_shares_dividends: ["folio", "dp_client"],
  mutual_funds: ["folio"],
  provident_fund: ["uan"],
  bank_deposits: ["account_last4"],
};

interface Answers {
  assetType: AssetType | null;
  issuerName: string;
  issuerUnknown: boolean;
  lastYear: string; // "" | "unknown" | "YYYY"
  acquiredYear: string; // "" | "unknown" | "YYYY"
  identifierKind: IdentifierKind | "none" | null;
  identifier: string;
  holderType: HolderType | null;
}

const EMPTY: Answers = {
  assetType: null,
  issuerName: "",
  issuerUnknown: false,
  lastYear: "",
  acquiredYear: "",
  identifierKind: null,
  identifier: "",
  holderType: null,
};

function toInput(a: Answers): TriageInput {
  const yr = (v: string) => (/^\d{4}$/.test(v) ? Number(v) : null);
  const hasId = a.identifierKind && a.identifierKind !== "none" && a.identifier.trim();
  return {
    assetType: a.assetType!,
    holderType: a.holderType!,
    issuerName: a.issuerUnknown ? null : a.issuerName.trim() || null,
    lastActivityYear: yr(a.lastYear),
    acquiredYear: yr(a.acquiredYear),
    identifierKind: hasId ? (a.identifierKind as IdentifierKind) : null,
    identifier: hasId ? a.identifier.trim() : null,
  };
}

/* --------------------------------------------------------------- pieces */

function ProgressRail({ current }: { current: number }) {
  const total = STEPS.length;
  return (
    <nav aria-label="Progress" className="mb-10">
      <p className="tnum text-sm font-medium text-fg-3">
        Step {current + 1} of {total}
        <span className="sr-only">: {STEPS[current].short}</span>
      </p>
      <ol className="mt-3 grid grid-cols-6 gap-1.5" role="list">
        {STEPS.map((s, i) => {
          const state = i < current ? "done" : i === current ? "current" : "upcoming";
          return (
            <li
              key={s.key}
              aria-current={state === "current" ? "step" : undefined}
              className="min-w-0"
            >
              {/* Each segment fills along its own length: transform only, no layout. */}
              <span aria-hidden="true" className="block h-1 overflow-hidden rounded-full bg-line">
                <span
                  className={cn(
                    "block h-full origin-left rounded-full transition-[transform,background-color] duration-[320ms] ease-(--ease-out)",
                    state === "upcoming" ? "scale-x-0 bg-signal" : "scale-x-100",
                    state === "done" && "bg-confirmed",
                    state === "current" && "bg-signal",
                  )}
                />
              </span>
              <span
                className={cn(
                  "mt-2 hidden items-center gap-1 text-sm sm:flex",
                  state === "current"
                    ? "font-medium text-fg"
                    : state === "done"
                      ? "text-fg-2"
                      : "text-fg-3",
                )}
              >
                {state === "done" && (
                  <CheckIcon weight="bold" className="size-3.5 text-confirmed" aria-hidden="true" />
                )}
                {s.short}
                <span className="sr-only">
                  {state === "done"
                    ? " (done)"
                    : state === "current"
                      ? " (current)"
                      : " (not started)"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Question({
  id,
  headingRef,
  children,
}: {
  id: string;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  children: React.ReactNode;
}) {
  return (
    <h1
      id={id}
      ref={headingRef}
      tabIndex={-1}
      className="text-3xl leading-tight text-fg focus:outline-none sm:text-[2.5rem] sm:leading-[1.1]"
    >
      {children}
    </h1>
  );
}

function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      className="mt-2 flex animate-arrive items-start gap-1.5 text-base font-medium text-blocker"
    >
      <WarningCircleIcon weight="bold" className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <span>
        <span className="sr-only">Error: </span>
        {children}
      </span>
    </p>
  );
}

function OptionCards<T extends string>({
  name,
  value,
  onChange,
  options,
  errorId,
  labelledBy,
}: {
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; title: string; body: string }[];
  errorId?: string;
  labelledBy: string;
}) {
  const base = useId();
  return (
    <RadioGroup
      name={name}
      value={value ?? ""}
      onValueChange={(v) => onChange(v as T)}
      aria-labelledby={labelledBy}
      aria-describedby={errorId}
      aria-invalid={errorId ? true : undefined}
      className="grid gap-3 sm:grid-cols-2"
    >
      {options.map((o) => {
        const id = `${base}-${o.value}`;
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              "spotlight flex cursor-pointer items-start gap-3 rounded-[var(--radius-panel)] border p-4 transition-[border-color,background-color,box-shadow,transform] duration-[160ms] ease-(--ease-out) active:scale-[0.99]",
              checked
                ? "border-signal bg-signal-wash/60 shadow-[inset_0_0_0_1px_var(--color-signal)]"
                : "border-line bg-ink-850 shadow-(--highlight) hover:border-control",
            )}
          >
            <RadioGroupItem id={id} value={o.value} className="mt-1" />
            <span className="min-w-0">
              <span className="block font-semibold text-fg">{o.title}</span>
              <span className="mt-0.5 block text-base text-fg-2">{o.body}</span>
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

function YearSelect({
  id,
  value,
  onChange,
  maxYear,
  describedBy,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  maxYear: number;
  describedBy?: string;
  invalid?: boolean;
}) {
  const years = Array.from({ length: maxYear - 1959 }, (_, i) => String(maxYear - i));
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className="tnum block min-h-12 w-full max-w-xs rounded-[var(--radius-control)] border border-control bg-ink-900 px-3 py-2.5 text-base text-fg transition-[border-color] duration-[160ms] hover:border-fg-3 aria-invalid:border-blocker"
    >
      <option value="">Choose a year</option>
      <option value="unknown">I don&apos;t remember</option>
      {years.map((y) => (
        <option key={y} value={y}>
          {y}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ main */

export function TriageFlow({ maxYear }: { maxYear: number }) {
  const [step, setStep] = useState(0);
  // Visual only: which way the last step change went, so the next question
  // slides in from the matching side. "none" on first paint (no entrance).
  const [dir, setDir] = useState<"none" | "forward" | "back">("none");
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EligibilityAssessment | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const ids = useId();

  const key: StepKey = STEPS[step].key;
  const asset = answers.assetType;

  // Move focus to the question on every step change (not on first load).
  useEffect(() => {
    if (!moved.current) return;
    (result ? resultHeadingRef.current : headingRef.current)?.focus();
  }, [step, result]);

  function set<K extends keyof Answers>(k: K, v: Answers[K]) {
    setAnswers((a) => ({ ...a, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }));
  }

  function go(to: number) {
    moved.current = true;
    setDir(to < step ? "back" : "forward");
    setErrors({});
    setSubmitError(null);
    setStep(to);
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (key === "asset" && !answers.assetType) e.assetType = "Choose what kind of holding it is.";
    if (key === "issuer" && !answers.issuerUnknown && !answers.issuerName.trim())
      e.issuerName = `Enter the ${ISSUER_COPY[asset!].label.toLowerCase()}, or tick “I don't know”.`;
    if (key === "dates" && !answers.lastYear) e.lastYear = "Choose a year, or “I don't remember”.";
    if (key === "reference") {
      if (!answers.identifierKind) e.identifierKind = "Choose one option.";
      else if (answers.identifierKind !== "none") {
        const v = answers.identifier.trim();
        if (!v)
          e.identifier = `Enter the ${IDENTIFIER_LABELS[answers.identifierKind].toLowerCase()}, or choose “I don't have it”.`;
        else {
          const problem = validateIdentifier(answers.identifierKind, v);
          if (problem)
            e.identifier = `That doesn't look like a ${IDENTIFIER_LABELS[answers.identifierKind].toLowerCase()}. Expected ${problem}.`;
        }
      }
    }
    if (key === "holder" && !answers.holderType) e.holderType = "Choose how the holding is held.";
    return e;
  }

  function onContinue(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.values(e).some(Boolean)) {
      setErrors(e);
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    if (key === "review") return runCheck();
    go(step + 1);
  }

  function runCheck() {
    setSubmitError(null);
    startTransition(async () => {
      const res = await assessEligibilityAction(toInput(answers));
      if (res.ok) {
        moved.current = true;
        setResult(res.assessment);
      } else {
        setSubmitError(res.error);
        requestAnimationFrame(() => errorRef.current?.focus());
      }
    });
  }

  function restart() {
    moved.current = true;
    setAnswers(EMPTY);
    setResult(null);
    setErrors({});
    setDir("back");
    setStep(0);
  }

  if (result) {
    return (
      <AssessmentResult assessment={result} onRestart={restart} headingRef={resultHeadingRef} />
    );
  }

  const errorList = Object.entries(errors).filter(([, v]) => v);
  const questionId = `${ids}-q`;

  return (
    <div>
      <ProgressRail current={step} />

      {(errorList.length > 0 || submitError) && (
        <div ref={errorRef} tabIndex={-1} className="mb-6 focus:outline-none">
          <Alert variant="blocker" role="alert" className="animate-arrive">
            <WarningCircleIcon aria-hidden="true" />
            <AlertTitle>{submitError ? "The check didn't run" : "There is a problem"}</AlertTitle>
            <AlertDescription>
              {submitError ? (
                <p>{submitError}</p>
              ) : (
                <ul className="list-disc pl-5">
                  {errorList.map(([k, v]) => (
                    <li key={k}>
                      <a href={`#${ids}-${k}`} className="link">
                        {v}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <form
        onSubmit={onContinue}
        noValidate
        key={key}
        className={cn(dir === "forward" && "animate-forward", dir === "back" && "animate-back")}
      >
        {key === "asset" && (
          <fieldset>
            <legend className="mb-2">
              <Question id={questionId} headingRef={headingRef}>
                What are you trying to recover?
              </Question>
            </legend>
            <p className="mb-6 text-lg text-fg-2">
              Choose the closest. You can run the check again for another holding.
            </p>
            <div id={`${ids}-assetType`} tabIndex={-1} className="focus:outline-none">
              <OptionCards
                name="assetType"
                value={answers.assetType}
                onChange={(v) => {
                  set("assetType", v);
                  set("identifierKind", null);
                  set("identifier", "");
                }}
                options={ASSET_OPTIONS}
                labelledBy={questionId}
                errorId={errors.assetType ? `${ids}-assetType-err` : undefined}
              />
            </div>
            {errors.assetType && (
              <FieldError id={`${ids}-assetType-err`}>{errors.assetType}</FieldError>
            )}
          </fieldset>
        )}

        {key === "issuer" && asset && (
          <div>
            <Question id={questionId} headingRef={headingRef}>
              {ISSUER_COPY[asset].question}
            </Question>
            <div className="mt-6 max-w-xl">
              <Label htmlFor={`${ids}-issuerName`}>{ISSUER_COPY[asset].label}</Label>
              <p id={`${ids}-issuer-hint`} className="mt-1 text-base text-fg-2">
                {ISSUER_COPY[asset].hint}
              </p>
              <Input
                id={`${ids}-issuerName`}
                className="mt-2"
                value={answers.issuerName}
                onChange={(e) => set("issuerName", e.target.value)}
                disabled={answers.issuerUnknown}
                autoComplete="organization"
                maxLength={120}
                aria-invalid={errors.issuerName ? true : undefined}
                aria-describedby={`${ids}-issuer-hint${errors.issuerName ? ` ${ids}-issuerName-err` : ""}`}
              />
              {errors.issuerName && (
                <FieldError id={`${ids}-issuerName-err`}>{errors.issuerName}</FieldError>
              )}
              <label className="mt-4 flex min-h-11 cursor-pointer items-center gap-3 text-base text-fg">
                <input
                  type="checkbox"
                  checked={answers.issuerUnknown}
                  onChange={(e) => set("issuerUnknown", e.target.checked)}
                  className="size-5 accent-signal"
                />
                I don&apos;t know
              </label>
            </div>
          </div>
        )}

        {key === "dates" && asset && (
          <div>
            <Question id={questionId} headingRef={headingRef}>
              {DATE_COPY[asset].question}
            </Question>
            <div className="mt-6 grid gap-6">
              <div>
                <Label htmlFor={`${ids}-lastYear`}>{DATE_COPY[asset].lastLabel}</Label>
                <p id={`${ids}-last-hint`} className="mt-1 text-base text-fg-2">
                  {DATE_COPY[asset].lastHint}
                </p>
                <div className="mt-2">
                  <YearSelect
                    id={`${ids}-lastYear`}
                    value={answers.lastYear}
                    onChange={(v) => set("lastYear", v)}
                    maxYear={maxYear}
                    invalid={!!errors.lastYear}
                    describedBy={`${ids}-last-hint${errors.lastYear ? ` ${ids}-lastYear-err` : ""}`}
                  />
                </div>
                {errors.lastYear && (
                  <FieldError id={`${ids}-lastYear-err`}>{errors.lastYear}</FieldError>
                )}
              </div>
              <div>
                <Label htmlFor={`${ids}-acquiredYear`}>
                  Year bought or opened <span className="font-normal text-fg-3">(optional)</span>
                </Label>
                <div className="mt-2">
                  <YearSelect
                    id={`${ids}-acquiredYear`}
                    value={answers.acquiredYear}
                    onChange={(v) => set("acquiredYear", v)}
                    maxYear={maxYear}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {key === "reference" && asset && (
          <fieldset>
            <legend className="mb-2">
              <Question id={questionId} headingRef={headingRef}>
                Do you have a reference number?
              </Question>
            </legend>
            <p className="mb-6 max-w-2xl text-lg text-fg-2">
              Optional. It helps point to the right record.{" "}
              {asset === "bank_deposits"
                ? "We only ever need the last 4 digits of an account number."
                : "We never need passwords, OTPs or PINs."}
            </p>
            <div id={`${ids}-identifierKind`} tabIndex={-1} className="focus:outline-none">
              <OptionCards
                name="identifierKind"
                value={answers.identifierKind}
                onChange={(v) => set("identifierKind", v)}
                options={[
                  ...IDENTIFIER_OPTIONS[asset].map((k) => ({
                    value: k as IdentifierKind | "none",
                    title: `Yes: ${IDENTIFIER_LABELS[k]}`,
                    body:
                      k === "folio"
                        ? "Printed on certificates, dividend warrants and statements."
                        : k === "dp_client"
                          ? "From your broker's client master list."
                          : k === "uan"
                            ? "12 digits, on your payslip or PF statement."
                            : "The last 4 digits only.",
                  })),
                  {
                    value: "none",
                    title: "I don't have it",
                    body: "That's fine. We can still suggest a route.",
                  },
                ]}
                labelledBy={questionId}
                errorId={errors.identifierKind ? `${ids}-identifierKind-err` : undefined}
              />
            </div>
            {errors.identifierKind && (
              <FieldError id={`${ids}-identifierKind-err`}>{errors.identifierKind}</FieldError>
            )}
            {answers.identifierKind && answers.identifierKind !== "none" && (
              <div className="mt-6 max-w-md">
                <Label htmlFor={`${ids}-identifier`}>
                  {IDENTIFIER_LABELS[answers.identifierKind]}
                </Label>
                <Input
                  id={`${ids}-identifier`}
                  className="tnum mt-2 font-mono"
                  value={answers.identifier}
                  onChange={(e) => set("identifier", e.target.value)}
                  inputMode={
                    answers.identifierKind === "folio"
                      ? "text"
                      : answers.identifierKind === "dp_client"
                        ? "text"
                        : "numeric"
                  }
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={32}
                  aria-invalid={errors.identifier ? true : undefined}
                  aria-describedby={`${ids}-id-privacy${errors.identifier ? ` ${ids}-identifier-err` : ""}`}
                />
                {errors.identifier && (
                  <FieldError id={`${ids}-identifier-err`}>{errors.identifier}</FieldError>
                )}
                <p
                  id={`${ids}-id-privacy`}
                  className="mt-2 flex items-start gap-1.5 text-sm text-fg-3"
                >
                  <LockSimpleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  Used only for this check. Not stored in this demo.
                </p>
              </div>
            )}
          </fieldset>
        )}

        {key === "holder" && (
          <fieldset>
            <legend className="mb-2">
              <Question id={questionId} headingRef={headingRef}>
                How is it held?
              </Question>
            </legend>
            <p className="mb-6 text-lg text-fg-2">This decides which documents are needed.</p>
            <div id={`${ids}-holderType`} tabIndex={-1} className="focus:outline-none">
              <OptionCards
                name="holderType"
                value={answers.holderType}
                onChange={(v) => set("holderType", v)}
                options={HOLDER_OPTIONS}
                labelledBy={questionId}
                errorId={errors.holderType ? `${ids}-holderType-err` : undefined}
              />
            </div>
            {errors.holderType && (
              <FieldError id={`${ids}-holderType-err`}>{errors.holderType}</FieldError>
            )}
          </fieldset>
        )}

        {key === "review" && asset && (
          <div>
            <Question id={questionId} headingRef={headingRef}>
              Check your answers
            </Question>
            <p className="mt-3 text-lg text-fg-2">
              Nothing has been sent anywhere yet. The check runs our route rules on these answers.
            </p>
            <dl className="panel mt-8 divide-y divide-line">
              {[
                { label: "Holding", value: ASSET_LABELS[asset], to: 0 },
                {
                  label: ISSUER_COPY[asset].label,
                  value: answers.issuerUnknown ? "Don't know" : answers.issuerName.trim(),
                  to: 1,
                },
                {
                  label: DATE_COPY[asset].lastLabel,
                  value: answers.lastYear === "unknown" ? "Don't remember" : answers.lastYear,
                  to: 2,
                },
                {
                  label: "Year bought or opened",
                  value:
                    answers.acquiredYear === ""
                      ? "Not given"
                      : answers.acquiredYear === "unknown"
                        ? "Don't remember"
                        : answers.acquiredYear,
                  to: 2,
                },
                {
                  label: "Reference",
                  value:
                    answers.identifierKind && answers.identifierKind !== "none"
                      ? `${IDENTIFIER_LABELS[answers.identifierKind]}: ${answers.identifier.trim()}`
                      : "Not given",
                  to: 3,
                },
                {
                  label: "Held",
                  value: HOLDER_OPTIONS.find((h) => h.value === answers.holderType)?.title ?? "",
                  to: 4,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="grid gap-1 px-5 py-3.5 sm:grid-cols-[14rem_1fr_auto] sm:items-center sm:gap-4"
                >
                  <dt className="text-base text-fg-3">{row.label}</dt>
                  <dd className="tnum min-w-0 font-medium break-words text-fg">{row.value}</dd>
                  <dd>
                    <button
                      type="button"
                      onClick={() => go(row.to)}
                      className="link inline-flex min-h-11 items-center text-base font-medium"
                    >
                      Change<span className="sr-only"> {row.label.toLowerCase()}</span>
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pending} aria-busy={pending || undefined}>
            {key === "review" ? (pending ? "Running the check…" : "Run the check") : "Continue"}
            {!pending && <ArrowRightIcon weight="bold" aria-hidden="true" />}
          </Button>
          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => go(step - 1)}
              disabled={pending}
            >
              <ArrowLeftIcon weight="bold" aria-hidden="true" />
              Back
            </Button>
          )}
          <span role="status" aria-live="polite" className="text-base text-fg-3">
            {pending ? "Running the check. This takes a moment." : ""}
          </span>
        </div>
      </form>
    </div>
  );
}
