import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex min-h-12 w-full min-w-0 rounded-md border border-input bg-pearl px-3.5 py-2.5 text-base text-ink transition-colors duration-150 placeholder:text-slate/80 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-alert",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
