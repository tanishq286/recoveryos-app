"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  EyeIcon,
  FileUpIcon,
  FolderLockIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import type { DocStatus, DocType } from "@recoveryos/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { callApi } from "@/lib/api/client";
import { formatBytes, formatDate } from "@/lib/format";
import type { CaseDetail, VaultItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const STATUS: Record<DocStatus, { tone: StatusTone; label: string }> = {
  PENDING: { tone: "neutral", label: "Needed" },
  UPLOADED: { tone: "pending", label: "In review" },
  VERIFIED: { tone: "success", label: "Verified" },
  REJECTED: { tone: "error", label: "Sent back" },
};

const ACCEPT = "application/pdf,image/jpeg,image/png";
const MAX_MB = 10;

function VaultRow({
  item,
  caseCode,
  staff,
  canUpload,
}: {
  item: VaultItem;
  caseCode: string;
  staff: boolean;
  canUpload: boolean;
}) {
  const router = useRouter();
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState<"upload" | "review" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const s = STATUS[item.status];

  async function upload(file: File) {
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) return setError(`Files can be up to ${MAX_MB} MB.`);
    if (!ACCEPT.split(",").includes(file.type)) return setError("Upload a PDF, JPG or PNG.");
    const form = new FormData();
    form.set("file", file);
    setBusy("upload");
    try {
      await callApi(`cases/${caseCode}/documents/${item.docType}`, { form });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function review(status: "VERIFIED" | "REJECTED") {
    setError(null);
    setBusy("review");
    try {
      await callApi(`cases/${caseCode}/documents/${item.docType}`, {
        method: "PATCH",
        body: { status, comment: comment || undefined },
      });
      setRejecting(false);
      setComment("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const id = `doc-${item.docType}`;
  return (
    <li
      className={cn("grid gap-3 py-4 first:pt-0 last:pb-0", item.status === "REJECTED" && "")}
      aria-labelledby={id}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-[48ch]">
          <h3 id={id} className="text-base font-semibold text-fg">
            {item.label}
            {!item.beforeFiling && (
              <span className="ml-2 text-sm font-normal text-fg-3">after filing</span>
            )}
          </h3>
          <p className="mt-0.5 text-sm text-fg-3">{item.reason}</p>
          {item.fileName && (
            <p className="mt-1 text-sm text-fg-2 tnum">
              {item.fileName}
              {item.sizeBytes ? ` · ${formatBytes(item.sizeBytes)}` : ""}
              {item.uploadedAt ? ` · ${formatDate(item.uploadedAt)}` : ""}
              {item.sha256 ? (
                <span className="font-mono"> · {item.sha256.slice(0, 10)}</span>
              ) : null}
            </p>
          )}
        </div>
        <StatusBadge tone={s.tone} live={item.status === "UPLOADED"}>
          {s.label}
        </StatusBadge>
      </div>

      {item.status === "REJECTED" && item.reviewerComment && (
        <Alert variant="blocker">
          <AlertDescription>{item.reviewerComment}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="blocker" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {canUpload && (item.status !== "VERIFIED" || staff) && (
          <>
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              id={`${id}-file`}
              tabIndex={-1}
              aria-label={`Upload ${item.label}`}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
            <Button
              variant={
                item.status === "PENDING" || item.status === "REJECTED" ? "default" : "outline"
              }
              size="sm"
              disabled={!!busy}
              onClick={() => input.current?.click()}
            >
              {busy === "upload" ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              ) : item.hasFile ? (
                <RotateCcwIcon aria-hidden="true" />
              ) : (
                <FileUpIcon aria-hidden="true" />
              )}
              {item.hasFile ? "Replace" : "Upload"}
              <span className="sr-only"> {item.label}</span>
            </Button>
          </>
        )}
        {item.hasFile && (
          <Button asChild variant="ghost" size="sm">
            <a
              href={`/api/v1/cases/${caseCode}/documents/${item.docType}/file`}
              target="_blank"
              rel="noopener"
            >
              <EyeIcon aria-hidden="true" />
              View<span className="sr-only"> {item.label}</span>
            </a>
          </Button>
        )}
        {staff && item.status === "UPLOADED" && !rejecting && (
          <>
            <Button
              variant="confirm"
              size="sm"
              disabled={!!busy}
              onClick={() => review("VERIFIED")}
            >
              <CheckIcon aria-hidden="true" />
              Verify
            </Button>
            <Button
              variant="discrepancy"
              size="sm"
              disabled={!!busy}
              onClick={() => setRejecting(true)}
            >
              <XIcon aria-hidden="true" />
              Send back
            </Button>
          </>
        )}
      </div>
      {rejecting && (
        <div className="grid gap-2">
          <label htmlFor={`${id}-comment`} className="text-sm text-fg-2">
            What should the client fix?
          </label>
          <Textarea
            id={`${id}-comment`}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              variant="discrepancy"
              size="sm"
              disabled={!comment.trim() || !!busy}
              onClick={() => review("REJECTED")}
            >
              Send back
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** The KYC and RTA document vault: checklist for this case's scenario, uploads, review. */
export function DocumentVault({ detail }: { detail: CaseDetail }) {
  const staff = detail.viewerRole === "staff";
  const canUpload = detail.viewerRole === "client" || staff;
  const p = detail.vaultProgress;
  const pct = p.required ? Math.round((p.verified / p.required) * 100) : 0;
  return (
    <section aria-labelledby="vault-heading" className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="vault-heading" className="flex items-center gap-2 text-lg font-semibold text-fg">
          <FolderLockIcon className="size-5 text-signal" aria-hidden="true" />
          Document vault
        </h2>
        <p className="text-sm text-fg-2 tnum">
          {p.verified} of {p.required} verified before filing
          {p.uploaded ? ` · ${p.uploaded} in review` : ""}
          {p.rejected ? ` · ${p.rejected} sent back` : ""}
        </p>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-(--glass-elevated)"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Documents verified"
      >
        <div
          className="h-full rounded-full bg-confirmed transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-fg-3">
        PDF, JPG or PNG up to {MAX_MB} MB. Files are encrypted at rest and used only for this case.
        Please mask the first eight digits of your Aadhaar.
      </p>
      <ul className="mt-5 divide-y divide-(--glass-border)">
        {detail.vault.map((item) => (
          <VaultRow
            key={item.docType}
            item={item}
            caseCode={detail.caseCode}
            staff={staff}
            canUpload={canUpload}
          />
        ))}
      </ul>
    </section>
  );
}

export type { DocType };
