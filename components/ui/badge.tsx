import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badges always carry a text label; colour is never the only signal.
 * teal = confirmed, alert = real blocker, brass = in progress.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-line bg-mist text-ink",
        progress: "border-brass/60 bg-brass-wash text-brass-ink",
        confirmed: "border-teal/50 bg-teal-wash text-teal-ink",
        blocker: "border-alert/50 bg-alert-wash text-alert",
        outline: "border-ink/30 bg-transparent text-ink",
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
