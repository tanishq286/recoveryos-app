import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badges always carry a word (and usually an icon): colour is never the only signal.
 * signal = in progress, confirmed = done, blocker = real blocker.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-line bg-ink-800 text-fg-2",
        progress: "border-signal/35 bg-signal-wash text-signal",
        confirmed: "border-confirmed/35 bg-confirmed-wash text-confirmed",
        blocker: "border-blocker/45 bg-blocker-wash text-blocker",
        outline: "border-control bg-transparent text-fg-2",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
