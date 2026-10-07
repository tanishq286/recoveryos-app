"use client";

import { SearchIcon } from "lucide-react";

import { openCommandPalette, useModKey } from "@/components/command/command-palette";
import { cn } from "@/lib/utils";

/** Header button for the command palette. Icon-only on phones, labelled with its shortcut above. */
export function CommandTrigger({ className }: { className?: string }) {
  const mod = useModKey();
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        "group inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-(--glass-border) bg-(--glass-elevated) px-2.5 text-[0.9375rem] text-fg-2 shadow-(--glass-rim) transition-[border-color,color,transform] duration-[160ms] ease-(--ease-out) hover:border-(--glass-border-hover) hover:text-fg active:scale-[0.97] sm:justify-start sm:pr-2",
        className,
      )}
    >
      <SearchIcon className="size-[1.125rem] shrink-0" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Search</span>
      <kbd
        aria-hidden="true"
        className="ml-2 hidden rounded-[5px] border border-(--glass-border) px-1.5 py-px font-sans text-xs text-fg-3 transition-colors duration-[160ms] group-hover:text-fg-2 sm:inline"
      >
        {mod}K
      </kbd>
    </button>
  );
}
