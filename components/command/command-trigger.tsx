"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";

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
        "group inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-line bg-ink-900/60 px-2.5 text-[0.9375rem] text-fg-2 transition-[border-color,color,transform] duration-[160ms] ease-(--ease-out) hover:border-control hover:text-fg active:scale-[0.97] sm:justify-start sm:pr-2",
        className,
      )}
    >
      <MagnifyingGlassIcon className="size-[1.125rem] shrink-0" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Search</span>
      <kbd
        aria-hidden="true"
        className="ml-2 hidden rounded-[5px] border border-line px-1.5 py-px font-sans text-xs text-fg-3 transition-colors duration-[160ms] group-hover:text-fg-2 sm:inline"
      >
        {mod}K
      </kbd>
    </button>
  );
}
