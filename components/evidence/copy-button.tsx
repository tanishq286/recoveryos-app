"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

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

  async function copy() {
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
          "inline-grid size-9 place-items-center rounded-md border border-line bg-pearl text-ink transition-colors duration-150 hover:bg-mist",
          className,
        )}
      >
        {state === "copied" ? (
          <Check className="size-4 text-teal-ink" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
      <span role="status" aria-live="polite" className="text-sm text-slate">
        {state === "copied"
          ? "Copied"
          : state === "failed"
            ? "Copy failed — select the text instead"
            : ""}
      </span>
    </span>
  );
}
