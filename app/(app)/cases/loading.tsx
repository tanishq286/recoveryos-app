import { Skeleton } from "@/components/ui/skeleton";

export default function CasesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14" aria-busy="true">
      <p role="status" className="text-base text-fg-3">
        Loading cases…
      </p>
      <Skeleton className="mt-6 h-10 w-2/3" />
      <div className="mt-10 space-y-4">
        <Skeleton className="h-44 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-44 rounded-[var(--radius-panel)]" />
        <Skeleton className="h-44 rounded-[var(--radius-panel)]" />
      </div>
    </div>
  );
}
