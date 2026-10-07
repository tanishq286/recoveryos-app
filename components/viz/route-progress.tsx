import type { CaseStatus } from "@/lib/types";
import { CASE_STATES, railProgress, stateInfo } from "@/lib/rules/case-states";
import { cn } from "@/lib/utils";

/**
 * The case route in miniature: one segment per mainline stage, credit-coloured
 * behind, signal at the current stage (coral when a query is open), hairline
 * ahead. Used where a whole case has to read in a glance, e.g. the cases list.
 */
export function RouteProgress({ status, className }: { status: CaseStatus; className?: string }) {
  const { step, total } = railProgress(status);
  const blocked = status === "query_deficiency";
  const mainline = CASE_STATES.filter((s) => !s.branch);

  return (
    <div className={className}>
      <p className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-fg-3">
          <span className="tnum">
            Step {step} of {total}
          </span>
          <span className="sr-only">: {stateInfo(status).label}</span>
        </span>
        {blocked && <span className="font-medium text-blocker">Query open</span>}
      </p>
      <div aria-hidden="true" className="mt-2 flex h-1.5 gap-0.5">
        {mainline.map((s, i) => (
          <span
            key={s.status}
            style={{ animationDelay: `${i * 35}ms` }}
            className={cn(
              "flex-1 origin-left first:rounded-l-full last:rounded-r-full",
              i < step - 1 && "animate-bar bg-chart-credit",
              i === step - 1 && cn("animate-bar", blocked ? "bg-blocker" : "bg-chart-signal"),
              i > step - 1 && "bg-line",
            )}
          />
        ))}
      </div>
    </div>
  );
}
