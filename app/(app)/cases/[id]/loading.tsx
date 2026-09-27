import { Skeleton } from "@/components/ui/skeleton";

export default function CaseLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" aria-busy="true">
      <p role="status" className="text-base text-slate">
        Loading your case…
      </p>
      <Skeleton className="mt-6 h-10 w-3/4 max-w-xl" />
      <Skeleton className="mt-8 h-56 w-full" />
      <Skeleton className="mt-6 h-28 w-full" />
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}
