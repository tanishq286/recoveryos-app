"use client";

import { useEffect, useRef, useState } from "react";

import { formatCount } from "@/lib/format";

/**
 * A whole number that eases to its new value when it changes (never on first
 * paint). Screen readers and reduced-motion visitors get the final value at once.
 */
export function Count({ value, className }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      requestAnimationFrame(() => setShown(value));
      return;
    }
    const t0 = performance.now();
    const dur = 420;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className={className}>
      <span aria-hidden="true">{formatCount(shown)}</span>
      <span className="sr-only">{formatCount(value)}</span>
    </span>
  );
}
