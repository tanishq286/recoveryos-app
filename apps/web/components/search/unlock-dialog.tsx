"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, KeyRoundIcon, LoaderCircleIcon, ShieldCheckIcon } from "lucide-react";
import {
  PHYSICAL_CERT_LABELS,
  PHYSICAL_CERT_STATUSES,
  RELATIONSHIP_LABELS,
  RELATIONSHIPS,
  type PhysicalCertStatus,
  type Relationship,
} from "@recoveryos/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { callApi } from "@/lib/api/client";

type Step = "details" | "code" | "done";

/**
 * Teaser to unlock: who is asking, their mobile, a one-time code typed here,
 * then the company, registrar and folio appear for the chosen rows and an
 * analyst is assigned. The code is only ever typed into this page.
 */
export function UnlockDialog({
  open,
  onOpenChange,
  folioIds,
  referralCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folioIds: string[];
  referralCode?: string;
}) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>("details");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resendIn, setResendIn] = React.useState(0);
  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    relationshipToHolder: "SELF" as Relationship,
    physicalCertStatus: "AVAILABLE" as PhysicalCertStatus,
    consent: false,
    otpCode: "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  React.useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      if (step === "done") setStep("details");
    }
    onOpenChange(next);
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!form.consent)
      return setError("Tick the consent box so an analyst may call you about these holdings.");
    setBusy(true);
    try {
      await callApi("auth/otp/request", { body: { phone: form.phone, purpose: "UNLOCK" } });
      setStep("code");
      setResendIn(30);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await callApi("search/unlock", {
        body: {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          relationshipToHolder: form.relationshipToHolder,
          physicalCertStatus: form.physicalCertStatus,
          otpCode: form.otpCode,
          folioIds,
          referralCode: referralCode || undefined,
          consent: true,
        },
      });
      setStep("done");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {step === "done" ? (
          <div className="text-center">
            <CheckCircle2Icon className="mx-auto size-12 text-confirmed" aria-hidden="true" />
            <DialogTitle className="mt-4 pr-0">Unlocked</DialogTitle>
            <DialogDescription>
              The company, registrar and folio are now shown on{" "}
              {folioIds.length === 1 ? "the result" : "your results"}. A valuation analyst has your
              request and will call you within one working day.
            </DialogDescription>
            <Button className="mt-6 w-full" onClick={() => handleOpenChange(false)}>
              See the details
            </Button>
          </div>
        ) : (
          <>
            <DialogTitle>
              Unlock {folioIds.length} {folioIds.length === 1 ? "holding" : "holdings"}
            </DialogTitle>
            <DialogDescription>
              Verify your mobile number to see the company, its registrar and the folio number. This
              is free and puts you under no obligation.
            </DialogDescription>

            {error && (
              <Alert variant="blocker" className="mt-4" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {step === "details" ? (
              <form onSubmit={sendCode} className="mt-5 grid gap-4">
                <div>
                  <label htmlFor="u-name" className="mb-1.5 block text-sm text-fg-2">
                    Your name
                  </label>
                  <Input
                    id="u-name"
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="u-phone" className="mb-1.5 block text-sm text-fg-2">
                      Mobile number
                    </label>
                    <Input
                      id="u-phone"
                      required
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="98765 43210"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className="tnum"
                    />
                  </div>
                  <div>
                    <label htmlFor="u-email" className="mb-1.5 block text-sm text-fg-2">
                      Email (optional)
                    </label>
                    <Input
                      id="u-email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="u-rel" className="mb-1.5 block text-sm text-fg-2">
                      You are
                    </label>
                    <Select
                      id="u-rel"
                      value={form.relationshipToHolder}
                      onChange={(e) => set("relationshipToHolder", e.target.value as Relationship)}
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>
                          {RELATIONSHIP_LABELS[r]}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="u-cert" className="mb-1.5 block text-sm text-fg-2">
                      Paper certificates
                    </label>
                    <Select
                      id="u-cert"
                      value={form.physicalCertStatus}
                      onChange={(e) =>
                        set("physicalCertStatus", e.target.value as PhysicalCertStatus)
                      }
                    >
                      {PHYSICAL_CERT_STATUSES.map((c) => (
                        <option key={c} value={c}>
                          {PHYSICAL_CERT_LABELS[c]}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <label className="flex items-start gap-3 text-sm text-fg-2">
                  <input
                    type="checkbox"
                    checked={form.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                    className="mt-0.5 size-5 shrink-0 accent-(--color-signal)"
                  />
                  I agree that RecoveryOS may call or message me about these holdings. I can
                  withdraw this at any time.
                </label>
                <Button type="submit" size="lg" disabled={busy}>
                  {busy ? (
                    <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
                  ) : (
                    <KeyRoundIcon aria-hidden="true" />
                  )}
                  Send me a code
                </Button>
              </form>
            ) : (
              <form onSubmit={unlock} className="mt-5 grid gap-4">
                <div>
                  <label htmlFor="u-otp" className="mb-1.5 block text-sm text-fg-2">
                    6-digit code sent to {form.phone}
                  </label>
                  <Input
                    id="u-otp"
                    required
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    value={form.otpCode}
                    onChange={(e) => set("otpCode", e.target.value.replace(/\D/g, ""))}
                    className="tnum text-center font-mono text-2xl tracking-[0.5em]"
                  />
                </div>
                <Button type="submit" size="lg" disabled={busy || form.otpCode.length !== 6}>
                  {busy && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
                  Verify and unlock
                </Button>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <button
                    type="button"
                    className="link text-fg-2"
                    onClick={() => setStep("details")}
                  >
                    Change the number
                  </button>
                  <button
                    type="button"
                    className="link text-fg-2 disabled:no-underline disabled:opacity-60"
                    disabled={resendIn > 0 || busy}
                    onClick={() => sendCode()}
                  >
                    {resendIn > 0 ? `Send again in ${resendIn}s` : "Send the code again"}
                  </button>
                </div>
              </form>
            )}

            <p className="mt-5 flex items-start gap-2 border-t border-(--glass-border) pt-4 text-sm text-fg-3">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden="true" />
              Type this code only into this page. We never ask for it, or any other code, by phone,
              WhatsApp or email.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
