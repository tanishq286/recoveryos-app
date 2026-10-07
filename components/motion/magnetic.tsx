"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A primary call to action that leans a couple of pixels toward the cursor and
 * settles back when it leaves. Fine pointers with motion allowed only; the
 * child keeps its own focus, press and hover behaviour.
 */
export function Magnetic({
  children,
  strength = 3,
  className,
}: {
  children: ReactNode;
  /** Maximum travel in px. Keep it small: this is a lean, not a chase. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const enabled = () =>
    matchMedia("(hover: hover) and (pointer: fine)").matches &&
    matchMedia("(prefers-reduced-motion: no-preference)").matches;

  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex transition-transform duration-[420ms] ease-(--ease-out) will-change-transform",
        className,
      )}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el || !enabled()) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.transitionDuration = "160ms";
        el.style.transform = `translate3d(${(x * strength).toFixed(2)}px, ${(y * strength * 0.6).toFixed(2)}px, 0)`;
      }}
      onPointerLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transitionDuration = "";
        el.style.transform = "";
      }}
    >
      {children}
    </span>
  );
}
