"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

import { formatBps, formatCount, formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

export type MetricKind = "count" | "paise" | "bps";

const FORMAT: Record<MetricKind, (n: number) => string> = {
  count: (n) => formatCount(Math.round(n)),
  paise: (n) => formatPaise(Math.round(n)),
  bps: (n) => formatBps(Math.round(n)),
};

/**
 * A figure that counts up once, the first time it scrolls into view.
 *
 * - The server renders the final value, so it is right without JavaScript.
 * - With motion allowed, CSS keeps it invisible until it starts counting (a
 *   2.4s failsafe reveals it if scripts never run), so it never flashes the
 *   final value and then drops to zero.
 * - Screen readers only ever get the final value; the moving digits are hidden.
 * - When the value changes later (e.g. after a review), it counts from the
 *   number on screen to the new one, never from zero again.
 * - Reduced motion: no count, the final value is simply there.
 */
export function MetricCounter({
  value,
  kind = "count",
  className,
  duration = 1.1,
}: {
  value: number;
  kind?: MetricKind;
  className?: string;
  /** Seconds. Long enough to read as a count, short enough not to wait for. */
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const shown = useRef<number | null>(null);
  const final = FORMAT[kind](value);

  // Hydrated: from here on the count, not the CSS failsafe, decides when it shows.
  useEffect(() => {
    if (ref.current) ref.current.dataset.metricArmed = "";
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce || (value === 0 && shown.current === null)) {
      el.textContent = final;
      el.dataset.metricReady = "";
      shown.current = value;
      return;
    }
    if (!inView) return;
    const from = shown.current ?? 0;
    if (from === value) return;
    el.textContent = FORMAT[kind](from);
    el.dataset.metricReady = "";
    const controls = animate(from, value, {
      duration: shown.current === null ? duration : duration * 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = FORMAT[kind](v);
      },
      onComplete: () => {
        shown.current = value;
      },
    });
    return () => controls.stop();
  }, [inView, reduce, value, kind, duration, final]);

  return (
    // Money keeps the slashed-zero ledger figures; plain counts use tabular
    // digits only, so a lone 0 never reads as Ø.
    <span className={cn(kind === "paise" ? "tnum" : "tabular-nums", className)}>
      <span ref={ref} aria-hidden="true" data-metric>
        {final}
      </span>
      <span className="sr-only">{final}</span>
    </span>
  );
}
