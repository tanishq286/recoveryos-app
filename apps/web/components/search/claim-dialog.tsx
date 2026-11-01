"use client";

import * as React from "react";
import { CheckCircle2Icon, LoaderCircleIcon, SendIcon } from "lucide-react";
import {
  BRAND,
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
import { Select } from "@/components/ui/select";
import { callApi } from "@/lib/api/client";

/** A signed-in member asks Finsol to take up the holdings they picked. */
export function ClaimDialog({
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
  const [done, setDone] = React.useState<null | { underReview: boolean }>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [relationship, setRelationship] = React.useState<Relationship>("SELF");
  const [certs, setCerts] = React.useState<PhysicalCertStatus>("AVAILABLE");
  const [consent, setConsent] = React.useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setError(null);
      setDone(null);
    }
    onOpenChange(next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return setError("Tick the consent box so your analyst may call you.");
    setBusy(true);
    setError(null);
    try {
      const res = await callApi<{ underReview: boolean }>("search/claim", {
        body: {
          folioIds,
          relationshipToHolder: relationship,
          physicalCertStatus: certs,
          referralCode: referralCode || undefined,
          consent: true,
        },
      });
      setDone({ underReview: res.underReview });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {done ? (
          <div className="text-center">
            <CheckCircle2Icon className="mx-auto size-12 text-confirmed" aria-hidden="true" />
            <DialogTitle className="mt-4 pr-0">Your free trace has started</DialogTitle>
            <DialogDescription>
              {done.underReview
                ? `Another person has also asked about one of these holdings. A ${BRAND.name} analyst will verify the family details with each claimant separately before anything proceeds; nothing is shared between you.`
                : `A ${BRAND.name} analyst has your request and will call you within one working day with your custom quote. Nothing is payable upfront.`}
            </DialogDescription>
            <Button className="mt-6 w-full" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogTitle>
              Recover {folioIds.length} {folioIds.length === 1 ? "holding" : "holdings"}
            </DialogTitle>
            <DialogDescription>
              Two quick questions, then your analyst takes it from here.
            </DialogDescription>
            {error && (
              <Alert variant="blocker" className="mt-4" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={submit} className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="c-rel" className="mb-1.5 block text-sm text-fg-2">
                    You are
                  </label>
                  <Select
                    id="c-rel"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value as Relationship)}
                  >
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>
                        {RELATIONSHIP_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label htmlFor="c-cert" className="mb-1.5 block text-sm text-fg-2">
                    Paper certificates
                  </label>
                  <Select
                    id="c-cert"
                    value={certs}
                    onChange={(e) => setCerts(e.target.value as PhysicalCertStatus)}
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
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 accent-(--color-signal)"
                />
                I agree that {BRAND.name} may call or message me about these holdings. I can
                withdraw this at any time.
              </label>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? (
                  <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
                ) : (
                  <SendIcon aria-hidden="true" />
                )}
                Start my free trace
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
