import { Check, CircleAlert, Minus } from "lucide-react";

import type { CaseStatus } from "@/lib/types";
import { railProgress, railStates, stateInfo, type RailStepState } from "@/lib/rules/case-states";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SR_STATE: Record<RailStepState, string> = {
  done: "Completed",
  current: "Current step",
  blocked: "Blocked — needs action",
  upcoming: "Upcoming",
  skipped: "Skipped",
  not_needed: "Not needed",
};

function Marker({ state, branch }: { state: RailStepState; branch?: boolean }) {
  const base =
    "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 bg-pearl";
  switch (state) {
    case "done":
      return (
        <span className={cn(base, "border-teal bg-teal text-pearl")}>
          <Check className="size-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
      );
    case "current":
      return (
        <span className={cn(base, "animate-milestone border-brass")}>
          <span className="size-3 rounded-full bg-brass" />
        </span>
      );
    case "blocked":
      return (
        <span className={cn(base, "animate-milestone border-alert bg-alert-wash text-alert")}>
          <CircleAlert className="size-4" strokeWidth={2.5} aria-hidden="true" />
        </span>
      );
    case "not_needed":
    case "skipped":
      return (
        <span className={cn(base, "border-dashed border-control text-slate")}>
          <Minus className="size-3.5" aria-hidden="true" />
        </span>
      );
    default:
      return (
        <span className={cn(base, branch ? "border-dashed border-control" : "border-control")} />
      );
  }
}

function stateCaption(state: RailStepState, branch?: boolean): string | null {
  if (state === "current") return "Now";
  if (state === "blocked") return "Blocker";
  if (state === "not_needed") return "Not needed";
  if (branch && state === "upcoming") return "Only if needed";
  return null;
}

export function StatusRail({
  status,
  history,
}: {
  status: CaseStatus;
  history: { status: CaseStatus; at: string }[];
}) {
  const steps = railStates(status, history);
  const { step, total } = railProgress(status);
  const current = stateInfo(status);
  const reachedAt = new Map(history.map((h) => [h.status, h.at]));
  const isBlocked = status === "query_deficiency";

  return (
    <section
      aria-labelledby="rail-heading"
      className="rounded-lg border border-line bg-pearl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="rail-heading" className="eyebrow text-slate">
          Evidence to credit
        </h2>
        <p className="text-sm text-slate">
          <span className="tnum">
            Step {step} of {total}
          </span>
          {" · "}
          <span className={cn("font-semibold", isBlocked ? "text-alert" : "text-ink")}>
            {current.label}
          </span>
        </p>
      </div>

      {/* Narrow screens: summary bar + expandable vertical list */}
      <div className="mt-4 lg:hidden">
        <div className="flex gap-1" aria-hidden="true">
          {steps
            .filter((s) => !s.info.branch)
            .map(({ info, state }) => (
              <span
                key={info.status}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors duration-200",
                  state === "done" && "bg-teal",
                  state === "current" && (isBlocked ? "bg-alert" : "bg-brass"),
                  (state === "upcoming" || state === "skipped") && "bg-line",
                )}
              />
            ))}
        </div>
        <p className="mt-3 text-base text-ink">{current.description}</p>
        <details className="group mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
            <span className="group-open:hidden">Show all {steps.length} steps</span>
            <span className="hidden group-open:inline">Hide steps</span>
          </summary>
          <ol className="mt-3 space-y-0">
            {steps.map(({ info, state }, i) => (
              <li key={info.status} className="relative flex gap-3 pb-4 last:pb-0">
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-7 bottom-0 left-[13px] w-0.5",
                      state === "done" ? "bg-teal" : "bg-line",
                    )}
                  />
                )}
                <Marker state={state} branch={info.branch} />
                <div className="min-w-0 pt-0.5">
                  <p
                    className={cn(
                      "font-medium",
                      state === "upcoming" || state === "not_needed" ? "text-slate" : "text-ink",
                    )}
                  >
                    {info.label}
                    <span className="sr-only">: {SR_STATE[state]}</span>
                  </p>
                  {stateCaption(state, info.branch) && (
                    <p
                      aria-hidden="true"
                      className={cn(
                        "text-sm",
                        state === "blocked"
                          ? "font-semibold text-alert"
                          : state === "current"
                            ? "font-semibold text-brass-ink"
                            : "text-slate",
                      )}
                    >
                      {stateCaption(state, info.branch)}
                    </p>
                  )}
                  {reachedAt.has(info.status) && state === "done" && (
                    <p className="tnum text-sm text-slate">
                      {formatDate(reachedAt.get(info.status)!)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </details>
      </div>

      {/* Wide screens: the full horizontal rail */}
      <ol className="mt-6 hidden grid-cols-12 lg:grid">
        {steps.map(({ info, state }, i) => {
          const caption = stateCaption(state, info.branch);
          const nextState = steps[i + 1]?.state;
          return (
            <li
              key={info.status}
              aria-current={info.status === status ? "step" : undefined}
              className="relative flex flex-col items-center px-1 text-center"
            >
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[13px] left-1/2 h-0.5 w-full",
                    state === "done" &&
                      (nextState === "done" || nextState === "current" || nextState === "blocked")
                      ? "bg-teal"
                      : "bg-line",
                    (info.branch || steps[i + 1]?.info.branch) &&
                      "bg-transparent border-t-2 border-dashed border-line h-0",
                  )}
                />
              )}
              <Marker state={state} branch={info.branch} />
              <span
                className={cn(
                  "mt-2 text-sm leading-tight",
                  state === "current" && "font-semibold text-ink",
                  state === "blocked" && "font-semibold text-alert",
                  state === "done" && "text-ink",
                  (state === "upcoming" || state === "not_needed" || state === "skipped") &&
                    "text-slate",
                )}
              >
                {info.short}
                <span className="sr-only">
                  {" "}
                  ({info.label}): {SR_STATE[state]}
                </span>
              </span>
              {caption && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 text-xs",
                    state === "blocked"
                      ? "font-semibold text-alert"
                      : state === "current"
                        ? "font-semibold text-brass-ink"
                        : "text-slate",
                  )}
                >
                  {caption}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-5 hidden text-base text-ink lg:block">{current.description}</p>
    </section>
  );
}
