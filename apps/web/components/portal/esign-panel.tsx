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
 * The Digital Mandate. With an eSign provider the client signs with Aadhaar
 * on the provider's page; without one, production offers an online
 * acceptance confirmed by a mobile code (never labelled an Aadhaar eSign) and
 * development offers a simulator. Only a verified webhook marks it accepted.
 */
export function EsignPanel({ detail }: { detail: CaseDetail }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("review");
  const [mode, setMode] = React.useState<"redirect" | "simulated" | "internal">("simulated");
  const [read, setRead] = React.useState(false);
  const [aadhaar, setAadhaar] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pdfVersion, setPdfVersion] = React.useState(0);

  const signed = detail.esign.status === "SIGNED";
  const method = detail.esign.method;
  const methodName =
    method === "aadhaar-esign"
      ? "Aadhaar eSign"
      : method === "portal-acceptance"
        ? "online acceptance"
        : "development simulator";
  const quoted = detail.money.feePct !== null;
  const canSign = detail.viewerRole === "client" && detail.recoverStep === 5 && !signed && quoted;
  const pdfUrl = `/api/v1/cases/${detail.caseCode}/mandate?v=${pdfVersion}`;

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await callApi<{
        signUrl: string | null;
        mode: "redirect" | "simulated" | "internal";
      }>(`cases/${detail.caseCode}/esign/start`, { method: "POST" });
      setPdfVersion((v) => v + 1);
      if (res.mode === "redirect" && res.signUrl) {
        setPhase("redirecting");
        window.location.assign(res.signUrl);
        return;
      }
      setMode(res.mode);
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
        body: mode === "internal" ? { otp } : { aadhaarLast4: aadhaar, otp },
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
            {method === "aadhaar-esign" ? "Mandate and Aadhaar eSign" : "Digital Mandate"}
          </h2>
          <p className="mt-1 text-sm text-fg-2">
            {signed
              ? `${method === "aadhaar-esign" ? "Signed with Aadhaar eSign" : method === "portal-acceptance" ? "Accepted online with a mobile code (not an Aadhaar eSign)" : "Marked accepted by the development simulator (not a signature)"} ${detail.esign.signedAt ? formatDateTime(detail.esign.signedAt) : ""}.`
              : detail.recoverStep < 5
                ? "Opens at step 5, once you have agreed the offer."
                : detail.money.feePct === null
                  ? "Your analyst is preparing your custom quote. The mandate opens once it is ready."
                  : "Your Digital Mandate is ready to read and sign."}
          </p>
        </div>
        <StatusBadge
          tone={signed ? "success" : detail.recoverStep === 5 ? "active" : "neutral"}
          live={!signed && detail.recoverStep === 5}
        >
          {signed
            ? method === "aadhaar-esign"
              ? "Signed"
              : "Accepted"
            : detail.recoverStep === 5
              ? "Your turn"
              : "Not yet"}
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
        {quoted && (
          <Button asChild variant="outline" size={canSign ? "default" : "sm"}>
            <a href={pdfUrl} target="_blank" rel="noopener">
              <DownloadIcon aria-hidden="true" />
              {signed ? "Signed mandate (PDF)" : "Digital Mandate (PDF)"}
            </a>
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent wide>
          <DialogTitle>Digital Mandate for {detail.caseCode}</DialogTitle>
          <DialogDescription>
            Your agreed fee: {detail.money.feePct}% of the value actually credited, plus GST.
            Nothing upfront. You can stop before filing at no charge.
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
                {method === "aadhaar-esign"
                  ? "I have read the Digital Mandate and want to sign it with my Aadhaar."
                  : "I have read the Digital Mandate and want to accept it."}
              </label>
              <Button className="mt-4" size="lg" disabled={!read || busy} onClick={start}>
                {busy ? (
                  <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheckIcon aria-hidden="true" />
                )}
                {method === "aadhaar-esign"
                  ? "Sign with Aadhaar eSign"
                  : `Continue to ${methodName}`}
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
              {mode === "internal" ? (
                <Alert variant="pending" data-testid="esign-internal">
                  <AlertDescription>
                    Aadhaar eSign is not connected yet. You can accept this mandate electronically
                    here, confirmed by the code we sent to your mobile. This is an online
                    acceptance, not an Aadhaar eSign.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="pending">
                  <AlertDescription>
                    Development mode: this simulates the provider&apos;s Aadhaar OTP page. Any four
                    digits and any six-digit code will do; nothing is sent to UIDAI.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {mode !== "internal" && (
                  <div>
                    <label htmlFor="e-aadhaar" className="mb-1.5 block text-sm text-fg-2">
                      Any 4 digits (simulator)
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
                )}
                <div>
                  <label htmlFor="e-otp" className="mb-1.5 block text-sm text-fg-2">
                    {mode === "internal" ? "Code sent to your mobile" : "Any 6 digits (simulator)"}
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
                disabled={busy || (mode !== "internal" && aadhaar.length !== 4) || otp.length !== 6}
              >
                {busy && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
                {mode === "internal" ? "Accept the mandate" : "Mark accepted (simulator)"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
