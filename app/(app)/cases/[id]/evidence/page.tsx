import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FingerprintIcon, InfoIcon, UploadIcon } from "lucide-react";

import { getDataSource } from "@/lib/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { VaultCard } from "@/components/ui/vault-card";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { ReadingSummary } from "@/components/viz/reading-summary";
import { RouteMark } from "@/components/brand/route-mark";
import { CaseTitleTransition, PageTransition } from "@/components/motion/page-transition";
import { EvidenceDetail } from "@/components/evidence/evidence-detail";

export async function generateMetadata(
  props: PageProps<"/cases/[id]/evidence">,
): Promise<Metadata> {
  const { id } = await props.params;
  const room = await getDataSource().getEvidenceRoom(id);
  return { title: room ? `Evidence room, case ${room.reference}` : "Case not found" };
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
  const confirmed = room.fields.filter((f) => f.reviewStatus !== "pending").length;
  const missing = room.fields.filter(
    (f) => f.reviewStatus === "pending" && f.value === null,
  ).length;
  const counts = {
    confirmed,
    waiting: needsYou.length,
    notFound: missing,
    readOnly: room.fields.length - confirmed - needsYou.length - missing,
  };
  const reading = room.files.filter(
    (f) => f.extractionStatus === "extracting" || f.extractionStatus === "queued",
  ).length;

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <nav aria-label="Breadcrumb" className="text-sm text-fg-3">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/cases" transitionTypes={["nav-back"]} className="link text-fg-2">
                Sample cases
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/cases/${room.caseId}`}
                transitionTypes={["nav-back"]}
                className="link tnum font-mono text-fg-2"
              >
                {room.reference}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-fg">
              Evidence room
            </li>
          </ol>
        </nav>

        <header className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-12">
          <div className="max-w-3xl min-w-0">
            <p className="text-sm font-medium text-signal">Forensic evidence room</p>
            <CaseTitleTransition caseId={room.caseId}>
              <h1 className="mt-2 text-3xl leading-tight text-fg sm:text-[2.75rem] sm:leading-[1.08]">
                {room.title}
              </h1>
            </CaseTitleTransition>
            <p className="tnum mt-4 text-lg text-fg-2">
              {room.files.length} document{room.files.length === 1 ? "" : "s"}
              {needsYou.length > 0 &&
                `, ${needsYou.length} detail${needsYou.length === 1 ? "" : "s"} waiting for you`}
              {reading > 0 && `, ${reading} being read`}
              {failed > 0 && `, ${failed} couldn't be read`}
            </p>
          </div>
          <ReadingSummary counts={counts} />
        </header>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <VaultCard className="flex gap-3 p-4 sm:p-5">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-[12px] border border-signal/25 bg-signal-wash text-signal"
            >
              <FingerprintIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-fg [font-stretch:100%]">
                Every file is fingerprinted on arrival
              </h2>
              <p className="mt-1 text-base text-fg-2">
                We record a SHA-256 checksum the moment a file lands. If even one pixel changes, the
                checksum changes, so you, we, or a regulator can prove the file filed is the file
                you gave us.
              </p>
            </div>
          </VaultCard>
          <div className="panel border-dashed p-4 sm:p-5">
            <p className="flex items-center gap-2 font-semibold text-fg">
              <UploadIcon className="size-5 text-fg-2" aria-hidden="true" />
              Add a document
            </p>
            <p id="upload-off" className="mt-1 text-base text-fg-2">
              Uploads are switched off in this demo. Real documents are accepted only after the
              audit log, row-level security and backups have been verified.
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
            <InfoIcon aria-hidden="true" />
            <AlertTitle>That document isn&apos;t on this case</AlertTitle>
            <AlertDescription>
              <p>
                We&apos;re showing {selected ? selected.fileName : "the document list"} instead.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {room.files.length === 0 ? (
          <section aria-labelledby="empty-heading" className="panel mt-10 border-dashed p-6 sm:p-8">
            <RouteMark variant="start" className="mb-6 w-48" />
            <h2 id="empty-heading" className="text-2xl text-fg">
              No documents yet
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-fg-2">
              When you add a document, it appears here with its category, upload date and checksum.
              We then read it field by field, and each detail comes back to you as a proof card with
              the page it came from.
            </p>
            <h3 className="mt-8 text-base font-semibold text-fg">Useful to start with</h3>
            <ul className="mt-3 space-y-2 text-base text-fg">
              {[
                "Any share certificate, dividend warrant or letter from the company",
                "PAN card and masked Aadhaar (first 8 digits hidden)",
                "Client master list from your broker, for the demat account",
                "For heir claims: the death certificate, and any will or succession document",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="mt-[0.8em] h-px w-3 shrink-0 bg-signal" />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <section aria-labelledby="docs-heading">
              <h2 id="docs-heading" className="text-xl text-fg">
                Documents
              </h2>
              <div className="mt-4">
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
    </PageTransition>
  );
}
