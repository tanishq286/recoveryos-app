import {
  CircleAlert,
  FileText,
  Flag,
  Landmark,
  ListChecks,
  MessageSquare,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import type { TimelineEvent, TimelineKind } from "@/lib/types";
import { stateInfo } from "@/lib/rules/case-states";
import { byNewest, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PARTY_ROLE_LABELS } from "@/lib/rules/case-states";

const KIND: Record<TimelineKind, { Icon: LucideIcon; label: string }> = {
  status_change: { Icon: Flag, label: "Status" },
  consent: { Icon: ShieldCheck, label: "Consent" },
  document: { Icon: FileText, label: "Document" },
  message: { Icon: MessageSquare, label: "Message" },
  external: { Icon: Landmark, label: "From outside" },
  submission: { Icon: Send, label: "Filing" },
  review: { Icon: ListChecks, label: "Review" },
  flag: { Icon: CircleAlert, label: "Flag" },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const sorted = [...events].sort((a, b) => byNewest(a.occurredAt, b.occurredAt));

  return (
    <section aria-labelledby="timeline-heading">
      <h2 id="timeline-heading" className="font-display text-xl font-medium text-ink">
        Timeline
      </h2>
      {sorted.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-control/60 p-4 text-base text-slate">
          Nothing has happened on this case yet. Every step — yours, ours, the company&apos;s — will
          be recorded here with a time and a name.
        </p>
      ) : (
        <ol className="mt-4">
          {sorted.map((e, i) => {
            const k = KIND[e.kind];
            return (
              <li key={e.id} className="relative flex gap-3.5 pb-6 last:pb-0">
                {i < sorted.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-9 bottom-1 left-[17px] w-px bg-line"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={
                    e.kind === "flag"
                      ? "grid size-9 shrink-0 place-items-center rounded-full border border-alert/50 bg-alert-wash text-alert"
                      : "grid size-9 shrink-0 place-items-center rounded-full border border-line bg-pearl text-ink"
                  }
                >
                  <k.Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <p className="tnum text-sm text-slate">
                    <time dateTime={e.occurredAt}>{formatDateTime(e.occurredAt)}</time>
                    <span className="sr-only"> · {k.label}</span>
                  </p>
                  <h3 className="mt-0.5 font-sans text-base font-semibold text-ink">{e.title}</h3>
                  {e.detail && <p className="mt-0.5 text-base text-ink/85">{e.detail}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <p className="text-sm text-slate">
                      {e.actor.role === "client" ? "You" : e.actor.name}
                      {e.actor.role !== "client" &&
                        ` · ${e.actor.organization ?? PARTY_ROLE_LABELS[e.actor.role]}`}
                    </p>
                    {e.toStatus && (
                      <Badge variant={e.toStatus === "query_deficiency" ? "blocker" : "outline"}>
                        Moved to: {stateInfo(e.toStatus).label}
                      </Badge>
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
