import { Skeleton } from "@/components/ui/skeleton";
import { RouteLoader } from "@/components/brand/route-loader";

export default function EvidenceLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <p role="status" className="flex items-center gap-3 text-base text-fg-3">
        <RouteLoader />
        Loading the evidence room…
      </p>
      <Skeleton className="mt-6 h-10 w-2/3 max-w-lg" />
      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-[28rem] rounded-[var(--radius-panel)]" />
      </div>
    </div>
  );
}
