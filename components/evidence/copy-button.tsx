"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** What is being copied, for screen readers, e.g. "checksum for PAN card.jpg". */
  label: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  // Only animate the icon swap after an interaction, never on first paint.
  const [touched, setTouched] = useState(false);

  async function copy() {
    setTouched(true);
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={cn(
          "inline-grid size-9 place-items-center rounded-[var(--radius-control)] border border-line bg-ink-900 text-fg-2 transition-[transform,background-color,color] duration-[160ms] ease-(--ease-out) hover:bg-ink-800 hover:text-fg active:scale-[0.97]",
          className,
        )}
      >
        {/* Keyed so the icon swap is a blur-masked crossfade, not a hard cut. */}
        {state === "copied" ? (
          <CheckIcon
            key="copied"
            weight="bold"
            className={cn("size-4 text-confirmed", touched && "animate-settle")}
            aria-hidden="true"
          />
        ) : (
          <CopyIcon
            key="idle"
            className={cn("size-4", touched && "animate-settle")}
            aria-hidden="true"
          />
        )}
      </button>
      <span role="status" aria-live="polite" className="text-sm text-fg-3">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Copy failed. Select the text instead."
            : ""}
      </span>
    </span>
  );
}
