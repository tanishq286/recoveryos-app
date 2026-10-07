import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * One hue per meaning, everywhere:
 *   active  electric cyan  in progress, your turn
 *   success emerald        confirmed, credited, done
 *   pending amber          in review, waiting on a company, RTA or reviewer
 *   error   red            a real blocker or a mismatch
 *   iepf    purple         IEPF legal and regulatory milestones
 *   neutral slate          recorded, not started, not needed
 */
export type StatusTone = "active" | "success" | "pending" | "error" | "iepf" | "neutral";

const TONE: Record<
  StatusTone,
  { badge: "progress" | "confirmed" | "pending" | "blocker" | "iepf" | "neutral"; dot: string }
> = {
  active: { badge: "progress", dot: "bg-brand-cyan" },
  success: { badge: "confirmed", dot: "bg-status-success" },
  pending: { badge: "pending", dot: "bg-status-pending" },
  error: { badge: "blocker", dot: "bg-status-error" },
  iepf: { badge: "iepf", dot: "bg-status-iepf" },
  neutral: { badge: "neutral", dot: "bg-fg-3" },
};

/** The tone's dot fill, for places that show a status as a dot beside other text. */
export function toneDot(tone: StatusTone): string {
  return TONE[tone].dot;
}

/**
 * A status pill with a dot. Statuses that are still moving (pending, in
 * review) get a live ping; under reduced motion the ping simply doesn't play.
 * The word always carries the meaning: colour and motion only reinforce it.
 */
export function StatusBadge({
  tone,
  live = tone === "pending",
  className,
  children,
}: {
  tone: StatusTone;
  /** Pulse the dot. Defaults to on for pending statuses. */
  live?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { badge, dot } = TONE[tone];
  return (
    <Badge variant={badge} className={className}>
      <span aria-hidden="true" className="relative flex size-2 shrink-0">
        {live && (
          <span
            className={cn(
              "absolute inline-flex size-full animate-ping rounded-full opacity-70",
              dot,
            )}
          />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
      </span>
      {children}
    </Badge>
  );
}
