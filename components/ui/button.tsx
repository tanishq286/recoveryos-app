import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Press feedback: scale(0.97) on :active, 160ms on the strong ease-out.
 * Hover changes colour only, and only on fine pointers (no false taps).
 */
const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] text-center text-base font-medium [font-stretch:104%] transition-[transform,background-color,border-color,color] duration-[160ms] ease-(--ease-out) select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-signal px-5 py-2.5 text-on-signal hover:bg-signal-strong",
        outline:
          "border border-control bg-transparent px-5 py-2.5 text-fg hover:border-fg-2 hover:bg-ink-800",
        secondary: "bg-ink-800 px-5 py-2.5 text-fg hover:bg-line",
        ghost: "px-3 py-2 text-fg-2 hover:bg-ink-800 hover:text-fg",
        confirm: "bg-confirmed px-5 py-2.5 text-on-signal hover:bg-[#7fe0c6]",
        destructive: "bg-blocker px-5 py-2.5 text-on-signal hover:bg-[#ff968f]",
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
