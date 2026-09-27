import { Skeleton } from "@/components/ui/skeleton";

export default function CasesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6" aria-busy="true">
      <p role="status" className="text-base text-slate">
        Loading cases…
      </p>
      <Skeleton className="mt-6 h-10 w-2/3" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}
