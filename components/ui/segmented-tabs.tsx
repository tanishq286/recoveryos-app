"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface SegmentedTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Tabs as a segmented control (WAI-ARIA tabs pattern: arrow keys move, Home/End
 * jump, automatic activation). The selected pill slides between options with
 * transform only. Only the active panel is mounted, so its entrance plays each
 * time it is chosen.
 */
export function SegmentedTabs({
  label,
  tabs,
  defaultTab,
  className,
  actionsClassName,
  heading,
}: {
  label: string;
  tabs: SegmentedTab[];
  defaultTab?: string;
  className?: string;
  actionsClassName?: string;
  /** Rendered on the left of the tab row (e.g. the section title). */
  heading?: ReactNode;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0].id);
  const ids = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState(false);
  // Panels only animate after a real switch, never on first paint.
  const [switched, setSwitched] = useState(false);
  const choose = (id: string) => {
    setActive(id);
    setSwitched(true);
  };

  useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    if (!list || !pill) return;
    const btn = list.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!btn) return;
    pill.style.width = `${btn.offsetWidth}px`;
    pill.style.transform = `translateX(${btn.offsetLeft}px)`;
    if (!measured) requestAnimationFrame(() => setMeasured(true));
  }, [active, measured]);

  function onKeyDown(e: React.KeyboardEvent) {
    const i = tabs.findIndex((t) => t.id === active);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    choose(tabs[next].id);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${tabs[next].id}"]`)?.focus();
  }

  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className={className}>
      <div className={cn("flex flex-wrap items-center justify-between gap-3", actionsClassName)}>
        {heading}
        <div
          ref={listRef}
          role="tablist"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="relative inline-flex rounded-full border border-line bg-ink-900 p-0.5"
        >
          <span
            ref={pillRef}
            aria-hidden="true"
            className={cn(
              "absolute top-0.5 bottom-0.5 left-0 rounded-full bg-ink-800 shadow-[inset_0_0_0_1px_var(--color-control)]",
              measured
                ? "transition-[transform,width] duration-[240ms] ease-(--ease-out)"
                : "transition-none",
            )}
          />
          {tabs.map((t) => {
            const selected = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                data-tab={t.id}
                id={`${ids}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${ids}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(t.id)}
                className={cn(
                  "relative z-10 inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-medium transition-colors duration-[160ms]",
                  selected ? "text-fg" : "text-fg-3 hover:text-fg-2",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        id={`${ids}-panel`}
        role="tabpanel"
        aria-labelledby={`${ids}-tab-${current.id}`}
        tabIndex={0}
        key={current.id}
        className={cn(
          "rounded-[var(--radius-control)] focus-visible:outline-offset-4",
          switched && "animate-settle",
        )}
      >
        {current.content}
      </div>
    </div>
  );
}
