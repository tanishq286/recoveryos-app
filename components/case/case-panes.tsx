"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { m } from "framer-motion";

import { cn } from "@/lib/utils";

type PaneId = "milestones" | "documents";

/**
 * The case page's two panes. Side by side from lg up; below that they stack
 * into one switchable pane with a segmented control, so nothing ever scrolls
 * sideways. In-page links (e.g. "Review the details", "What reaches you")
 * open the pane that holds their target before the browser jumps to it.
 */
export function CasePanes({
  milestones,
  documents,
  documentsToCheck = 0,
}: {
  milestones: ReactNode;
  documents: ReactNode;
  /** Details waiting for the client, shown as a count on the Documents switch. */
  documentsToCheck?: number;
}) {
  const [active, setActive] = useState<PaneId>("milestones");
  const docsRef = useRef<HTMLDivElement>(null);
  const milestonesRef = useRef<HTMLDivElement>(null);

  // Open the right pane for any same-page anchor before the jump happens.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
      const id = a?.getAttribute("href")?.slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      // Hidden targets can't be scrolled to; reveal the pane, then jump.
      const hidden = target.offsetParent === null;
      if (docsRef.current?.contains(target)) setActive("documents");
      else if (milestonesRef.current?.contains(target)) setActive("milestones");
      else return;
      if (hidden) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => target.scrollIntoView({ block: "start" })),
        );
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  const options: { id: PaneId; label: string; count?: number }[] = [
    { id: "milestones", label: "Milestones" },
    { id: "documents", label: "Documents", count: documentsToCheck },
  ];

  return (
    <div>
      <div
        role="group"
        aria-label="Show"
        className="sticky top-2 z-20 mb-6 grid grid-cols-2 rounded-full border border-(--glass-border) bg-(--chrome-bg) p-1 shadow-(--glass-shadow) backdrop-blur-xl lg:hidden"
      >
        {options.map((o) => {
          const selected = active === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setActive(o.id)}
              className={cn(
                "relative inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-3 text-[0.9375rem] font-medium transition-colors duration-150",
                selected ? "text-fg" : "text-fg-3 hover:text-fg-2",
              )}
            >
              {selected && (
                <m.span
                  layoutId="case-pane-pill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-ink-800 shadow-[inset_0_0_0_1px_var(--color-vault-border-highlight)]"
                />
              )}
              <span className="relative">{o.label}</span>
              {!!o.count && (
                <span className="relative grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-semibold text-on-brand tabular-nums">
                  {o.count}
                  <span className="sr-only"> to check</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-8">
        <div
          ref={milestonesRef}
          className={cn("min-w-0 space-y-8", active !== "milestones" && "max-lg:hidden")}
        >
          {milestones}
        </div>
        <div
          ref={docsRef}
          className={cn("min-w-0 space-y-6", active !== "documents" && "max-lg:hidden")}
        >
          {documents}
        </div>
      </div>
    </div>
  );
}
