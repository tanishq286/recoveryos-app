import { cn } from "@/lib/utils";

/** Static placeholder shaped like the final layout. Deliberately does not pulse or shimmer. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-[var(--radius-control)] bg-ink-800", className)}
      {...props}
    />
  );
}

export { Skeleton };
