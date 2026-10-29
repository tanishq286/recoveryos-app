import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A native select in the input's clothes. Native on purpose: long lists such
 * as the 37 states get the phone's own picker and type-to-jump for free.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select
        data-slot="select"
        className={cn(
          "flex min-h-12 w-full min-w-0 appearance-none rounded-[var(--radius-control)] border border-control bg-(--glass-elevated) py-2.5 pr-10 pl-3.5 text-base text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] transition-[border-color,box-shadow] duration-150 ease-(--ease-out) hover:border-fg-3 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--selection)] focus-visible:outline-none disabled:opacity-50 aria-invalid:border-blocker [&>option]:bg-ink-850 [&>option]:text-fg",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-fg-3"
        aria-hidden="true"
      />
    </span>
  );
}

export { Select };
