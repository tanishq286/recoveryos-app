import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative grid w-full grid-cols-[0_1fr] items-start gap-y-1 rounded-[var(--radius-panel)] border px-4 py-4 text-base has-[>svg]:grid-cols-[calc(var(--spacing)*5)_1fr] has-[>svg]:gap-x-3 [&>svg]:mt-0.5 [&>svg]:size-5",
  {
    variants: {
      variant: {
        default: "border-(--glass-border) bg-(--glass-panel) text-fg [&>svg]:text-fg-2",
        info: "border-signal/30 bg-signal-wash text-fg [&>svg]:text-signal",
        confirmed: "border-confirmed/30 bg-confirmed-wash text-fg [&>svg]:text-confirmed",
        pending: "border-pending/35 bg-pending-wash text-fg [&>svg]:text-pending",
        iepf: "border-iepf/35 bg-iepf-wash text-fg [&>svg]:text-iepf",
        blocker: "border-blocker/50 bg-blocker-wash text-fg [&>svg]:text-blocker",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="alert-title"
      className={cn("col-start-2 leading-snug font-semibold", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("col-start-2 grid gap-2 text-base text-fg-2 [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
