"use client";

import { useState } from "react";

import { Count } from "@/components/motion/count";
import { cn } from "@/lib/utils";

export interface ReadingCounts {
  confirmed: number;
  waiting: number;
  readOnly: number;
  notFound: number;
}

const PARTS: {
  key: keyof ReadingCounts;
  label: string;
  swatch: string;
  explain: string;
}[] = [
  {
    key: "confirmed",
    label: "Confirmed",
    swatch: "bg-chart-credit",
    explain: "You approved or corrected these. Each change is in the audit log.",
  },
  {
    key: "waiting",
    label: "Waiting for you",
    swatch: "bg-chart-signal",
    explain: "Read from a document; we need you to check them before filing.",
  },
  {
    key: "readOnly",
    label: "No check needed",
    swatch: "bg-chart-muted",
    explain: "Read by us. These don't need your confirmation.",
  },
  {
    key: "notFound",
    label: "Not found",
    swatch:
      "bg-[repeating-linear-gradient(135deg,var(--color-control)_0_1.5px,transparent_1.5px_5px)] border border-control",
    explain: "Looked for and not on the page. Left blank, never estimated.",
  },
];

/**
 * Every detail read from this case's documents, as one part-to-whole bar.
 * Counts are printed in the legend (the bar never carries text), the "not
 * found" slice is textured so it never depends on colour, and hovering or
 * focusing a legend row explains that slice.
 */
export function ReadingSummary({ counts }: { counts: ReadingCounts }) {
  const [hover, setHover] = useState<keyof ReadingCounts | null>(null);
  const total = PARTS.reduce((n, p) => n + counts[p.key], 0);
  if (total === 0) return null;
  const visible = PARTS.filter((p) => counts[p.key] > 0);
  const active = PARTS.find((p) => p.key === hover);

  return (
    <figure className="panel p-5 sm:p-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-base font-semibold text-fg">Details read so far</span>
        <span className="text-sm text-fg-3">
          <Count value={total} className="tnum text-fg-2" /> across all documents
        </span>
      </figcaption>

      <div aria-hidden="true" className="mt-4 flex h-3 gap-0.5">
        {visible.map((p, i) => (
          <span
            key={p.key}
            onPointerEnter={() => setHover(p.key)}
            onPointerLeave={() => setHover(null)}
            style={{ flexGrow: counts[p.key], animationDelay: `${i * 80}ms` }}
            className={cn(
              "min-w-1 basis-0 origin-left animate-bar transition-opacity duration-[160ms] first:rounded-l-[4px] last:rounded-r-[4px]",
              p.swatch,
              hover !== null && hover !== p.key && "opacity-35",
            )}
          />
        ))}
      </div>

      <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {PARTS.map((p) => (
          <li
            key={p.key}
            tabIndex={counts[p.key] > 0 ? 0 : -1}
            onPointerEnter={() => setHover(p.key)}
            onPointerLeave={() => setHover(null)}
            onFocus={() => setHover(p.key)}
            onBlur={() => setHover(null)}
            aria-describedby={hover === p.key ? "reading-explain" : undefined}
            className={cn(
              "flex min-h-8 items-center gap-2.5 rounded-[6px] text-[0.9375rem] transition-opacity duration-[160ms] focus-visible:outline-offset-2",
              counts[p.key] === 0 && "opacity-60",
              hover !== null && hover !== p.key && "opacity-55",
            )}
          >
            <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-[3px]", p.swatch)} />
            <span className="text-fg-2">{p.label}</span>
            <Count value={counts[p.key]} className="tnum ml-auto font-semibold text-fg" />
          </li>
        ))}
      </ul>
      <p
        id="reading-explain"
        className="mt-3 min-h-[1.5em] border-t border-line pt-3 text-sm text-fg-3"
      >
        {active ? active.explain : "Point at or select a row to see what it counts."}
      </p>
    </figure>
  );
}
