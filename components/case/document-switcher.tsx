import Link from "next/link";

import type { EvidenceFile, ExtractedField } from "@/lib/types";
import { EXTRACTION_LABELS } from "@/lib/labels";
import { toneDot } from "@/components/ui/status-badge";
import { EXTRACTION_TONE } from "@/components/case/status-tone";
import { cn } from "@/lib/utils";

/**
 * Every document on the case as a row of chips above the inspector. Picking
 * one re-renders the inspector for it in place (`?doc=`, no scroll jump);
 * a count shows how many of its details are waiting for the client.
 */
export function DocumentSwitcher({
  caseId,
  files,
  fields,
  selectedId,
}: {
  caseId: string;
  files: EvidenceFile[];
  fields: ExtractedField[];
  selectedId: string | null;
}) {
  return (
    <nav
      aria-label="Documents on this case"
      className="relative -mx-1 mt-5 overflow-x-auto px-1 pb-1"
    >
      <ul className="flex gap-2">
        {files.map((f) => {
          const selected = f.id === selectedId;
          const waiting = fields.filter(
            (x) =>
              x.evidenceFileId === f.id &&
              x.reviewStatus === "pending" &&
              x.needsClientCheck &&
              x.value !== null,
          ).length;
          return (
            <li key={f.id} className="shrink-0">
              <Link
                href={`/cases/${caseId}?doc=${f.id}`}
                scroll={false}
                aria-current={selected ? "true" : undefined}
                title={f.fileName}
                className={cn(
                  "relative flex min-h-11 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-[border-color,background-color,color] duration-150",
                  selected
                    ? "border-signal bg-signal-wash text-fg shadow-[inset_0_0_0_1px_var(--color-signal)]"
                    : "border-(--glass-border) bg-(--glass-elevated) text-fg-2 hover:border-(--glass-border-hover) hover:text-fg",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    toneDot(EXTRACTION_TONE[f.extractionStatus]),
                  )}
                />
                <span className="max-w-[13rem] truncate">{f.fileName}</span>
                <span className="sr-only">, {EXTRACTION_LABELS[f.extractionStatus].label}</span>
                {waiting > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-semibold text-on-brand tabular-nums">
                    {waiting}
                    <span className="sr-only"> waiting for you</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
