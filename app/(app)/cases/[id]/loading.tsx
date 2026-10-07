import { Skeleton } from "@/components/ui/skeleton";
import { RouteLoader } from "@/components/brand/route-loader";

/* Shaped like the case page: hero and value card, the KPI strip, two panes. */
export default function CaseLoading() {
  return (
    <div className="mx-auto max-w-[84rem] px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <p role="status" className="flex items-center gap-3 text-base text-fg-3">
        <RouteLoader />
        Loading your case…
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-10">
        <div>
          <Skeleton className="h-11 w-full max-w-2xl" />
          <Skeleton className="mt-3 h-11 w-2/3 max-w-xl" />
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-44 rounded-full" />
          </div>
          <Skeleton className="mt-5 h-5 w-full max-w-xl" />
        </div>
        <Skeleton className="h-52 rounded-[var(--radius-panel)]" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-[var(--radius-panel)]" />
        ))}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <div className="space-y-8">
          <Skeleton className="h-72 rounded-[var(--radius-panel)]" />
          <Skeleton className="h-96 rounded-[var(--radius-panel)]" />
        </div>
        <Skeleton className="h-[42rem] rounded-[var(--radius-panel)] max-lg:hidden" />
      </div>
    </div>
  );
}
