import { CircleAlert, Hourglass, Info, Upload } from "lucide-react";

import type { EvidenceFile, ExtractedField } from "@/lib/types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, EXTRACTION_LABELS } from "@/lib/labels";
import { ExtractionBadge } from "@/components/evidence/extraction-badge";
import { DocumentPreview } from "@/components/evidence/document-preview";
import { ProofCard } from "@/components/evidence/proof-card";
import { Skeleton } from "@/components/ui/skeleton";

/** Fields that need the client first, then the rest, in document order. */
export function orderFields(fields: ExtractedField[]): ExtractedField[] {
  const rank = (f: ExtractedField) =>
    f.reviewStatus === "pending" && f.needsClientCheck && f.value !== null
      ? 0
      : f.value === null
        ? 1
        : 2;
  return [...fields].sort((a, b) => rank(a) - rank(b));
}

export function EvidenceDetail({ file, fields }: { file: EvidenceFile; fields: ExtractedField[] }) {
  const pages = Array.from(
    new Set(fields.map((f) => f.sourcePage).filter((p): p is number => p !== null)),
  ).sort((a, b) => a - b);
  const firstPending = fields.find((f) => f.reviewStatus === "pending" && f.needsClientCheck);

  return (
    <section aria-labelledby="doc-heading" className="space-y-5">
      <div className="rounded-lg border border-line bg-pearl p-5 sm:p-6">
        <p className="eyebrow text-slate">{CATEGORY_LABELS[file.category]}</p>
        <h2
          id="doc-heading"
          className="mt-1 font-display text-2xl font-medium break-words text-ink"
        >
          {file.fileName}
        </h2>
        <div className="mt-3">
          <ExtractionBadge status={file.extractionStatus} />
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-base sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate">Uploaded</dt>
            <dd className="tnum text-ink">
              {formatDateTime(file.uploadedAt)}
              <span className="block text-sm text-slate">
                {file.uploadedBy.role === "client" ? "by you" : `by ${file.uploadedBy.name}`}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate">File</dt>
            <dd className="tnum text-ink">
              {file.pageCount} page{file.pageCount === 1 ? "" : "s"} · {formatBytes(file.byteSize)}{" "}
              · {file.mimeType === "application/pdf" ? "PDF" : "Image"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-slate">SHA-256 checksum, taken on arrival</dt>
            <dd>
              <code className="tnum block font-mono text-sm break-all text-ink">{file.sha256}</code>
            </dd>
          </div>
        </dl>
      </div>

      {/* Extraction states */}
      {file.extractionStatus === "extracting" || file.extractionStatus === "queued" ? (
        <div className="rounded-lg border border-line bg-pearl p-5" aria-busy="true">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <Hourglass className="size-5 text-brass-ink" aria-hidden="true" />
            {EXTRACTION_LABELS[file.extractionStatus].explain}
          </p>
          <p className="mt-1 text-base text-slate">
            Details will appear here, each with the page it came from. Refresh the page to check.
          </p>
          <div className="mt-4 space-y-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-8 w-3/5" />
            <Skeleton className="h-5 w-4/5" />
          </div>
        </div>
      ) : file.extractionStatus === "failed" ? (
        <Alert variant="blocker">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>We couldn&apos;t read this file</AlertTitle>
          <AlertDescription>
            <p>{file.extractionNote ?? EXTRACTION_LABELS.failed.explain}</p>
            <div>
              <Button variant="outline" disabled aria-describedby="reupload-note">
                <Upload aria-hidden="true" />
                Upload a clearer copy
              </Button>
              <p id="reupload-note" className="mt-2 text-sm text-slate">
                Uploads are switched off in this demo.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        file.extractionNote && (
          <Alert variant={file.extractionStatus === "needs_review" ? "info" : "default"}>
            <Info aria-hidden="true" />
            <AlertTitle>{EXTRACTION_LABELS[file.extractionStatus].explain}</AlertTitle>
            <AlertDescription>
              <p>{file.extractionNote}</p>
            </AlertDescription>
          </Alert>
        )
      )}

      {(file.extractionStatus === "extracted" || file.extractionStatus === "needs_review") &&
        (fields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-control/60 bg-pearl p-5 text-base text-slate">
            No details are needed from this document. It is kept as part of the record.
          </p>
        ) : (
          <>
            {pages.map((p) => (
              <DocumentPreview
                key={p}
                file={file}
                fields={fields}
                page={p}
                highlightFieldId={firstPending?.sourcePage === p ? firstPending.id : undefined}
              />
            ))}
            <div>
              <h3 className="font-display text-xl font-medium text-ink">
                Details read from this document
              </h3>
              <ul className="mt-3 space-y-3">
                {orderFields(fields).map((f) => (
                  <li key={f.id}>
                    <ProofCard field={f} fileName={file.fileName} headingLevel="h4" />
                  </li>
                ))}
              </ul>
            </div>
          </>
        ))}
    </section>
  );
}
