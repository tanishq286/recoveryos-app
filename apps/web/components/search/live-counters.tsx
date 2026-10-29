import { DatabaseIcon, FileCheck2Icon, IndianRupeeIcon, MapPinnedIcon } from "lucide-react";

import { apiOrNull } from "@/lib/api/server";
import type { Stats } from "@/lib/api/types";
import { formatCount, formatPaiseCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Live counters from the API (cached a minute). When the API is down the
 * strip is simply left out rather than showing made-up numbers.
 */
export async function LiveCounters({ className }: { className?: string }) {
  const stats = await apiOrNull<Stats>("stats", { revalidate: 60 });
  // Before the first statement is imported there is nothing honest to count.
  if (!stats || stats.folios === 0) return null;
  const items = [
    { Icon: DatabaseIcon, value: formatCount(stats.folios), label: "unclaimed folios indexed" },
    {
      Icon: IndianRupeeIcon,
      value: formatPaiseCompact(stats.estimatedValuePaise),
      label: "estimated value on record",
    },
    { Icon: MapPinnedIcon, value: formatCount(stats.states), label: "states and territories" },
    {
      Icon: FileCheck2Icon,
      value: formatCount(stats.activeCases),
      label: "recoveries in progress",
    },
  ];
  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4", className)}>
      {items.map(({ Icon, value, label }) => (
        <div key={label} className="min-w-0">
          <dt className="sr-only">{label}</dt>
          <dd className="flex items-center gap-2 text-xl font-semibold text-fg tnum [font-stretch:104%]">
            <Icon className="size-4 shrink-0 text-signal" aria-hidden="true" />
            {value}
          </dd>
          <dd aria-hidden="true" className="mt-0.5 text-sm text-fg-3">
            {label}
          </dd>
        </div>
      ))}
    </dl>
  );
}
