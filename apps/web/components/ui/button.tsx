import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Press feedback: scale(0.97) on :active, 160ms on the strong ease-out.
 * The primary action is the only thing in the product wearing the cyan
 * gradient; it lights up on hover with a glow, not a colour change.
 */
const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] text-center text-base font-medium [font-stretch:104%] transition-[transform,background-color,border-color,color,box-shadow,filter] duration-[160ms] ease-(--ease-out) select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default:
          "bg-brand px-5 py-2.5 font-semibold text-on-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_8px_24px_-12px_rgb(0_242_254/0.55)] hover:shadow-(--brand-glow) hover:brightness-[1.06]",
        outline:
          "border border-(--glass-border) bg-(--glass-elevated) px-5 py-2.5 text-fg shadow-(--glass-rim) hover:border-(--glass-border-hover)",
        secondary: "bg-(--glass-elevated) px-5 py-2.5 text-fg hover:bg-ink-800",
        ghost: "px-3 py-2 text-fg-2 hover:bg-(--glass-elevated) hover:text-fg",
        confirm:
          "bg-confirmed px-5 py-2.5 font-semibold text-on-signal shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] hover:brightness-110",
        discrepancy:
          "border border-pending/45 bg-pending-wash px-5 py-2.5 text-pending hover:border-pending",
        destructive: "bg-blocker px-5 py-2.5 text-on-signal hover:brightness-110",
        link: "min-h-0 px-0 py-0 text-fg underline decoration-fg/35 underline-offset-[0.22em] active:scale-100 hover:decoration-signal",
      },
      size: {
        default: "",
        sm: "min-h-10 px-3.5 py-2 text-sm",
        lg: "min-h-12 px-6 py-3 text-lg",
        icon: "size-11 px-0 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
