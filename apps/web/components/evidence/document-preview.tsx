import type { EvidenceFile, ExtractedField } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

/**
 * A text reconstruction of one page: the lines we actually read, in order.
 * It is deliberately not an image, so nobody mistakes it for the original.
 */
export function DocumentPreview({
  file,
  fields,
  page,
  highlightFieldId,
}: {
  file: EvidenceFile;
  fields: ExtractedField[];
  page: number;
  highlightFieldId?: string;
}) {
  const lines = fields
    .filter((f) => f.sourcePage === page && f.sourceSnippet)
    .filter((f, i, arr) => arr.findIndex((x) => x.sourceSnippet === f.sourceSnippet) === i);

  return (
    <figure className="panel p-3">
      <div className="forensic-page rounded-[var(--radius-control)] border border-(--glass-border) px-3 py-4 sm:px-5">
        <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-(--glass-border) pb-3">
          <p className="text-sm text-fg-3">{CATEGORY_LABELS[file.category]}</p>
          <p className="tnum text-sm text-fg-3">
            Page {page} of {file.pageCount}
          </p>
        </div>
        {lines.length === 0 ? (
          <p className="py-6 text-center text-base text-fg-3">No lines read from this page.</p>
        ) : (
          <ol className="mt-3 space-y-1 font-mono text-[0.9375rem] leading-relaxed text-fg">
            {lines.map((f, i) => {
              const lit = highlightFieldId === f.id;
              return (
                <li
                  key={f.id}
                  className={cn(
                    "grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2 rounded-[6px] py-1 pr-2",
                    lit
                      ? "bg-signal-wash shadow-[inset_2px_0_0_var(--color-brand-cyan),inset_0_0_0_1px_var(--color-vault-border-highlight)]"
                      : "bg-transparent",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="tnum text-right text-sm text-fg-3 select-none"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="break-words">
                    {f.sourceSnippet}
                    {lit && <span className="sr-only"> (the line this detail was read from)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <figcaption className="mt-3 px-1 text-sm text-fg-3">
        Lines as read from <span className="font-medium text-fg-2">{file.fileName}</span>, page{" "}
        <span className="tnum">{page}</span>. A text reconstruction, not an image of the original.
      </figcaption>
    </figure>
  );
}
