import {
  CircleAlertIcon,
  FileTextIcon,
  FlagIcon,
  LandmarkIcon,
  ListChecksIcon,
  MessageSquareTextIcon,
  SendIcon,
  ShieldCheckIcon,
} from "lucide-react";

import type { TimelineEvent, TimelineKind } from "@/lib/types";
import { PARTY_ROLE_LABELS, stateInfo } from "@/lib/rules/case-states";
import { byNewest, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { caseStatusTone } from "@/components/case/status-tone";
import { cn } from "@/lib/utils";

const KIND: Record<TimelineKind, { Icon: typeof FlagIcon; label: string }> = {
  status_change: { Icon: FlagIcon, label: "Status" },
  consent: { Icon: ShieldCheckIcon, label: "Consent" },
  document: { Icon: FileTextIcon, label: "Document" },
  message: { Icon: MessageSquareTextIcon, label: "Message" },
  external: { Icon: LandmarkIcon, label: "From outside" },
  submission: { Icon: SendIcon, label: "Filing" },
  review: { Icon: ListChecksIcon, label: "Review" },
  flag: { Icon: CircleAlertIcon, label: "Flag" },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => byNewest(a.occurredAt, b.occurredAt));

  return (
    <section aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="text-xl text-fg">
        Timeline
      </h2>
      {sorted.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-panel)] border border-dashed border-control/60 p-5 text-base text-fg-2">
          Nothing has happened on this case yet. Every step, yours, ours and the company&apos;s,
          will be recorded here with a time and a name.
        </p>
      ) : (
        <ol className="mt-5">
          {sorted.map((e, i) => {
            const k = KIND[e.kind];
            return (
              <li key={e.id} className="relative flex gap-4 pb-7 last:pb-0">
                {i < sorted.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-9 bottom-1 left-[17px] w-px bg-gradient-to-b from-(--glass-border-hover) to-line"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full border",
                    e.kind === "flag"
                      ? "border-blocker/40 bg-blocker-wash text-blocker"
                      : e.kind === "submission" || e.kind === "external"
                        ? "border-iepf/35 bg-iepf-wash text-iepf"
                        : i === 0
                          ? "border-signal/45 bg-signal-wash text-signal shadow-[0_0_14px_-4px_var(--color-signal)]"
                          : "border-(--glass-border) bg-(--glass-panel) text-fg-2",
                  )}
                >
                  <k.Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="tnum text-sm text-fg-3">
                    <time dateTime={e.occurredAt}>{formatDateTime(e.occurredAt)}</time>
                    <span className="sr-only">, {k.label}</span>
                  </p>
                  <h3 className="mt-0.5 text-base font-semibold text-fg">{e.title}</h3>
                  {e.detail && <p className="mt-0.5 text-base text-fg-2">{e.detail}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-fg-3">
                      {e.actor.role === "client"
                        ? "You"
                        : `${e.actor.name}, ${e.actor.organization ?? PARTY_ROLE_LABELS[e.actor.role]}`}
                    </p>
                    {e.toStatus && (
                      <StatusBadge tone={caseStatusTone(e.toStatus).tone} live={false}>
                        Moved to: {stateInfo(e.toStatus).label}
                      </StatusBadge>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
