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
    <figure className="rounded-md border border-line bg-ivory p-3">
      <div className="rounded-sm border border-line bg-pearl px-4 py-5 shadow-[0_1px_2px_rgba(20,35,43,0.06)] sm:px-6">
        <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-line pb-2">
          <p className="eyebrow text-slate">{CATEGORY_LABELS[file.category]}</p>
          <p className="tnum text-xs text-slate">
            Page {page} of {file.pageCount}
          </p>
        </div>
        {lines.length === 0 ? (
          <p className="py-6 text-center text-base text-slate">No lines read from this page.</p>
        ) : (
          <ul className="mt-3 space-y-2 font-mono text-[0.9375rem] leading-relaxed text-ink">
            {lines.map((f) => (
              <li
                key={f.id}
                className={cn(
                  "rounded-sm px-2 py-1 break-words",
                  highlightFieldId === f.id
                    ? "bg-brass-wash outline outline-1 outline-brass"
                    : "bg-transparent",
                )}
              >
                {f.sourceSnippet}
              </li>
            ))}
          </ul>
        )}
      </div>
      <figcaption className="mt-2 text-sm text-slate">
        Lines as read from <span className="font-medium text-ink">{file.fileName}</span>, page{" "}
        <span className="tnum">{page}</span>. A text reconstruction, not an image of the original.
      </figcaption>
    </figure>
  );
}
