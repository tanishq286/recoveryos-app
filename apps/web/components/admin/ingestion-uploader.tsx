"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon, FileSpreadsheetIcon, LoaderCircleIcon, UploadIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { callApi } from "@/lib/api/client";
import { formatCount, formatDateTime } from "@/lib/format";
import type { IngestionJob } from "@/lib/api/types";

const TONE: Record<IngestionJob["status"], StatusTone> = {
  QUEUED: "pending",
  PROCESSING: "active",
  COMPLETED: "success",
  FAILED: "error",
};

/** Upload an IEPF-2 or IEPF-4 statement, then watch it parse. */
export function IngestionUploader({
  companies,
  jobs,
}: {
  companies: { slug: string; name: string }[];
  jobs: IngestionJob[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const running = jobs.some((j) => j.status === "QUEUED" || j.status === "PROCESSING");

  React.useEffect(() => {
    if (!running) return;
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [running, router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const form = new FormData(el);
    setBusy(true);
    setError(null);
    try {
      await callApi("admin/ingestion", { form });
      el.reset();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={submit} className="panel grid gap-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
          <FileSpreadsheetIcon className="size-5 text-signal" aria-hidden="true" />
          New import
        </h2>
        {error && (
          <Alert variant="blocker" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="i-form" className="mb-1.5 block text-sm text-fg-2">
              Statement
            </label>
            <Select id="i-form" name="formType" defaultValue="">
              <option value="">Detect from the columns</option>
              <option value="IEPF_4">IEPF-4: shares moved to the IEPF</option>
              <option value="IEPF_2">IEPF-2: unpaid amounts with the company</option>
            </Select>
          </div>
          <div>
            <label htmlFor="i-company" className="mb-1.5 block text-sm text-fg-2">
              Company
            </label>
            <Select id="i-company" name="companySlug" defaultValue="">
              <option value="">From the file (CIN or company name column)</option>
              {companies.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="i-file" className="mb-1.5 block text-sm text-fg-2">
              Statement (.xlsx, .xls, .csv or .pdf, up to 40 MB)
            </label>
            <input
              id="i-file"
              name="file"
              type="file"
              required
              accept=".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block min-h-12 w-full rounded-[var(--radius-control)] border border-control bg-(--glass-elevated) px-3 py-2.5 text-sm text-fg-2 file:mr-3 file:rounded-md file:border-0 file:bg-ink-800 file:px-3 file:py-1.5 file:text-fg"
            />
          </div>
        </div>
        <div>
          <label htmlFor="i-source" className="mb-1.5 block text-sm text-fg-2">
            Where it was published (optional)
          </label>
          <Input
            id="i-source"
            name="sourceUrl"
            type="url"
            placeholder="https://www.company.com/investors/iepf/statement.xlsx"
            maxLength={2000}
          />
          <p className="mt-1 text-sm text-fg-3">
            Kept with every row imported from this file, so each record traces back to its source.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <UploadIcon aria-hidden="true" />
            )}
            Upload and import
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="/api/v1/admin/ingestion/template.csv">
              <DownloadIcon aria-hidden="true" />
              Column template
            </a>
          </Button>
        </div>
        <p className="text-sm text-fg-3">
          The MCA statutory columns are read as filed: investor and father or husband names,
          address, country, state, district, PIN, folio or DP ID-client ID, investment type, amount
          transferred or number of shares, and the date of event or proposed transfer date. Title
          blocks, multi-line headers, share-count rows and PDF tables (including sideways pages) are
          handled; a missing state is taken from the PIN code. Each holder&apos;s amount is kept per
          statement date, so another year&apos;s statement adds to it and re-importing the same file
          never double counts.
        </p>
      </form>

      <section aria-labelledby="jobs-heading">
        <h2 id="jobs-heading" className="text-lg font-semibold text-fg">
          Recent imports
        </h2>
        {jobs.length === 0 ? (
          <p className="mt-3 text-fg-3">No imports yet.</p>
        ) : (
          <div className="panel mt-3 overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-fg-3">
                <tr className="border-b border-(--glass-border)">
                  <th scope="col" className="px-4 py-3 font-medium">
                    File
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Rows
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    New
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Updated
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Skipped
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--glass-border)">
                {jobs.map((j) => (
                  <tr key={j.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-fg">{j.fileName}</p>
                      <p className="text-fg-3">
                        {j.formType.replace("_", "-")}
                        {j.sourceUrl && (
                          <>
                            {" · "}
                            <a
                              href={j.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link"
                            >
                              source
                            </a>
                          </>
                        )}
                      </p>
                      {j.errors.length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-pending">
                            {j.errors.length} row problems
                          </summary>
                          <ul className="mt-1 grid gap-0.5 text-fg-2">
                            {j.errors.slice(0, 20).map((er, i) => (
                              <li key={i}>
                                {er.row ? <span className="tnum">Row {er.row}: </span> : null}
                                {er.message}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={TONE[j.status]}
                        live={j.status === "PROCESSING" || j.status === "QUEUED"}
                      >
                        {j.status.charAt(0) + j.status.slice(1).toLowerCase()}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right tnum">{formatCount(j.totalRows)}</td>
                    <td className="px-4 py-3 text-right tnum">{formatCount(j.insertedRows)}</td>
                    <td className="px-4 py-3 text-right tnum">{formatCount(j.updatedRows)}</td>
                    <td className="px-4 py-3 text-right tnum">{formatCount(j.skippedRows)}</td>
                    <td className="px-4 py-3 text-fg-2">
                      {formatDateTime(j.createdAt)}
                      {j.uploadedBy ? (
                        <span className="block text-fg-3">{j.uploadedBy}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
