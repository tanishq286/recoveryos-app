import Link from "next/link";

import { cn } from "@/lib/utils";

/** The mark: a path that turns back on itself and ends at a lit point. Geometry unchanged. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
      fill="none"
    >
      <circle
        cx="14"
        cy="14"
        r="12.5"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1.25"
      />
      <path
        d="M8.5 18.5V11a3.5 3.5 0 0 1 3.5-3.5h3.5a3.5 3.5 0 0 1 0 7H12l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18.5" cy="20" r="1.75" className="fill-signal" />
    </svg>
  );
}

export function Wordmark({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center gap-2.5 rounded-sm text-fg no-underline",
        className,
      )}
    >
      <Mark />
      <span className="text-[1.125rem] leading-none font-[620] tracking-[-0.01em] [font-stretch:108%]">
        RecoveryOS
      </span>
    </Link>
  );
}
