import Link from "next/link";

import type { EvidenceFile, ExtractedField } from "@/lib/types";
import { formatDate, shortHash } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/labels";
import { ExtractionBadge } from "@/components/evidence/extraction-badge";
import { CopyButton } from "@/components/evidence/copy-button";
import { HashGlyph } from "@/components/viz/hash-glyph";
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
      <div className="panel hidden overflow-hidden md:block">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">
            Documents on this case, with category, upload date, SHA-256 checksum and extraction
            status
          </caption>
          <thead className="border-b border-(--glass-border) bg-(--glass-elevated)">
            <tr>
              <th scope="col" className="px-4 py-3 text-sm font-medium whitespace-nowrap text-fg-3">
                Document
              </th>
              <th scope="col" className="px-4 py-3 text-sm font-medium whitespace-nowrap text-fg-3">
                Uploaded
              </th>
              <th scope="col" className="px-4 py-3 text-sm font-medium whitespace-nowrap text-fg-3">
                Checksum (SHA-256)
              </th>
              <th scope="col" className="px-4 py-3 text-sm font-medium whitespace-nowrap text-fg-3">
                Extraction
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--glass-border)">
            {files.map((f) => {
              const selected = f.id === selectedId;
              const pending = pendingFor(f.id, fields);
              return (
                <tr
                  key={f.id}
                  className={cn(
                    "align-top transition-colors duration-[160ms] hover:bg-(--glass-elevated)",
                    selected &&
                      "bg-signal-wash/70 shadow-[inset_2px_0_0_var(--color-brand-cyan)] hover:bg-signal-wash/70",
                  )}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <HashGlyph sha256={f.sha256} className="mt-0.5 size-7" />
                      <div className="min-w-0">
                        <Link
                          href={hrefFor(f.id)}
                          scroll={false}
                          aria-current={selected ? "true" : undefined}
                          className="link font-medium"
                        >
                          {f.fileName}
                        </Link>
                        <p className="mt-0.5 text-sm text-fg-3">{CATEGORY_LABELS[f.category]}</p>
                      </div>
                    </div>
                  </td>
                  <td className="tnum px-4 py-4 text-sm whitespace-nowrap text-fg-2">
                    {formatDate(f.uploadedAt)}
                    <p className="text-fg-3">
                      {f.uploadedBy.role === "client" ? "by you" : `by ${f.uploadedBy.name}`}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1.5">
                      <code
                        className="tnum font-mono text-sm whitespace-nowrap text-fg-2"
                        title={f.sha256}
                      >
                        <span aria-hidden="true">{shortHash(f.sha256)}</span>
                        <span className="sr-only">{f.sha256}</span>
                      </code>
                      <CopyButton value={f.sha256} label={`checksum for ${f.fileName}`} />
                    </span>
                  </td>
                  <td className="px-4 py-4 [&_[data-slot=badge]]:whitespace-nowrap">
                    <ExtractionBadge status={f.extractionStatus} />
                    {pending > 0 && (
                      <p className="mt-1.5 text-sm font-medium text-signal">
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
                "panel vault-card p-4",
                selected && "border-signal/60 shadow-[inset_2px_0_0_var(--color-brand-cyan)]",
              )}
            >
              <Link
                href={hrefFor(f.id)}
                scroll={false}
                aria-current={selected ? "true" : undefined}
                className="link font-medium break-words"
              >
                {f.fileName}
              </Link>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-fg-3">Category</dt>
                <dd className="text-fg-2">{CATEGORY_LABELS[f.category]}</dd>
                <dt className="text-fg-3">Uploaded</dt>
                <dd className="tnum text-fg-2">
                  {formatDate(f.uploadedAt)}{" "}
                  {f.uploadedBy.role === "client" ? "by you" : `by ${f.uploadedBy.name}`}
                </dd>
                <dt className="text-fg-3">Checksum</dt>
                <dd className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <code className="tnum font-mono text-fg-2" title={f.sha256}>
                    <span aria-hidden="true">{shortHash(f.sha256)}</span>
                    <span className="sr-only">{f.sha256}</span>
                  </code>
                  <CopyButton value={f.sha256} label={`checksum for ${f.fileName}`} />
                </dd>
                <dt className="text-fg-3">Extraction</dt>
                <dd>
                  <ExtractionBadge status={f.extractionStatus} />
                  {pending > 0 && (
                    <span className="mt-1.5 block font-medium text-signal">
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
