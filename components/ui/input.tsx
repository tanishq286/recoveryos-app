import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex min-h-12 w-full min-w-0 rounded-[var(--radius-control)] border border-control bg-(--glass-elevated) px-3.5 py-2.5 text-base text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] transition-[border-color,background-color,box-shadow] duration-150 ease-(--ease-out) placeholder:text-fg-3 hover:border-fg-3 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--selection)] disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-blocker",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
