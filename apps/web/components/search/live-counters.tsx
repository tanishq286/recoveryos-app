import { Building2Icon, DatabaseIcon, IndianRupeeIcon, MapPinnedIcon } from "lucide-react";

import { apiOrNull } from "@/lib/api/server";
import type { Stats } from "@/lib/api/types";
import { formatCount, formatPaiseCompact } from "@/lib/format";

/**
 * Live counters from the API (cached a minute). When the API is down the
 * strip is simply left out rather than showing made-up numbers.
 */
export async function LiveCounters({ className }: { className?: string }) {
  const stats = await apiOrNull<Stats>("stats", { revalidate: 60 });
  // Before the first statement is imported there is nothing honest to count.
  if (!stats || stats.folios === 0) return null;
  const withRecords = stats.companiesWithRecords ?? null;
  const items = [
    {
      Icon: DatabaseIcon,
      value: formatCount(stats.holderRecords ?? stats.folios),
      label: "unclaimed-holder records searchable",
    },
    {
      Icon: Building2Icon,
      value: withRecords === null ? "—" : formatCount(withRecords),
      label: withRecords === 1 ? "company with holder records" : "companies with holder records",
    },
    {
      Icon: IndianRupeeIcon,
      value: formatPaiseCompact(stats.estimatedValuePaise),
      label: "listed in those records (estimate)",
    },
    { Icon: MapPinnedIcon, value: formatCount(stats.states), label: "states and territories" },
  ];
  return (
    <div className={className}>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
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
      <p className="mt-3 text-sm text-fg-3">
        Records come from statements companies publish; one person can appear in several records,
        and most companies are not covered yet.
      </p>
    </div>
  );
}
