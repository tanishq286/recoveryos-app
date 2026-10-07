import type { CaseStatus, HolderType } from "@/lib/types";
import { stateInfo } from "@/lib/rules/case-states";
import { LIFECYCLE_SHORT_LABELS, STAGE_KEYS, stageOf } from "@/lib/rules/lifecycle";
import { cn } from "@/lib/utils";

/**
 * The IEPF lifecycle in miniature: six segments, emerald behind, electric cyan
 * at the current stage (red when a query is open), hairline ahead. Used where
 * a whole case has to read in a glance, e.g. the cases list.
 *
 * Stage names match the case page. Without the holder type the affirmation
 * stage stays neutral ("Affirmation"), since heirs and claimants differ there.
 */
export function RouteProgress({
  status,
  holderType,
  className,
}: {
  status: CaseStatus;
  holderType?: HolderType;
  className?: string;
}) {
  const { index, total, label, short } = stageOf(status, holderType);
  const name = STAGE_KEYS[index] === "affirmation" && !holderType ? short : label;
  const blocked = status === "query_deficiency";

  return (
    <div className={className}>
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-fg-3">
          <span className="tnum">
            Stage {index + 1} of {total}
          </span>
          <span className="text-fg-2">: {name}</span>
          <span className="sr-only"> ({stateInfo(status).label})</span>
        </span>
        {blocked && <span className="font-medium text-blocker">Query open</span>}
      </p>
      <div aria-hidden="true" className="mt-2 flex h-1.5 gap-1">
        {LIFECYCLE_SHORT_LABELS.map((label, i) => (
          <span
            key={label}
            style={{ animationDelay: `${i * 50}ms` }}
            className={cn(
              "flex-1 origin-left rounded-full",
              i < index && "animate-bar bg-status-success",
              i === index &&
                cn(
                  "animate-bar",
                  blocked
                    ? "bg-status-error"
                    : "bg-brand shadow-[0_0_10px_-1px_var(--color-brand-cyan)]",
                ),
              i > index && "bg-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}
