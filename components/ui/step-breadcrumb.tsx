"use client";

import { m } from "framer-motion";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BreadcrumbStep {
  key: string;
  label: string;
}

/**
 * Non-linear progress: one node per step, joined by lines that fill as steps
 * are completed. Any step up to the furthest one reached is a button, so
 * people can jump back to edit an answer (and forward again) without losing
 * progress. Steps not reached yet are plain text, never fake links.
 */
export function StepBreadcrumb({
  steps,
  current,
  furthest,
  onSelect,
  disabled = false,
  label = "Progress",
}: {
  steps: readonly BreadcrumbStep[];
  current: number;
  /** Highest step index reached so far. Nodes up to here are clickable. */
  furthest: number;
  onSelect: (index: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <nav aria-label={label}>
      <p className="tnum text-sm font-medium text-fg-3">
        Step {current + 1} of {steps.length}
        <span className="text-fg-2">: {steps[current].label}</span>
      </p>
      <ol className="mt-4 flex items-start" role="list">
        {steps.map((s, i) => {
          const state = i === current ? "current" : i <= furthest ? "done" : ("upcoming" as const);
          const reachable = i <= furthest && i !== current && !disabled;
          const last = i === steps.length - 1;
          const node = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "relative grid size-7 place-items-center rounded-full border text-[0.8125rem] font-semibold transition-[background-color,border-color,color] duration-200",
                  state === "done" && "border-confirmed/50 bg-confirmed-wash text-confirmed",
                  state === "current" && "border-signal bg-signal-wash text-signal",
                  state === "upcoming" && "border-(--glass-border) bg-(--glass-panel) text-fg-3",
                )}
              >
                {state === "current" && (
                  <m.span
                    layoutId="step-breadcrumb-ring"
                    className="absolute -inset-1 rounded-full border border-signal/50 shadow-[0_0_16px_-2px_var(--color-signal)]"
                  />
                )}
                {state === "done" ? (
                  <CheckIcon className="size-3.5" strokeWidth={2.5} />
                ) : (
                  <span className="tnum">{i + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "sr-only text-sm leading-tight sm:not-sr-only sm:mt-2 sm:block",
                  state === "current" ? "font-medium text-fg" : "text-fg-3",
                  reachable && "group-hover:text-fg",
                )}
              >
                {s.label}
              </span>
              <span className="sr-only">
                {state === "current"
                  ? " (current step)"
                  : state === "done"
                    ? " (answered, go back to edit)"
                    : " (not reached yet)"}
              </span>
            </>
          );
          return (
            <li
              key={s.key}
              aria-current={state === "current" ? "step" : undefined}
              className="relative flex min-w-0 flex-1 flex-col items-center"
            >
              {/* The line to the next node: fills when the next step has been reached. */}
              {!last && (
                <span
                  aria-hidden="true"
                  className="absolute top-[0.875rem] right-[calc(-50%+1.125rem)] left-[calc(50%+1.125rem)] h-px overflow-hidden rounded-full bg-line"
                >
                  <span
                    className={cn(
                      "block h-full origin-left bg-(image:--gradient-route) transition-transform duration-500 ease-(--ease-vault)",
                      i < furthest ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </span>
              )}
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  className="group flex min-h-11 min-w-11 flex-col items-center rounded-[var(--radius-control)] px-1 pt-1"
                >
                  {node}
                </button>
              ) : (
                <span className="flex min-h-11 min-w-11 flex-col items-center px-1 pt-1">
                  {node}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
