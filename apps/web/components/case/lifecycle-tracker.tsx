"use client";

import { useId, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { CheckIcon, ChevronDownIcon, CircleAlertIcon, MinusIcon } from "lucide-react";

import type { CaseStatus, NextStep } from "@/lib/types";
import type { LifecycleStage, StageState } from "@/lib/rules/lifecycle";
import type { RailStepState } from "@/lib/rules/case-states";
import { stateInfo } from "@/lib/rules/case-states";
import { formatDate, formatDayMonth, formatDays } from "@/lib/format";
import { SPRING_SOFT, EXIT } from "@/lib/motion/springs";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { RouteTimeline } from "@/components/viz/route-timeline";
import { cn } from "@/lib/utils";

const SR_STAGE: Record<StageState, string> = {
  done: "completed",
  current: "in progress",
  blocked: "blocked, needs action",
  upcoming: "not started",
  skipped: "not needed",
};

const SR_STEP: Record<RailStepState, string> = {
  done: "completed",
  current: "current",
  blocked: "blocked",
  upcoming: "not reached",
  skipped: "skipped",
  not_needed: "not needed",
};

const DATE_WORD: Record<NextStep["dateMeaning"], string> = {
  due: "Due",
  expected: "Expected",
  follow_up: "We follow up on",
};

function StageNode({ stage }: { stage: LifecycleStage }) {
  const base = "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border";
  switch (stage.state) {
    case "done":
      return (
        <span className={cn(base, "border-confirmed/50 bg-confirmed-wash text-confirmed")}>
          <CheckIcon className="size-4" strokeWidth={2.25} />
        </span>
      );
    case "current":
      return (
        <span className={cn(base, "border-signal bg-signal-wash")}>
          <span className="absolute inset-0 animate-ping rounded-full border border-signal/50" />
          <span className="size-2.5 rounded-full bg-brand-cyan shadow-[0_0_10px_var(--color-brand-cyan)]" />
        </span>
      );
    case "blocked":
      return (
        <span className={cn(base, "border-blocker bg-blocker-wash text-blocker")}>
          <span className="absolute inset-0 animate-ping rounded-full border border-blocker/50" />
          <CircleAlertIcon className="size-4" />
        </span>
      );
    case "skipped":
      return (
        <span className={cn(base, "border-dashed border-control text-fg-3")}>
          <MinusIcon className="size-4" />
        </span>
      );
    default:
      return (
        <span
          className={cn(
            base,
            "tnum border-(--glass-border) bg-(--glass-elevated) text-sm font-semibold text-fg-3",
          )}
        >
          {stage.index + 1}
        </span>
      );
  }
}

function stageMeta(stage: LifecycleStage): string {
  if (stage.state === "upcoming") return "Not started";
  if (stage.state === "skipped") return "Not needed on this case";
  if (!stage.startedAt) return "";
  if (stage.state === "done") {
    return stage.endedAt
      ? `${formatDayMonth(stage.startedAt)} to ${formatDayMonth(stage.endedAt)} · ${formatDays(stage.days ?? 0)}`
      : `From ${formatDayMonth(stage.startedAt)}`;
  }
  const so = stage.days ? `${formatDays(stage.days)} so far` : "started today";
  return `Since ${formatDate(stage.startedAt)} · ${so}`;
}

/**
 * The case on one route: six IEPF lifecycle stages, each opening to the
 * exact case states inside it with the dates they were reached. A Timeline
 * tab shows the same history drawn to scale.
 */
export function LifecycleTracker({
  stages,
  status,
  history,
  updatedAt,
  nextStep,
}: {
  stages: LifecycleStage[];
  status: CaseStatus;
  history: { status: CaseStatus; at: string }[];
  updatedAt: string;
  nextStep: NextStep;
}) {
  const ids = useId();
  const current = stages.find((s) => s.state === "current" || s.state === "blocked") ?? stages[0];
  const [open, setOpen] = useState<number | null>(current.index);
  const blocked = current.state === "blocked";

  const stagesView = (
    <ol className="mt-6">
      {stages.map((stage, i) => {
        const expanded = open === stage.index;
        const panelId = `${ids}-stage-${stage.index}`;
        const last = i === stages.length - 1;
        const live = stage.state === "current" || stage.state === "blocked";
        return (
          <li key={stage.key} className="relative flex gap-4 pb-2 last:pb-0">
            {/* The route between stages: lit once the stage below has begun. */}
            {!last && (
              <span
                aria-hidden="true"
                className="absolute top-10 bottom-0 left-[17px] w-px overflow-hidden bg-line"
              >
                <span
                  className={cn(
                    "block size-full origin-top bg-gradient-to-b from-confirmed to-signal transition-transform duration-700 ease-(--ease-vault)",
                    stage.state === "done" ? "scale-y-100" : "scale-y-0",
                  )}
                />
              </span>
            )}
            <StageNode stage={stage} />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : stage.index)}
                className={cn(
                  "group flex min-h-11 w-full items-start justify-between gap-3 rounded-[var(--radius-control)] px-2 py-1.5 text-left transition-colors duration-150 hover:bg-(--glass-elevated)",
                  live && "bg-(--glass-elevated)",
                )}
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "font-semibold",
                        stage.state === "upcoming" || stage.state === "skipped"
                          ? "text-fg-2"
                          : stage.state === "blocked"
                            ? "text-blocker"
                            : "text-fg",
                      )}
                    >
                      {stage.label}
                    </span>
                    {stage.regulatory && (
                      <span className="rounded-full border border-iepf/35 bg-iepf-wash px-1.5 py-px text-xs font-medium text-iepf">
                        IEPF
                      </span>
                    )}
                    <span className="sr-only">, {SR_STAGE[stage.state]}</span>
                  </span>
                  <span
                    className={cn(
                      "tnum mt-0.5 block text-sm",
                      live ? (blocked ? "text-blocker" : "text-signal") : "text-fg-3",
                    )}
                  >
                    {stageMeta(stage)}
                  </span>
                </span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(
                    "mt-1 size-4 shrink-0 text-fg-3 transition-transform duration-200 ease-(--ease-out) group-hover:text-fg-2",
                    expanded && "rotate-180",
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <m.div
                    id={panelId}
                    key="panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1, transition: SPRING_SOFT }}
                    exit={{ height: 0, opacity: 0, transition: EXIT }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pt-2 pb-4">
                      <p className="text-base text-fg-2">{stage.description}</p>
                      {live && (
                        <p className="tnum mt-3 rounded-[var(--radius-control)] border border-(--glass-border) bg-(--glass-elevated) px-3 py-2 text-sm text-fg-2">
                          <span className="font-semibold text-fg">
                            {DATE_WORD[nextStep.dateMeaning]} {formatDate(nextStep.nextDate)}
                          </span>{" "}
                          · waiting for {nextStep.waitingFor}
                        </p>
                      )}
                      <ul className="mt-3 space-y-1.5">
                        {stage.steps.map((st) => (
                          <li key={st.status} className="flex items-baseline gap-2.5 text-sm">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "size-1.5 shrink-0 translate-y-[-1px] rounded-full",
                                st.state === "done" && "bg-status-success",
                                st.state === "current" && "bg-brand-cyan",
                                st.state === "blocked" && "bg-status-error",
                                (st.state === "upcoming" ||
                                  st.state === "skipped" ||
                                  st.state === "not_needed") &&
                                  "bg-control",
                              )}
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1",
                                st.state === "upcoming" || st.state === "not_needed"
                                  ? "text-fg-3"
                                  : "text-fg",
                              )}
                            >
                              {stateInfo(st.status).label}
                              <span className="sr-only">: {SR_STEP[st.state]}</span>
                            </span>
                            <span className="tnum shrink-0 text-fg-3">
                              {st.at
                                ? formatDate(st.at)
                                : st.state === "not_needed"
                                  ? "Not needed"
                                  : "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <section aria-labelledby={`${ids}-heading`} className="panel p-5 sm:p-6">
      <SegmentedTabs
        label="View the lifecycle as"
        heading={
          <div className="min-w-0">
            <h2
              id={`${ids}-heading`}
              className="text-base font-semibold tracking-[-0.005em] text-fg [font-stretch:100%]"
            >
              IEPF lifecycle
            </h2>
            <p className="mt-0.5 text-sm text-fg-3">
              <span className="tnum">
                Stage {current.index + 1} of {stages.length}:
              </span>{" "}
              <span className={cn("font-semibold", blocked ? "text-blocker" : "text-fg")}>
                {current.label}
              </span>
            </p>
          </div>
        }
        tabs={[
          { id: "stages", label: "Stages", content: stagesView },
          {
            id: "timeline",
            label: "Timeline",
            content: (
              <RouteTimeline
                history={history}
                status={status}
                updatedAt={updatedAt}
                next={{
                  date: nextStep.nextDate,
                  meaning: nextStep.dateMeaning,
                  waitingFor: nextStep.waitingFor,
                }}
              />
            ),
          },
        ]}
      />
    </section>
  );
}
