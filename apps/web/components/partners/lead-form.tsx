"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircleIcon, SendIcon, UserPlusIcon } from "lucide-react";
import {
  PHYSICAL_CERT_LABELS,
  PHYSICAL_CERT_STATUSES,
  RELATIONSHIP_LABELS,
  RELATIONSHIPS,
} from "@recoveryos/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StateOptions } from "@/components/search/state-options";
import { callApi } from "@/lib/api/client";

/** A partner submits a client they met. The analyst still verifies the client on the first call. */
export function LeadForm() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const f = Object.fromEntries(new FormData(el)) as Record<string, string>;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await callApi("associates/me/leads", {
        body: {
          claimantName: f.claimantName,
          phone: f.phone,
          email: f.email || undefined,
          relationshipToHolder: f.relationshipToHolder,
          physicalCertStatus: f.physicalCertStatus,
          holderName: f.holderName,
          companyName: f.companyName || undefined,
          state: f.state,
          notes: f.notes || undefined,
          consentConfirmed: f.consentConfirmed === "on",
        },
      });
      el.reset();
      setDone(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="lead-heading" className="panel p-5 sm:p-6">
      <h2 id="lead-heading" className="flex items-center gap-2 text-lg font-semibold text-fg">
        <UserPlusIcon className="size-5 text-signal" aria-hidden="true" />
        Submit a client
      </h2>
      <form onSubmit={submit} className="mt-4 grid gap-4">
        {error && (
          <Alert variant="blocker" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {done && (
          <Alert variant="confirmed" role="status">
            <AlertDescription>
              Sent. It is on the analysts&apos; board now; you will see it move below.
            </AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="lf-name" className="mb-1.5 block text-sm text-fg-2">
              Client&apos;s name
            </label>
            <Input id="lf-name" name="claimantName" required minLength={2} />
          </div>
          <div>
            <label htmlFor="lf-phone" className="mb-1.5 block text-sm text-fg-2">
              Client&apos;s mobile
            </label>
            <Input id="lf-phone" name="phone" required inputMode="tel" className="tnum" />
          </div>
          <div>
            <label htmlFor="lf-holder" className="mb-1.5 block text-sm text-fg-2">
              Name on the certificate
            </label>
            <Input id="lf-holder" name="holderName" required minLength={2} />
          </div>
          <div>
            <label htmlFor="lf-company" className="mb-1.5 block text-sm text-fg-2">
              Company (if known)
            </label>
            <Input id="lf-company" name="companyName" maxLength={160} />
          </div>
          <div>
            <label htmlFor="lf-rel" className="mb-1.5 block text-sm text-fg-2">
              Client is
            </label>
            <Select id="lf-rel" name="relationshipToHolder" defaultValue="SELF">
              {RELATIONSHIPS.filter((r) => r !== "ADVISOR").map((r) => (
                <option key={r} value={r}>
                  {RELATIONSHIP_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="lf-cert" className="mb-1.5 block text-sm text-fg-2">
              Certificates
            </label>
            <Select id="lf-cert" name="physicalCertStatus" defaultValue="AVAILABLE">
              {PHYSICAL_CERT_STATUSES.map((c) => (
                <option key={c} value={c}>
                  {PHYSICAL_CERT_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="lf-state" className="mb-1.5 block text-sm text-fg-2">
              Holder&apos;s state
            </label>
            <Select id="lf-state" name="state" required defaultValue="">
              <StateOptions />
            </Select>
          </div>
          <div>
            <label htmlFor="lf-email" className="mb-1.5 block text-sm text-fg-2">
              Client&apos;s email (optional)
            </label>
            <Input id="lf-email" name="email" type="email" />
          </div>
        </div>
        <div>
          <label htmlFor="lf-notes" className="mb-1.5 block text-sm text-fg-2">
            Notes
          </label>
          <Textarea id="lf-notes" name="notes" rows={2} maxLength={1000} />
        </div>
        <label className="flex items-start gap-3 text-sm text-fg-2">
          <input
            type="checkbox"
            name="consentConfirmed"
            required
            className="mt-0.5 size-5 shrink-0 accent-(--color-signal)"
          />
          The client has agreed that RecoveryOS may call them about this holding.
        </label>
        <Button type="submit" disabled={busy} className="justify-self-start">
          {busy ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
          ) : (
            <SendIcon aria-hidden="true" />
          )}
          Submit client
        </Button>
      </form>
    </section>
  );
}
