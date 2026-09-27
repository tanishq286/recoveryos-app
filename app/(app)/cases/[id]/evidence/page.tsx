import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fingerprint, Info, Upload } from "lucide-react";

import { getDataSource } from "@/lib/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { EvidenceDetail } from "@/components/evidence/evidence-detail";

export async function generateMetadata(
  props: PageProps<"/cases/[id]/evidence">,
): Promise<Metadata> {
  const { id } = await props.params;
  const room = await getDataSource().getEvidenceRoom(id);
  return { title: room ? `${room.reference} · Evidence room` : "Case not found" };
}

export default async function EvidenceRoomPage(props: PageProps<"/cases/[id]/evidence">) {
  const [{ id }, query] = await Promise.all([props.params, props.searchParams]);
  const room = await getDataSource().getEvidenceRoom(id);
  if (!room) notFound();

  const requested = typeof query.doc === "string" ? query.doc : null;
  const requestedFile = requested ? room.files.find((f) => f.id === requested) : undefined;
  const needsYou = room.fields.filter(
    (f) => f.reviewStatus === "pending" && f.needsClientCheck && f.value !== null,
  );
  const selected =
    requestedFile ??
    room.files.find((f) => needsYou.some((n) => n.evidenceFileId === f.id)) ??
    room.files[0] ??
    null;
  const failed = room.files.filter((f) => f.extractionStatus === "failed").length;
  const reading = room.files.filter(
    (f) => f.extractionStatus === "extracting" || f.extractionStatus === "queued",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-slate">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              href="/cases"
              className="underline decoration-slate/40 underline-offset-4 hover:text-ink"
            >
              Sample cases
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/cases/${room.caseId}`}
              className="tnum underline decoration-slate/40 underline-offset-4 hover:text-ink"
            >
              {room.reference}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            Evidence room
          </li>
        </ol>
      </nav>

      <header className="mt-4 max-w-3xl">
        <p className="eyebrow text-brass-ink">Evidence room</p>
        <h1 className="mt-2 font-display text-3xl leading-tight font-medium text-ink sm:text-4xl">
          {room.title}
        </h1>
        <p className="tnum mt-3 text-lg text-ink/85">
          {room.files.length} document{room.files.length === 1 ? "" : "s"}
          {needsYou.length > 0 &&
            ` · ${needsYou.length} detail${needsYou.length === 1 ? "" : "s"} waiting for you`}
          {reading > 0 && ` · ${reading} being read`}
          {failed > 0 && ` · ${failed} couldn't be read`}
        </p>
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Alert variant="default">
          <Fingerprint aria-hidden="true" />
          <AlertTitle>Every file is fingerprinted on arrival</AlertTitle>
          <AlertDescription>
            <p>
              We record a SHA-256 checksum the moment a file lands. If even one pixel changes, the
              checksum changes — so you, we, or a regulator can prove the file filed is the file you
              gave us.
            </p>
          </AlertDescription>
        </Alert>
        <div className="rounded-lg border border-dashed border-control/70 bg-pearl p-4">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <Upload className="size-5" aria-hidden="true" />
            Add a document
          </p>
          <p id="upload-off" className="mt-1 text-base text-slate">
            Uploads are switched off in this demo. Real documents are accepted only after the audit
            log, row-level security and backups have been verified.
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled
            aria-describedby="upload-off"
            className="mt-3"
          >
            Choose file
          </Button>
        </div>
      </div>

      {requested && !requestedFile && (
        <Alert variant="info" className="mt-6">
          <Info aria-hidden="true" />
          <AlertTitle>That document isn&apos;t on this case</AlertTitle>
          <AlertDescription>
            <p>We&apos;re showing {selected ? selected.fileName : "the document list"} instead.</p>
          </AlertDescription>
        </Alert>
      )}

      {room.files.length === 0 ? (
        <section
          aria-labelledby="empty-heading"
          className="mt-8 rounded-lg border border-dashed border-control/70 bg-pearl p-6 sm:p-8"
        >
          <h2 id="empty-heading" className="font-display text-2xl font-medium text-ink">
            No documents yet
          </h2>
          <p className="mt-2 max-w-2xl text-lg text-ink/85">
            When you add a document, it appears here with its category, upload date and checksum. We
            then read it field by field, and each detail comes back to you as a proof card with the
            page it came from.
          </p>
          <h3 className="mt-6 font-sans text-base font-semibold text-ink">Useful to start with</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-ink marker:text-brass">
            <li>Any share certificate, dividend warrant or letter from the company</li>
            <li>PAN card and masked Aadhaar (first 8 digits hidden)</li>
            <li>Client master list from your broker, for the demat account</li>
            <li>For heir claims: the death certificate, and any will or succession document</li>
          </ul>
        </section>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,11fr)_minmax(0,10fr)]">
          <section aria-labelledby="docs-heading">
            <h2 id="docs-heading" className="font-display text-xl font-medium text-ink">
              Documents
            </h2>
            <div className="mt-3">
              <EvidenceList
                files={room.files}
                fields={room.fields}
                selectedId={selected?.id ?? null}
                hrefFor={(fileId) => `/cases/${room.caseId}/evidence?doc=${fileId}#doc-detail`}
              />
            </div>
          </section>
          <div id="doc-detail" className="scroll-mt-6">
            {selected && (
              <EvidenceDetail
                file={selected}
                fields={room.fields.filter((f) => f.evidenceFileId === selected.id)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
