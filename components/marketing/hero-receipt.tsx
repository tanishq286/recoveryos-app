import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const MILESTONES: { label: string; date: string | null; state: "done" | "current" | "upcoming" }[] =
  [
    { label: "Consent given", date: "19 Aug", state: "done" },
    { label: "Scope agreed", date: "21 Aug", state: "done" },
    { label: "Evidence review", date: "Now", state: "current" },
    { label: "Your approval", date: null, state: "upcoming" },
    { label: "IEPF-5 filed", date: null, state: "upcoming" },
    { label: "Credited to your demat", date: null, state: "upcoming" },
  ];

/** A static illustration of the case room, clearly labelled as fictional. */
export function HeroReceipt() {
  return (
    <figure className="relative">
      <div className="rounded-xl border border-line bg-pearl p-5 shadow-[0_1px_0_rgba(20,35,43,0.04),0_18px_40px_-24px_rgba(20,35,43,0.25)] sm:p-7">
        <div className="flex items-start justify-between gap-3 border-b border-dashed border-line pb-4">
          <div className="min-w-0">
            <p className="eyebrow text-slate">Case RC-2026-0147</p>
            <p className="mt-1 font-display text-xl leading-snug font-medium text-ink">
              Konkan Coastal Industries
            </p>
            <p className="tnum text-base text-slate">400 shares · moved to IEPF in 2019</p>
          </div>
          <span className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold tracking-wide text-slate uppercase">
            Sample
          </span>
        </div>

        <ol className="mt-5">
          {MILESTONES.map((m, i) => (
            <li key={m.label} className="relative flex items-start gap-3 pb-4 last:pb-0">
              {i < MILESTONES.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-6 bottom-0 left-[11px] w-0.5",
                    m.state === "done" ? "bg-teal" : "bg-line",
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative z-10 grid size-6 shrink-0 place-items-center rounded-full border-2",
                  m.state === "done" && "border-teal bg-teal text-pearl",
                  m.state === "current" && "border-brass bg-pearl",
                  m.state === "upcoming" && "border-control bg-pearl",
                )}
              >
                {m.state === "done" && <Check className="size-3.5" strokeWidth={3} />}
                {m.state === "current" && <span className="size-2.5 rounded-full bg-brass" />}
              </span>
              <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "text-base",
                    m.state === "current"
                      ? "font-semibold text-ink"
                      : m.state === "done"
                        ? "text-ink"
                        : "text-slate",
                  )}
                >
                  {m.label}
                  <span className="sr-only">
                    {m.state === "done"
                      ? " — done"
                      : m.state === "current"
                        ? " — in progress"
                        : " — not yet"}
                  </span>
                </span>
                {m.date && (
                  <span
                    className={cn(
                      "tnum shrink-0 text-sm",
                      m.state === "current" ? "font-semibold text-brass-ink" : "text-slate",
                    )}
                  >
                    {m.date}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-md bg-mist p-4">
          <p className="eyebrow text-slate">What happens next</p>
          <p className="mt-1 text-base text-ink">
            We are waiting for <strong className="font-semibold">you</strong> to confirm 3 details
            from your share certificate.
          </p>
          <p className="tnum mt-1 text-sm text-slate">Owner: you · due Fri, 2 Oct</p>
        </div>
      </div>
      <figcaption className="mt-3 text-sm text-slate">
        A fictional sample case, as the client sees it.
      </figcaption>
    </figure>
  );
}
