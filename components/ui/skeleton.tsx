import { cn } from "@/lib/utils";

/** Placeholder shaped like the final layout, with one slow pass of light (static under reduced motion). */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-sweep rounded-[var(--radius-control)] bg-ink-800", className)}
      {...props}
    />
  );
}

export { Skeleton };
