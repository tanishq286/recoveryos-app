import { ShieldCheck } from "lucide-react";

import type { Consent } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function ConsentList({ consents }: { consents: Consent[] }) {
  return (
    <section
      aria-labelledby="consent-heading"
      className="rounded-lg border border-line bg-pearl p-5 sm:p-6"
    >
      <h2
        id="consent-heading"
        className="flex items-center gap-2 font-display text-xl font-medium text-ink"
      >
        <ShieldCheck className="size-5 text-teal" aria-hidden="true" />
        Your consents
      </h2>
      {consents.length === 0 ? (
        <p className="mt-3 text-base text-slate">
          No consent recorded. We do not read documents or contact anyone for you until you give it.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {consents.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-base text-ink">{c.purpose}</p>
                <p className="tnum text-sm text-slate">
                  Notice {c.noticeVersion} · given {formatDate(c.grantedAt)}
                  {c.withdrawnAt && ` · withdrawn ${formatDate(c.withdrawnAt)}`}
                </p>
              </div>
              {c.withdrawnAt ? (
                <Badge variant="neutral">Withdrawn</Badge>
              ) : (
                <Badge variant="confirmed">Active</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-slate">
        You can withdraw any consent at any time by messaging your case lead. It takes effect at
        once and is written to the audit log.
      </p>
    </section>
  );
}
