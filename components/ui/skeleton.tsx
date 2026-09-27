import { cn } from "@/lib/utils";

/** Static placeholder block. Deliberately does not pulse or shimmer. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("rounded-md bg-mist", className)}
      {...props}
    />
  );
}

export { Skeleton };
