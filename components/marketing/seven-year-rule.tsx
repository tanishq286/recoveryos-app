"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useInView } from "framer-motion";
import { BadgeCheckIcon, FilePenLineIcon, LandmarkIcon, type LucideIcon } from "lucide-react";

import { VaultCard } from "@/components/ui/vault-card";
import { cn } from "@/lib/utils";

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const STEPS: {
  Icon: LucideIcon;
  title: string;
  note: string;
  tone: string;
  /** The connector down to the next step, blending into its colour. */
  line?: string;
}[] = [
  {
    Icon: LandmarkIcon,
    title: "The company transfers the shares to the IEPF",
    note: "They move to the IEPF Authority's demat account. They are still yours.",
    tone: "border-iepf/45 bg-iepf-wash text-iepf",
    line: "from-iepf/60 to-signal/60",
  },
  {
    Icon: FilePenLineIcon,
    title: "You claim them back on Form IEPF-5",
    note: "The company verifies the claim, then the IEPF Authority decides.",
    tone: "border-signal/45 bg-signal-wash text-signal",
    line: "from-signal/60 to-confirmed/60",
  },
  {
    Icon: BadgeCheckIcon,
    title: "Credited to your own demat account",
    note: "Refunded dividends go to your own bank account.",
    tone: "border-confirmed/45 bg-confirmed-wash text-confirmed",
  },
];

/**
 * The rule in one picture: seven years of unpaid dividends, the transfer,
 * and the way back. General law, not a claim about any one case.
 *
 * Motion: the years fill in one by one the first time the card scrolls into
 * view, then the steps below follow. The server renders the finished state;
 * the card only arms itself (dims) after hydration when it is still off
 * screen, so it never flashes empty. Reduced motion: no sequence.
 */
export function SevenYearRule({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.45 });

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) return;
    el.dataset.phase = "armed";
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (inView && el?.dataset.phase === "armed") el.dataset.phase = "run";
  }, [inView]);

  return (
    <VaultCard className={cn("year-rule p-6 sm:p-7", className)}>
      <div ref={ref}>
        <p className="text-sm font-medium text-fg-3">The rule, and the way back</p>

        <div className="mt-5">
          <ol aria-hidden="true" className="grid grid-cols-7 gap-1.5">
            {YEARS.map((y) => (
              <li
                key={y}
                data-year
                style={{ "--i": y } as CSSProperties}
                className="grid h-11 place-items-center rounded-[8px] border border-pending/40 bg-pending-wash text-sm font-medium text-pending tabular-nums"
              >
                {y}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[0.9375rem] leading-snug text-fg">
            Seven years in a row with the dividend unpaid or unclaimed
          </p>
        </div>

        <ol className="relative mt-6 space-y-5 border-t border-(--glass-border) pt-6">
          {STEPS.map(({ Icon, title, note, tone, line }, i) => (
            <li
              key={title}
              data-step
              style={{ "--i": i } as CSSProperties}
              className="relative flex gap-4"
            >
              {line && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[2.125rem] -bottom-5 left-[1.0625rem] w-px bg-linear-to-b",
                    line,
                  )}
                />
              )}
              <span
                className={cn(
                  "relative grid size-[2.125rem] shrink-0 place-items-center rounded-full border",
                  tone,
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-[0.9375rem] leading-snug font-medium text-fg">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-fg-2">{note}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </VaultCard>
  );
}
