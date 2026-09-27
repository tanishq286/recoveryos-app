import Link from "next/link";

import type { EvidenceFile, ExtractedField } from "@/lib/types";
import { formatDate, shortHash } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import { ExtractionBadge } from "@/components/evidence/extraction-badge";
import { CopyButton } from "@/components/evidence/copy-button";
import { cn } from "@/lib/utils";

function pendingFor(fileId: string, fields: ExtractedField[]) {
  return fields.filter(
    (f) =>
      f.evidenceFileId === fileId &&
      f.reviewStatus === "pending" &&
      f.needsClientCheck &&
      f.value !== null,
  ).length;
}

export function EvidenceList({
  files,
  fields,
  selectedId,
  hrefFor,
}: {
  files: EvidenceFile[];
  fields: ExtractedField[];
  selectedId: string | null;
  hrefFor: (fileId: string) => string;
}) {
  return (
    <>
      {/* Wide screens: table */}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-pearl md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Documents on this case, with category, upload date, SHA-256 checksum and extraction
            status
          </caption>
          <thead className="bg-mist">
            <tr>
              <th scope="col" className="px-4 py-3 text-sm font-semibold text-ink">
                Document
              </th>
              <th scope="col" className="px-4 py-3 text-sm font-semibold text-ink">
                Uploaded
              </th>
              <th scope="col" className="px-4 py-3 text-sm font-semibold text-ink">
                Checksum (SHA-256)
              </th>
              <th scope="col" className="px-4 py-3 text-sm font-semibold text-ink">
                Extraction
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {files.map((f) => {
              const selected = f.id === selectedId;
              const pending = pendingFor(f.id, fields);
              return (
                <tr key={f.id} className={cn("align-top", selected && "bg-brass-wash/60")}>
                  <td className="px-4 py-3">
                    <Link
                      href={hrefFor(f.id)}
                      scroll={false}
                      aria-current={selected ? "true" : undefined}
                      className="font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
                    >
                      {f.fileName}
                    </Link>
                    <p className="text-sm text-slate">{CATEGORY_LABELS[f.category]}</p>
                  </td>
                  <td className="tnum px-4 py-3 text-sm whitespace-nowrap text-ink">
                    {formatDate(f.uploadedAt)}
                    <p className="text-slate">
                      {f.uploadedBy.role === "client" ? "by you" : `by ${f.uploadedBy.name}`}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      <code className="tnum font-mono text-sm text-ink" title={f.sha256}>
                        <span aria-hidden="true">{shortHash(f.sha256)}</span>
                        <span className="sr-only">{f.sha256}</span>
                      </code>
                      <CopyButton value={f.sha256} label={`checksum for ${f.fileName}`} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ExtractionBadge status={f.extractionStatus} />
                    {pending > 0 && (
                      <p className="mt-1 text-sm font-medium text-brass-ink">
                        {pending} waiting for you
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {files.map((f) => {
          const selected = f.id === selectedId;
          const pending = pendingFor(f.id, fields);
          return (
            <li
              key={f.id}
              className={cn(
                "rounded-lg border bg-pearl p-4",
                selected ? "border-brass" : "border-line",
              )}
            >
              <Link
                href={hrefFor(f.id)}
                scroll={false}
                aria-current={selected ? "true" : undefined}
                className="font-medium break-words text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
              >
                {f.fileName}
              </Link>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                <dt className="text-slate">Category</dt>
                <dd className="text-ink">{CATEGORY_LABELS[f.category]}</dd>
                <dt className="text-slate">Uploaded</dt>
                <dd className="tnum text-ink">
                  {formatDate(f.uploadedAt)}{" "}
                  {f.uploadedBy.role === "client" ? "by you" : `by ${f.uploadedBy.name}`}
                </dd>
                <dt className="text-slate">Checksum</dt>
                <dd className="flex min-w-0 flex-wrap items-center gap-1">
                  <code className="tnum font-mono text-ink" title={f.sha256}>
                    <span aria-hidden="true">{shortHash(f.sha256)}</span>
                    <span className="sr-only">{f.sha256}</span>
                  </code>
                  <CopyButton value={f.sha256} label={`checksum for ${f.fileName}`} />
                </dd>
                <dt className="text-slate">Extraction</dt>
                <dd>
                  <ExtractionBadge status={f.extractionStatus} />
                  {pending > 0 && (
                    <span className="mt-1 block font-medium text-brass-ink">
                      {pending} waiting for you
                    </span>
                  )}
                </dd>
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}
