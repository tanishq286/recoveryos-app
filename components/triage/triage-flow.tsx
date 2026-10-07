"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import {
  AnimatePresence,
  m,
  useIsPresent,
  useReducedMotion,
  useSpring,
  type Variants,
} from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  ChartCandlestickIcon,
  ChartPieIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  CornerDownLeftIcon,
  LandmarkIcon,
  LockIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

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
import { StepBreadcrumb } from "@/components/ui/step-breadcrumb";
import { AssessmentResult } from "@/components/triage/assessment-result";
import { DiagnosticReceipt } from "@/components/triage/diagnostic-receipt";
import { EXIT, SPRING_SOFT } from "@/lib/motion/springs";
import type { TriagePrefill } from "@/lib/triage-prefill";
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

const BREADCRUMB = STEPS.map((s) => ({ key: s.key, label: s.short }));
const REVIEW = STEPS.length - 1;

/** The four holding types the route rules know about, one card each. */
const ASSET_OPTIONS: {
  value: AssetType;
  title: string;
  body: string;
  /** Who usually holds it now. Factual, not a route promise. */
  heldBy: string;
  Icon: LucideIcon;
}[] = [
  {
    value: "iepf_shares_dividends",
    title: "Shares or dividends",
    body: "Old share certificates, dividend warrants never cashed, or shares a company moved to IEPF.",
    heldBy: "The company's registrar, or IEPF",
    Icon: ChartCandlestickIcon,
  },
  {
    value: "mutual_funds",
    title: "Mutual funds",
    body: "Folios you have lost track of, or redemptions and dividends never received.",
    heldBy: "The fund house (AMC)",
    Icon: ChartPieIcon,
  },
  {
    value: "provident_fund",
    title: "Provident fund (PF)",
    body: "EPF from a past job that was never withdrawn or transferred.",
    heldBy: "EPFO",
    Icon: BriefcaseBusinessIcon,
  },
  {
    value: "bank_deposits",
    title: "Bank deposits",
    body: "Savings accounts or fixed deposits not touched for many years.",
    heldBy: "The bank, or RBI's DEA Fund",
    Icon: LandmarkIcon,
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

function fromPrefill(p: TriagePrefill | null): Answers {
  if (!p) return EMPTY;
  return {
    ...EMPTY,
    assetType: p.assetType,
    issuerName: p.issuerName ?? "",
    identifierKind: p.identifierKind,
    identifier: p.identifier ?? "",
  };
}

/** Where a prefilled check opens: the first question the home page didn't answer. */
function firstOpenStep(p: TriagePrefill | null): number {
  if (!p) return 0;
  return p.issuerName ? 2 : 1;
}

/**
 * The same rules the check has always used, for any step. Jumping forward
 * through the stepper runs these on every step in between, so an answer
 * invalidated by an earlier edit is caught exactly as Continue would.
 */
function validateStep(key: StepKey, a: Answers): Record<string, string> {
  const e: Record<string, string> = {};
  const asset = a.assetType;
  if (key === "asset" && !asset) e.assetType = "Choose what kind of holding it is.";
  if (key === "issuer" && asset && !a.issuerUnknown && !a.issuerName.trim())
    e.issuerName = `Enter the ${ISSUER_COPY[asset].label.toLowerCase()}, or tick “I don't know”.`;
  if (key === "dates" && !a.lastYear) e.lastYear = "Choose a year, or “I don't remember”.";
  if (key === "reference") {
    if (!a.identifierKind) e.identifierKind = "Choose one option.";
    else if (a.identifierKind !== "none") {
      const v = a.identifier.trim();
      if (!v)
        e.identifier = `Enter the ${IDENTIFIER_LABELS[a.identifierKind].toLowerCase()}, or choose “I don't have it”.`;
      else {
        const problem = validateIdentifier(a.identifierKind, v);
        if (problem)
          e.identifier = `That doesn't look like a ${IDENTIFIER_LABELS[a.identifierKind].toLowerCase()}. Expected ${problem}.`;
      }
    }
  }
  if (key === "holder" && !a.holderType) e.holderType = "Choose how the holding is held.";
  return e;
}

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

function Question({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h1
      id={id}
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
      <CircleAlertIcon className="mt-1 size-4 shrink-0" aria-hidden="true" />
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
              "panel vault-card flex cursor-pointer items-start gap-3 p-4 transition-[border-color,box-shadow,transform] duration-[160ms] ease-(--ease-out) active:scale-[0.99]",
              checked
                ? "border-signal shadow-[inset_0_0_0_1px_var(--color-signal),0_16px_36px_-20px_var(--color-signal)]"
                : "hover:border-(--glass-border-hover)",
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

/**
 * One holding card. It leans a few degrees toward the cursor (fine pointers,
 * motion allowed) and lifts on hover; the lit edge comes from .vault-card.
 */
function AssetCard({
  option,
  id,
  checked,
}: {
  option: (typeof ASSET_OPTIONS)[number];
  id: string;
  checked: boolean;
}) {
  const reduce = useReducedMotion();
  const rotateX = useSpring(0, { stiffness: 260, damping: 26 });
  const rotateY = useSpring(0, { stiffness: 260, damping: 26 });
  const { Icon } = option;

  function onPointerMove(e: React.PointerEvent<HTMLLabelElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * 7);
    rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * 7);
  }
  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <m.label
      htmlFor={id}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={cn(
        "panel vault-card group relative flex min-h-[11.5rem] cursor-pointer flex-col p-5 transition-[border-color,box-shadow] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-signal",
        checked
          ? "border-signal shadow-[inset_0_0_0_1px_var(--color-signal),0_24px_48px_-20px_rgb(0_242_254/0.45)]"
          : "hover:border-(--glass-border-hover) hover:shadow-[var(--glass-rim),var(--glass-shadow-hover)]",
      )}
    >
      <span className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-11 place-items-center rounded-[12px] border transition-[background-color,border-color,color] duration-200",
            checked
              ? "border-transparent bg-brand text-on-brand"
              : "border-signal/25 bg-signal-wash text-signal",
          )}
        >
          <Icon className="size-[1.375rem]" />
        </span>
        <RadioGroupItem id={id} value={option.value} />
      </span>
      <span className="mt-5 block text-lg font-semibold text-fg">{option.title}</span>
      <span className="mt-1 block text-base text-fg-2">{option.body}</span>
      <span className="mt-auto block pt-4 text-sm text-fg-3">
        Usually with: <span className="text-fg-2">{option.heldBy}</span>
      </span>
    </m.label>
  );
}

function AssetCards({
  value,
  onChange,
  errorId,
  labelledBy,
}: {
  value: AssetType | null;
  onChange: (v: AssetType) => void;
  errorId?: string;
  labelledBy: string;
}) {
  const base = useId();
  return (
    <RadioGroup
      name="assetType"
      value={value ?? ""}
      onValueChange={(v) => onChange(v as AssetType)}
      aria-labelledby={labelledBy}
      aria-describedby={errorId}
      aria-invalid={errorId ? true : undefined}
      className="grid gap-4 sm:grid-cols-2"
    >
      {ASSET_OPTIONS.map((o) => (
        <AssetCard key={o.value} option={o} id={`${base}-${o.value}`} checked={value === o.value} />
      ))}
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
  // Native select (keyboard, screen readers and phone pickers all work), with
  // the platform arrow swapped for the icon set's chevron.
  return (
    <div className="relative max-w-xs">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className="tnum block min-h-12 w-full cursor-pointer appearance-none rounded-[var(--radius-control)] border border-control bg-(--glass-elevated) py-2.5 pr-10 pl-3.5 text-base text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] transition-[border-color,box-shadow] duration-[160ms] hover:border-fg-3 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--selection)] aria-invalid:border-blocker"
      >
        <option value="">Choose a year</option>
        <option value="unknown">I don&apos;t remember</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-3"
      />
    </div>
  );
}

/* Steps slide in from the side you are heading, through a soft blur. */
const STEP_VARIANTS: Variants = {
  enter: (dir: number) => ({ x: 20 * dir, opacity: 0, filter: "blur(6px)" }),
  center: { x: 0, opacity: 1, filter: "blur(0px)", transition: SPRING_SOFT },
  exit: (dir: number) => ({ x: -20 * dir, opacity: 0, filter: "blur(4px)", transition: EXIT }),
};

/**
 * One step's form. While a step is leaving (its exit is still playing) it is
 * inert and hidden from assistive tech, so only the arriving step can be used.
 */
function StepForm({
  ref,
  custom,
  onSubmit,
  children,
}: {
  ref?: React.Ref<HTMLFormElement>;
  custom: number;
  onSubmit: (ev: FormEvent) => void;
  children: React.ReactNode;
}) {
  const present = useIsPresent();
  return (
    <m.form
      ref={ref}
      custom={custom}
      variants={STEP_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      onSubmit={onSubmit}
      noValidate
      inert={!present}
      aria-hidden={present ? undefined : true}
    >
      {children}
    </m.form>
  );
}

/* ------------------------------------------------------------------ main */

export function TriageFlow({
  maxYear,
  prefill = null,
}: {
  maxYear: number;
  /** Answers carried in from the home page's quick-scan bar. */
  prefill?: TriagePrefill | null;
}) {
  const [step, setStep] = useState(() => firstOpenStep(prefill));
  // Highest step reached: the stepper lets people jump anywhere up to here.
  const [furthest, setFurthest] = useState(() => firstOpenStep(prefill));
  // Which way the last step change went (+1 forward, -1 back): the next
  // question slides in from the matching side.
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Answers>(() => fromPrefill(prefill));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EligibilityAssessment | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const ids = useId();

  const key: StepKey = STEPS[step].key;
  const asset = answers.assetType;
  const questionId = `${ids}-q-${key}`;

  // Move focus to the question on every step change (not on first load).
  // By id, not ref: during a transition the leaving step is still mounted.
  useEffect(() => {
    if (!moved.current) return;
    if (result) resultHeadingRef.current?.focus();
    else document.getElementById(questionId)?.focus();
  }, [questionId, result]);

  function set<K extends keyof Answers>(k: K, v: Answers[K]) {
    setAnswers((a) => ({ ...a, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: "" }));
  }

  function go(to: number) {
    moved.current = true;
    setDir(to < step ? -1 : 1);
    setErrors({});
    setSubmitError(null);
    setStep(to);
    setFurthest((f) => Math.max(f, to));
  }

  function showErrors(e: Record<string, string>) {
    setErrors(e);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  /**
   * Stepper and "return to review": going back is free; going forward checks
   * every step on the way, and stops at the first one that needs an answer.
   */
  function jump(to: number) {
    if (to <= step) return go(to);
    for (let i = step; i < to; i++) {
      const e = validateStep(STEPS[i].key, answers);
      if (Object.values(e).some(Boolean)) {
        if (i !== step) go(i);
        requestAnimationFrame(() => showErrors(e));
        return;
      }
    }
    go(to);
  }

  function onContinue(ev: FormEvent) {
    ev.preventDefault();
    const e = validateStep(key, answers);
    if (Object.values(e).some(Boolean)) return showErrors(e);
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
    setDir(-1);
    setStep(0);
    setFurthest(0);
  }

  if (result) {
    return (
      <AssessmentResult assessment={result} onRestart={restart} headingRef={resultHeadingRef} />
    );
  }

  const errorList = Object.entries(errors).filter(([, v]) => v);
  const editingEarlier = furthest === REVIEW && step < REVIEW;

  return (
    <div>
      <div className="mb-10">
        <StepBreadcrumb
          steps={BREADCRUMB}
          current={step}
          furthest={furthest}
          onSelect={jump}
          disabled={pending}
        />
      </div>

      {prefill && step === firstOpenStep(prefill) && furthest === step && (
        <p className="mb-6 flex items-start gap-2 rounded-[var(--radius-control)] border border-signal/25 bg-signal-wash px-3.5 py-2.5 text-base text-fg-2">
          <SparklesIcon className="mt-1 size-4 shrink-0 text-signal" aria-hidden="true" />
          <span>
            We filled in what you typed on the home page. Use the steps above to change it.
          </span>
        </p>
      )}

      {(errorList.length > 0 || submitError) && (
        <div ref={errorRef} tabIndex={-1} className="mb-6 focus:outline-none">
          <Alert variant="blocker" role="alert" className="animate-arrive">
            <CircleAlertIcon aria-hidden="true" />
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

      <div className="relative">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <StepForm key={key} custom={dir} onSubmit={onContinue}>
            {key === "asset" && (
              <fieldset>
                <legend className="mb-2">
                  <Question id={questionId}>What are you trying to recover?</Question>
                </legend>
                <p className="mb-6 text-lg text-fg-2">
                  Choose the closest. You can run the check again for another holding.
                </p>
                <div id={`${ids}-assetType`} tabIndex={-1} className="focus:outline-none">
                  <AssetCards
                    value={answers.assetType}
                    onChange={(v) => {
                      set("assetType", v);
                      set("identifierKind", null);
                      set("identifier", "");
                    }}
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
                <Question id={questionId}>{ISSUER_COPY[asset].question}</Question>
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
                <Question id={questionId}>{DATE_COPY[asset].question}</Question>
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
                      Year bought or opened{" "}
                      <span className="font-normal text-fg-3">(optional)</span>
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
                  <Question id={questionId}>Do you have a reference number?</Question>
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
                        answers.identifierKind === "folio" || answers.identifierKind === "dp_client"
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
                      <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      Used only for this check. Not stored in this demo.
                    </p>
                  </div>
                )}
              </fieldset>
            )}

            {key === "holder" && (
              <fieldset>
                <legend className="mb-2">
                  <Question id={questionId}>How is it held?</Question>
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
                <Question id={questionId}>Check your answers</Question>
                <p className="mt-3 text-lg text-fg-2">
                  Nothing has been sent anywhere yet. The check runs our route rules on these
                  answers.
                </p>
                <DiagnosticReceipt
                  className="mt-8"
                  onEdit={jump}
                  rows={[
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
                      mono: !!(answers.identifierKind && answers.identifierKind !== "none"),
                      to: 3,
                    },
                    {
                      label: "Held",
                      value:
                        HOLDER_OPTIONS.find((h) => h.value === answers.holderType)?.title ?? "",
                      to: 4,
                    },
                  ]}
                  fingerprintOf={JSON.stringify(toInput(answers))}
                />
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                size="lg"
                disabled={pending}
                aria-busy={pending || undefined}
                className={key === "review" ? "sheen" : undefined}
              >
                {key === "review" ? (pending ? "Running the check…" : "Run the check") : "Continue"}
                {!pending && <ArrowRightIcon aria-hidden="true" />}
              </Button>
              {editingEarlier && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => jump(REVIEW)}
                  disabled={pending}
                >
                  <CornerDownLeftIcon aria-hidden="true" />
                  Back to review
                </Button>
              )}
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => go(step - 1)}
                  disabled={pending}
                >
                  <ArrowLeftIcon aria-hidden="true" />
                  Back
                </Button>
              )}
              <span role="status" aria-live="polite" className="text-base text-fg-3">
                {pending ? "Running the check. This takes a moment." : ""}
              </span>
            </div>
          </StepForm>
        </AnimatePresence>
      </div>
    </div>
  );
}
