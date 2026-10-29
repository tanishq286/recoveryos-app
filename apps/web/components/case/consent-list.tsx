import { ShieldCheckIcon } from "lucide-react";

import type { Consent } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

export function ConsentList({ consents }: { consents: Consent[] }) {
  return (
    <section aria-labelledby="consent-heading" className="panel p-5 sm:p-7">
      <h2 id="consent-heading" className="flex items-center gap-2 text-xl text-fg">
        <ShieldCheckIcon className="size-5 text-confirmed" aria-hidden="true" />
        Your consents
      </h2>
      {consents.length === 0 ? (
        <p className="mt-4 text-base text-fg-2">
          No consent recorded. We do not read documents or contact anyone for you until you give it.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-(--glass-border)">
          {consents.map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-base text-fg">{c.purpose}</p>
                <p className="tnum text-sm text-fg-3">
                  Notice {c.noticeVersion}, given {formatDate(c.grantedAt)}
                  {c.withdrawnAt && `, withdrawn ${formatDate(c.withdrawnAt)}`}
                </p>
              </div>
              {c.withdrawnAt ? (
                <StatusBadge tone="neutral">Withdrawn</StatusBadge>
              ) : (
                <StatusBadge tone="success">Active</StatusBadge>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm text-fg-3">
        You can withdraw any consent at any time by messaging your case lead. It takes effect at
        once and is written to the audit log.
      </p>
    </section>
  );
}
