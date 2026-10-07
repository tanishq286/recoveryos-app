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
      <div className="rounded-[var(--radius-control)] border border-line bg-ink-900 px-4 py-5 sm:px-6">
        <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-3">
          <p className="text-sm text-fg-3">{CATEGORY_LABELS[file.category]}</p>
          <p className="tnum text-sm text-fg-3">
            Page {page} of {file.pageCount}
          </p>
        </div>
        {lines.length === 0 ? (
          <p className="py-6 text-center text-base text-fg-3">No lines read from this page.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 font-mono text-[0.9375rem] leading-relaxed text-fg">
            {lines.map((f) => (
              <li
                key={f.id}
                className={cn(
                  "rounded-sm px-2 py-1 break-words",
                  highlightFieldId === f.id
                    ? "bg-signal-wash outline-1 outline-signal/60 outline-solid"
                    : "bg-transparent",
                )}
              >
                {f.sourceSnippet}
              </li>
            ))}
          </ul>
        )}
      </div>
      <figcaption className="mt-3 px-1 text-sm text-fg-3">
        Lines as read from <span className="font-medium text-fg-2">{file.fileName}</span>, page{" "}
        <span className="tnum">{page}</span>. A text reconstruction, not an image of the original.
      </figcaption>
    </figure>
  );
}
