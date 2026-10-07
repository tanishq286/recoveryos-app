import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-[var(--radius-control)] border border-control bg-ink-900 px-3.5 py-2.5 text-base text-fg transition-[border-color,background-color] duration-150 ease-(--ease-out) placeholder:text-fg-3 hover:border-fg-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-blocker",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
