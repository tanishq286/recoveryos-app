"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DownloadIcon,
  FileSignatureIcon,
  LoaderCircleIcon,
  PenLineIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { callApi } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import type { CaseDetail } from "@/lib/api/types";

type Phase = "review" | "aadhaar" | "redirecting";

/**
 * Step 5: the Scope of Work and the Aadhaar eSign. The client reads the PDF
 * in the dialog, confirms, and signs: on the provider's page in production,
 * or through a simulated Aadhaar OTP step in development. The mandate only
 * counts as signed once the provider's webhook verifies.
 */
export function EsignPanel({ detail }: { detail: CaseDetail }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("review");
  const [read, setRead] = React.useState(false);
  const [aadhaar, setAadhaar] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pdfVersion, setPdfVersion] = React.useState(0);

  const signed = detail.esign.status === "SIGNED";
  const canSign = detail.viewerRole === "client" && detail.recoverStep === 5 && !signed;
  const pdfUrl = `/api/v1/cases/${detail.caseCode}/mandate?v=${pdfVersion}`;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await callApi<{ signUrl: string | null; mode: "redirect" | "simulated" }>(
        `cases/${detail.caseCode}/esign/start`,
        { method: "POST" },
      );
      setPdfVersion((v) => v + 1);
      if (res.mode === "redirect" && res.signUrl) {
        setPhase("redirecting");
        window.location.assign(res.signUrl);
        return;
      }
      setPhase("aadhaar");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function complete(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await callApi(`cases/${detail.caseCode}/esign/mock-complete`, {
        body: { aadhaarLast4: aadhaar, otp },
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="esign-heading" className="panel p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="esign-heading" className="flex items-center gap-2 text-lg font-semibold text-fg">
            <FileSignatureIcon className="size-5 text-signal" aria-hidden="true" />
            Mandate and Aadhaar eSign
          </h2>
          <p className="mt-1 text-sm text-fg-2">
            {signed
              ? `Signed ${detail.esign.signedAt ? formatDateTime(detail.esign.signedAt) : ""}.`
              : detail.recoverStep < 5
                ? "Opens at step 5, once you have agreed the offer."
                : "Your Scope of Work is ready to read and sign."}
          </p>
        </div>
        <StatusBadge
          tone={signed ? "success" : detail.recoverStep === 5 ? "active" : "neutral"}
          live={!signed && detail.recoverStep === 5}
        >
          {signed ? "Signed" : detail.recoverStep === 5 ? "Your turn" : "Not yet"}
        </StatusBadge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {canSign && (
          <Button
            onClick={() => {
              setPhase("review");
              setRead(false);
              setOpen(true);
            }}
          >
            <PenLineIcon aria-hidden="true" />
            Review and sign
          </Button>
        )}
        <Button asChild variant="outline" size={canSign ? "default" : "sm"}>
          <a href={pdfUrl} target="_blank" rel="noopener">
            <DownloadIcon aria-hidden="true" />
            {signed ? "Signed mandate (PDF)" : "Scope of Work (PDF)"}
          </a>
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent wide>
          <DialogTitle>Scope of Work for {detail.caseCode}</DialogTitle>
          <DialogDescription>
            {detail.money.feePct}% of the value actually credited, plus GST. Nothing upfront. You
            can stop before filing at no charge.
          </DialogDescription>
          {error && (
            <Alert variant="blocker" role="alert" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {phase === "review" && (
            <>
              <object
                data={pdfUrl}
                type="application/pdf"
                className="mt-5 h-[50dvh] min-h-80 w-full rounded-[12px] border border-(--glass-border) bg-white"
              >
                <p className="p-4 text-fg-2">
                  Your browser can&apos;t show the PDF here.{" "}
                  <a href={pdfUrl} target="_blank" rel="noopener" className="link">
                    Open it in a new tab
                  </a>
                  .
                </p>
              </object>
              <label className="mt-4 flex items-start gap-3 text-base text-fg-2">
                <input
                  type="checkbox"
                  checked={read}
                  onChange={(e) => setRead(e.target.checked)}
                  className="mt-1 size-5 shrink-0 accent-(--color-signal)"
                />
                I have read the Scope of Work and want to sign it with my Aadhaar.
              </label>
              <Button className="mt-4" size="lg" disabled={!read || busy} onClick={start}>
                {busy ? (
                  <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheckIcon aria-hidden="true" />
                )}
                Sign with Aadhaar eSign
              </Button>
            </>
          )}

          {phase === "redirecting" && (
            <p className="mt-6 flex items-center gap-2 text-fg-2">
              <LoaderCircleIcon className="size-5 animate-spin" aria-hidden="true" />
              Taking you to the eSign provider…
            </p>
          )}

          {phase === "aadhaar" && (
            <form onSubmit={complete} className="mt-5 grid gap-4">
              <Alert variant="pending">
                <AlertDescription>
                  Development mode: this simulates the provider&apos;s Aadhaar OTP page. Any four
                  digits and any six-digit code will do; nothing is sent to UIDAI.
                </AlertDescription>
              </Alert>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="e-aadhaar" className="mb-1.5 block text-sm text-fg-2">
                    Last 4 digits of Aadhaar
                  </label>
                  <Input
                    id="e-aadhaar"
                    required
                    inputMode="numeric"
                    maxLength={4}
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                    className="tnum font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="e-otp" className="mb-1.5 block text-sm text-fg-2">
                    Aadhaar OTP
                  </label>
                  <Input
                    id="e-otp"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    className="tnum font-mono"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={busy || aadhaar.length !== 4 || otp.length !== 6}
              >
                {busy && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
                Sign the mandate
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
