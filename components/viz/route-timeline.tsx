"use client";

import { useState } from "react";

import type { CaseStatus } from "@/lib/types";
import { stateInfo } from "@/lib/rules/case-states";
import { daysBetween, formatDate, formatDayMonth, formatDays, instant } from "@/lib/format";
import { cn } from "@/lib/utils";

type SegKind = "done" | "current" | "blocked" | "next";

interface Segment {
  key: string;
  label: string;
  from: string;
  to: string;
  days: number;
  kind: SegKind;
}

const SWATCH: Record<SegKind, string> = {
  done: "bg-chart-credit",
  current: "bg-chart-signal",
  blocked: "bg-blocker",
  next: "border border-dashed border-signal bg-transparent",
};

/**
 * Where the time went: each stage the case has passed through, drawn to scale
 * between its first event and the next expected date. Bars carry no text; the
 * list beside them is the readable (and screen-reader) view of the same data,
 * and hovering either one highlights the other.
 */
export function RouteTimeline({
  history,
  status,
  updatedAt,
  next,
}: {
  history: { status: CaseStatus; at: string }[];
  status: CaseStatus;
  updatedAt: string;
  next: { date: string; meaning: "due" | "expected" | "follow_up"; waitingFor: string };
}) {
  const [hover, setHover] = useState<string | null>(null);
  if (history.length === 0) return null;

  const blocked = status === "query_deficiency";
  const last = history[history.length - 1];
  const lastUpdate = instant(updatedAt) > instant(last.at) ? updatedAt : last.at;

  const segments: Segment[] = history.map((h, i) => {
    const to = history[i + 1]?.at ?? lastUpdate;
    const isLast = i === history.length - 1;
    return {
      key: `${h.status}-${i}`,
      label: stateInfo(h.status).label,
      from: h.at,
      to,
      days: daysBetween(h.at, to),
      kind: isLast ? (blocked ? "blocked" : "current") : "done",
    };
  });
  if (instant(next.date) > instant(lastUpdate)) {
    segments.push({
      key: "next",
      label: `Next: ${next.waitingFor}`,
      from: lastUpdate,
      to: next.date,
      days: daysBetween(lastUpdate, next.date),
      kind: "next",
    });
  }

  const t0 = instant(history[0].at);
  const t1 = Math.max(instant(lastUpdate), instant(next.date));
  const span = Math.max(1, t1 - t0);
  const x = (v: string) => ((instant(v) - t0) / span) * 100;

  const updateX = x(lastUpdate);
  const showUpdateLabel = updateX > 18 && updateX < 82;
  const nextWord =
    next.meaning === "due" ? "Due" : next.meaning === "expected" ? "Expected" : "Follow-up";

  return (
    <figure className="mt-6">
      <figcaption className="text-sm text-fg-3">
        Time in each stage, from the first step on {formatDate(history[0].at)} to the next date.
      </figcaption>

      {/* The bars: decorative twin of the list below. */}
      <div aria-hidden="true" className="relative mt-5 h-[4.75rem]">
        <span className="absolute top-[0.9375rem] right-0 left-0 h-px bg-line" />
        {segments.map((s, i) => {
          const left = x(s.from);
          const width = Math.max(0, x(s.to) - left);
          if (width < 0.15) return null;
          const dim = hover !== null && hover !== s.key;
          return (
            <span
              key={s.key}
              onPointerEnter={() => setHover(s.key)}
              onPointerLeave={() => setHover(null)}
              style={{
                left: `${left}%`,
                width: `calc(${width}% - 2px)`,
                animationDelay: `${i * 70}ms`,
              }}
              className={cn(
                "absolute top-[0.625rem] h-[0.6875rem] origin-left animate-bar rounded-[3px] transition-opacity duration-[160ms]",
                SWATCH[s.kind],
                dim && "opacity-35",
              )}
            />
          );
        })}
        {/* Start of the route, and the next date as an open ring */}
        <span className="absolute top-[0.6875rem] left-0 size-[0.5625rem] -translate-x-1/2 rounded-full bg-chart-signal ring-2 ring-ink-850" />
        {segments.at(-1)?.kind === "next" && (
          <span className="absolute top-[0.5rem] right-0 size-[0.9375rem] translate-x-1/2 rounded-full border-2 border-signal bg-ink-850" />
        )}
        {/* You are here: the last update, in the current stage's status colour, pulsing. */}
        <span
          className={cn(
            "absolute top-[0.5rem] size-[0.9375rem] -translate-x-1/2 animate-ping rounded-full opacity-60",
            blocked ? "bg-status-error" : "bg-brand-cyan",
          )}
          style={{ left: `${updateX}%` }}
        />
        <span
          className={cn(
            "absolute top-[0.5rem] size-[0.9375rem] -translate-x-1/2 animate-marker rounded-full ring-[3px] ring-ink-850",
            blocked ? "bg-blocker" : "bg-signal",
          )}
          style={{ left: `${updateX}%` }}
        />

        {/* Axis: start, last update, next date */}
        <span className="tnum absolute top-9 left-0 text-sm text-fg-3">
          {formatDayMonth(history[0].at)}
        </span>
        {showUpdateLabel && (
          <span
            className="tnum absolute top-9 -translate-x-1/2 text-sm whitespace-nowrap text-fg-2"
            style={{ left: `${updateX}%` }}
          >
            {formatDayMonth(lastUpdate)}
          </span>
        )}
        {segments.at(-1)?.kind === "next" && (
          <span className="tnum absolute top-9 right-0 text-right text-sm whitespace-nowrap text-fg-2">
            {nextWord} {formatDayMonth(next.date)}
          </span>
        )}
        {showUpdateLabel && (
          <span
            className="absolute top-[1.75rem] h-2 w-px bg-control"
            style={{ left: `${updateX}%` }}
          />
        )}
      </div>

      {/* The data: one row per stage */}
      <ol className="mt-2 divide-y divide-line border-t border-line">
        {segments.map((s) => (
          <li
            key={s.key}
            onPointerEnter={() => setHover(s.key)}
            onPointerLeave={() => setHover(null)}
            className={cn(
              "grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 py-2.5 transition-opacity duration-[160ms]",
              hover !== null && hover !== s.key && "opacity-55",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("relative top-px size-2.5 rounded-[3px]", SWATCH[s.kind])}
            />
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[0.9375rem]",
                  s.kind === "next" ? "text-fg-2" : "text-fg",
                  s.kind === "blocked" && "font-medium",
                )}
              >
                {s.label}
                {s.kind === "current" && <span className="text-fg-3">, now</span>}
                {s.kind === "blocked" && <span className="text-fg-3">, now, needs action</span>}
              </span>
              <span className="tnum block text-sm text-fg-3">
                {s.kind === "next"
                  ? `${nextWord} ${formatDate(s.to)}`
                  : s.kind === "done"
                    ? `${formatDayMonth(s.from)} to ${formatDayMonth(s.to)}`
                    : s.days > 0
                      ? `Since ${formatDayMonth(s.from)}, last update ${formatDayMonth(s.to)}`
                      : `Since ${formatDayMonth(s.from)}`}
              </span>
            </span>
            <span className="tnum text-right text-sm text-fg-2">
              {s.kind === "next"
                ? `${formatDays(s.days)} later`
                : (s.kind === "current" || s.kind === "blocked") && s.days === 0
                  ? ""
                  : formatDays(s.days)}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
