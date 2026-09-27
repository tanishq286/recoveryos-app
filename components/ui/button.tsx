import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-center text-base font-medium transition-colors duration-200 ease-(--ease-calm) disabled:pointer-events-none disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary px-5 py-2.5 text-primary-foreground hover:bg-ink/90",
        outline:
          "border border-ink/35 bg-pearl px-5 py-2.5 text-ink hover:border-ink hover:bg-mist",
        secondary: "bg-secondary px-5 py-2.5 text-secondary-foreground hover:bg-line/70",
        ghost: "px-3 py-2 text-ink hover:bg-mist",
        confirm: "bg-teal-ink px-5 py-2.5 text-pearl hover:bg-teal-ink/90",
        destructive: "bg-alert px-5 py-2.5 text-pearl hover:bg-alert/90",
        link: "min-h-0 px-0 py-0 text-ink underline decoration-ink/40 hover:decoration-ink",
        onInk: "bg-ivory px-5 py-2.5 text-ink hover:bg-pearl",
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
