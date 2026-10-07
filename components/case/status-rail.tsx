import { CheckIcon, WarningCircleIcon, MinusIcon } from "@phosphor-icons/react/dist/ssr";

import type { CaseStatus } from "@/lib/types";
import { railProgress, railStates, stateInfo, type RailStepState } from "@/lib/rules/case-states";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SR_STATE: Record<RailStepState, string> = {
  done: "Completed",
  current: "Current step",
  blocked: "Blocked, needs action",
  upcoming: "Upcoming",
  skipped: "Skipped",
  not_needed: "Not needed",
};

function Marker({ state, branch }: { state: RailStepState; branch?: boolean }) {
  const base =
    "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-ink-850";
  switch (state) {
    case "done":
      return (
        <span className={cn(base, "border-confirmed/60 bg-confirmed-wash text-confirmed")}>
          <CheckIcon weight="bold" className="size-3.5" aria-hidden="true" />
        </span>
      );
    case "current":
      return (
        <span className={cn(base, "animate-marker border-signal bg-signal-wash")}>
          <span className="size-2.5 rounded-full bg-signal" />
        </span>
      );
    case "blocked":
      return (
        <span className={cn(base, "animate-marker border-blocker bg-blocker-wash text-blocker")}>
          <WarningCircleIcon weight="bold" className="size-4" aria-hidden="true" />
        </span>
      );
    case "not_needed":
    case "skipped":
      return (
        <span className={cn(base, "border-dashed border-control text-fg-3")}>
          <MinusIcon className="size-3.5" aria-hidden="true" />
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
    <section aria-labelledby="rail-heading" className="panel p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="rail-heading"
          className="text-base font-semibold tracking-[-0.005em] text-fg [font-stretch:100%]"
        >
          Evidence to credit
        </h2>
        <p className="text-sm text-fg-3">
          <span className="tnum">
            Step {step} of {total}:
          </span>{" "}
          <span className={cn("font-semibold", isBlocked ? "text-blocker" : "text-fg")}>
            {current.label}
          </span>
        </p>
      </div>

      {/* Narrow screens: summary bar plus an expandable vertical list */}
      <div className="mt-5 lg:hidden">
        <div className="flex gap-1" aria-hidden="true">
          {steps
            .filter((s) => !s.info.branch)
            .map(({ info, state }) => (
              <span
                key={info.status}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  state === "done" && "bg-confirmed/70",
                  state === "current" && (isBlocked ? "bg-blocker" : "bg-signal"),
                  (state === "upcoming" || state === "skipped") && "bg-line",
                )}
              />
            ))}
        </div>
        <p className="mt-4 text-base text-fg-2">{current.description}</p>
        <details className="group mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-fg underline decoration-fg/30 underline-offset-[0.22em] hover:decoration-signal">
            <span className="group-open:hidden">Show all {steps.length} steps</span>
            <span className="hidden group-open:inline">Hide steps</span>
          </summary>
          <ol className="mt-4">
            {steps.map(({ info, state }, i) => (
              <li key={info.status} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-7 bottom-0 left-[13px] w-px",
                      state === "done" ? "bg-confirmed/50" : "bg-line",
                    )}
                  />
                )}
                <Marker state={state} branch={info.branch} />
                <div className="min-w-0 pt-0.5">
                  <p
                    className={cn(
                      "font-medium",
                      state === "upcoming" || state === "not_needed" ? "text-fg-3" : "text-fg",
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
                          ? "font-semibold text-blocker"
                          : state === "current"
                            ? "font-semibold text-signal"
                            : "text-fg-3",
                      )}
                    >
                      {stateCaption(state, info.branch)}
                    </p>
                  )}
                  {reachedAt.has(info.status) && state === "done" && (
                    <p className="tnum text-sm text-fg-3">
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
      <ol className="mt-8 hidden grid-cols-12 lg:grid">
        {steps.map(({ info, state }, i) => {
          const caption = stateCaption(state, info.branch);
          const next = steps[i + 1];
          const joinsDone =
            state === "done" &&
            (next?.state === "done" || next?.state === "current" || next?.state === "blocked");
          const dashed = info.branch || next?.info.branch;
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
                    "absolute top-[13px] left-1/2 w-full",
                    dashed
                      ? "h-0 border-t border-dashed border-control"
                      : joinsDone
                        ? "h-px bg-confirmed/60"
                        : "h-px bg-line",
                  )}
                />
              )}
              <Marker state={state} branch={info.branch} />
              <span
                className={cn(
                  "mt-3 text-sm leading-tight",
                  state === "current" && "font-semibold text-fg",
                  state === "blocked" && "font-semibold text-blocker",
                  state === "done" && "text-fg-2",
                  (state === "upcoming" || state === "not_needed" || state === "skipped") &&
                    "text-fg-3",
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
                    "mt-1 text-xs",
                    state === "blocked"
                      ? "font-semibold text-blocker"
                      : state === "current"
                        ? "font-semibold text-signal"
                        : "text-fg-3",
                  )}
                >
                  {caption}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-7 hidden border-t border-line pt-5 text-base text-fg-2 lg:block">
        {current.description}
      </p>
    </section>
  );
}
