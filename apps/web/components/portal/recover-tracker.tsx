import { CheckIcon } from "lucide-react";
import { ROLE_LABELS } from "@recoveryos/shared";

import type { CaseDetail } from "@/lib/api/types";
import { cn } from "@/lib/utils";

/**
 * R.E.C.O.V.E.R. as seven stations on a rail. Done steps carry a check,
 * the current one is lit and named for screen readers, upcoming ones are
 * quiet. A row on wide screens, a list on phones.
 */
export function RecoverTracker({ steps }: { steps: CaseDetail["steps"] }) {
  const current = steps.find((s) => s.state === "current");
  return (
    <nav aria-label="Recovery progress">
      <p className="sr-only">
        {current ? `Step ${current.step} of 7: ${current.name}.` : "All seven steps are complete."}
      </p>
      <ol className="grid gap-3 md:grid-cols-7 md:gap-0">
        {steps.map((s, i) => (
          <li
            key={s.key}
            aria-current={s.state === "current" ? "step" : undefined}
            className="relative flex gap-3 md:flex-col md:items-center md:gap-2 md:px-1 md:text-center"
          >
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-11 left-[1.375rem] h-[calc(100%-1.75rem)] w-px md:top-[1.375rem] md:left-[calc(50%+1.5rem)] md:h-px md:w-[calc(100%-3rem)]",
                  s.state === "done" ? "bg-confirmed/60" : "bg-(--glass-border)",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-[1] flex size-11 shrink-0 items-center justify-center rounded-full border text-lg font-semibold tnum transition-colors",
                s.state === "done" && "border-confirmed/50 bg-confirmed-wash text-confirmed",
                s.state === "current" &&
                  "border-signal bg-signal-wash text-fg shadow-[0_0_0_4px_var(--selection)]",
                s.state === "upcoming" && "border-(--glass-border) bg-(--glass-elevated) text-fg-3",
              )}
            >
              {s.state === "done" ? <CheckIcon className="size-5" aria-hidden="true" /> : s.letter}
            </span>
            <span className="min-w-0 pb-2 md:pb-0">
              <span
                className={cn(
                  "block text-base font-semibold",
                  s.state === "upcoming" ? "text-fg-2" : "text-fg",
                )}
              >
                <span className="sr-only">Step {s.step}: </span>
                {s.name}
                {s.state === "done" && <span className="sr-only"> (done)</span>}
              </span>
              <span className="mt-0.5 block text-sm text-fg-3 md:hidden">{s.summary}</span>
              <span className="mt-0.5 hidden text-xs text-fg-3 md:block">
                {ROLE_LABELS[s.owner]}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The client's view: Finsol's four public steps on the same rail. */
export function ServiceTracker({ steps }: { steps: CaseDetail["serviceSteps"] }) {
  const current = steps.find((s) => s.state === "current");
  return (
    <nav aria-label="Recovery progress">
      <p className="sr-only">
        {current ? `Step ${current.step} of 4: ${current.title}.` : "All four steps are complete."}
      </p>
      <ol className="grid gap-3 md:grid-cols-4 md:gap-0">
        {steps.map((s, i) => (
          <li
            key={s.step}
            aria-current={s.state === "current" ? "step" : undefined}
            className="relative flex gap-3 md:flex-col md:items-center md:gap-2 md:px-2 md:text-center"
          >
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-11 left-[1.375rem] h-[calc(100%-1.75rem)] w-px md:top-[1.375rem] md:left-[calc(50%+1.5rem)] md:h-px md:w-[calc(100%-3rem)]",
                  s.state === "done" ? "bg-confirmed/60" : "bg-(--glass-border)",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-[1] flex size-11 shrink-0 items-center justify-center rounded-full border text-lg font-semibold tnum transition-colors",
                s.state === "done" && "border-confirmed/50 bg-confirmed-wash text-confirmed",
                s.state === "current" &&
                  "border-signal bg-signal-wash text-fg shadow-[0_0_0_4px_var(--selection)]",
                s.state === "upcoming" && "border-(--glass-border) bg-(--glass-elevated) text-fg-3",
              )}
            >
              {s.state === "done" ? <CheckIcon className="size-5" aria-hidden="true" /> : s.step}
            </span>
            <span className="min-w-0 pb-2 md:pb-0">
              <span
                className={cn(
                  "block text-base font-semibold",
                  s.state === "upcoming" ? "text-fg-2" : "text-fg",
                )}
              >
                {s.title}
                {s.state === "done" && <span className="sr-only"> (done)</span>}
              </span>
              <span className="mt-0.5 block text-sm text-fg-3">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
