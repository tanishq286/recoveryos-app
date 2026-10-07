import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Badges always carry a word (and usually an icon or dot): colour is never the
 * only signal. progress = in progress (cyan), confirmed = done (emerald),
 * pending = in review or waiting on a third party (amber), iepf = legal and
 * regulatory milestones (purple), blocker = a real blocker (red).
 * For a status with a live dot, use <StatusBadge />.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium tracking-[0.005em] [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-(--glass-border) bg-(--glass-elevated) text-fg-2",
        progress: "border-signal/35 bg-signal-wash text-signal",
        confirmed: "border-confirmed/35 bg-confirmed-wash text-confirmed",
        pending: "border-pending/40 bg-pending-wash text-pending",
        iepf: "border-iepf/40 bg-iepf-wash text-iepf",
        blocker: "border-blocker/45 bg-blocker-wash text-blocker",
        outline: "border-control/70 bg-transparent text-fg-2",
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
