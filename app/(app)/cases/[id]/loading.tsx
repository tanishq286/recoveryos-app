import { Skeleton } from "@/components/ui/skeleton";
import { RouteLoader } from "@/components/brand/route-loader";

export default function CaseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <p role="status" className="flex items-center gap-3 text-base text-fg-3">
        <RouteLoader />
        Loading your case…
      </p>
      <Skeleton className="mt-6 h-10 w-3/4 max-w-xl" />
      <Skeleton className="mt-8 h-56 w-full rounded-[var(--radius-panel)]" />
      <Skeleton className="mt-6 h-28 w-full rounded-[var(--radius-panel)]" />
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96 rounded-[var(--radius-panel)]" />
      </div>
    </div>
  );
}
