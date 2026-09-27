import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-md border border-input bg-pearl px-3.5 py-2.5 text-base text-ink transition-colors duration-150 placeholder:text-slate/80 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-alert",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
