"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, LoaderCircleIcon, SaveIcon, WrenchIcon } from "lucide-react";
import { TRACK_LABELS, TRACK_STATUSES, type TrackStatus } from "@recoveryos/shared";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { callApi } from "@/lib/api/client";
import type { CaseDetail } from "@/lib/api/types";

const TRACKS = [
  { key: "rtaEntitlementStatus", label: "Registrar entitlement letter" },
  { key: "nodalVerificationStatus", label: "Nodal officer verification" },
  { key: "dematCreditStatus", label: "Demat credit" },
] as const;

/**
 * Case team only: set the custom fee, release the folio number to the
 * client, move the case on, record the SRN and the three tracked statuses.
 */
export function StaffControls({ detail }: { detail: CaseDetail }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<"advance" | "save" | "fee" | "release" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const internal = detail.internal!;
  const [track, setTrack] = React.useState({
    rtaEntitlementStatus: internal.rtaEntitlementStatus,
    nodalVerificationStatus: internal.nodalVerificationStatus,
    dematCreditStatus: internal.dematCreditStatus,
    mcaIepf5Srn: internal.mcaIepf5Srn ?? "",
    creditedValueRupees: "",
  });
  const [fee, setFee] = React.useState(
    detail.money.feePct === null ? "" : String(detail.money.feePct),
  );
  const feeLocked = detail.esign.requested || detail.esign.status === "SIGNED";

  async function run(kind: "fee" | "release", fn: () => Promise<unknown>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  const next = detail.steps.find((s) => s.step === detail.recoverStep + 1);

  async function advance() {
    setBusy("advance");
    setError(null);
    try {
      await callApi(`cases/${detail.caseCode}/advance`, {
        body: { toStep: detail.recoverStep + 1 },
      });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setError(null);
    setSaved(false);
    try {
      await callApi(`cases/${detail.caseCode}/tracking`, {
        method: "PATCH",
        body: {
          rtaEntitlementStatus: track.rtaEntitlementStatus,
          nodalVerificationStatus: track.nodalVerificationStatus,
          dematCreditStatus: track.dematCreditStatus,
          mcaIepf5Srn:
            track.mcaIepf5Srn.trim() && track.mcaIepf5Srn.trim() !== internal.mcaIepf5Srn
              ? track.mcaIepf5Srn.trim()
              : undefined,
          creditedValueRupees: track.creditedValueRupees
            ? Number(track.creditedValueRupees)
            : undefined,
        },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="team-heading" className="panel border-signal/30 p-5 sm:p-6">
      <h2 id="team-heading" className="flex items-center gap-2 text-lg font-semibold text-fg">
        <WrenchIcon className="size-5 text-signal" aria-hidden="true" />
        Case team
      </h2>
      {error && (
        <Alert variant="blocker" role="alert" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <form
          className="flex flex-wrap items-end gap-3 rounded-[12px] border border-(--glass-border) p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run("fee", () =>
              callApi(`cases/${detail.caseCode}/fee`, {
                method: "PATCH",
                body: { feePct: Number(fee) },
              }),
            );
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="t-fee" className="mb-1.5 block text-sm text-fg-2">
              Custom fee, % of value credited
            </label>
            <Input
              id="t-fee"
              inputMode="decimal"
              value={fee}
              disabled={feeLocked}
              onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="Set before the mandate"
              className="tnum"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={!!busy || feeLocked || !fee}>
            {busy === "fee" && <LoaderCircleIcon className="animate-spin" aria-hidden="true" />}
            {detail.money.feePct === null ? "Set fee" : "Update fee"}
          </Button>
          {feeLocked && (
            <p className="w-full text-xs text-fg-3">Fixed: the Digital Mandate has been issued.</p>
          )}
        </form>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-(--glass-border) p-3">
          <p className="text-sm text-fg-2">
            Folio number{" "}
            {detail.folioReleasedAt ? "released to the client" : "masked for the client"}.
          </p>
          {!detail.folioReleasedAt && (
            <Button
              size="sm"
              variant="outline"
              disabled={!!busy || !detail.holding}
              onClick={() =>
                void run("release", () =>
                  callApi(`cases/${detail.caseCode}/release-folio`, { body: {} }),
                )
              }
            >
              {busy === "release" && (
                <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              )}
              Release folio
            </Button>
          )}
        </div>
      </div>
      {next && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-(--glass-border) p-3">
          <p className="text-sm text-fg-2">
            Next: <span className="font-semibold text-fg">{next.name}</span>. {next.summary}
          </p>
          <Button size="sm" onClick={advance} disabled={!!busy}>
            {busy === "advance" ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRightIcon aria-hidden="true" />
            )}
            Move to step {next.step}
          </Button>
        </div>
      )}
      <form onSubmit={save} className="mt-5 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {TRACKS.map((t) => (
            <div key={t.key}>
              <label htmlFor={`t-${t.key}`} className="mb-1.5 block text-sm text-fg-2">
                {t.label}
              </label>
              <Select
                id={`t-${t.key}`}
                value={track[t.key]}
                onChange={(e) =>
                  setTrack((s) => ({ ...s, [t.key]: e.target.value as TrackStatus }))
                }
              >
                {TRACK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {TRACK_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="t-srn" className="mb-1.5 block text-sm text-fg-2">
              IEPF-5 SRN (MCA)
            </label>
            <Input
              id="t-srn"
              value={track.mcaIepf5Srn}
              onChange={(e) =>
                setTrack((s) => ({ ...s, mcaIepf5Srn: e.target.value.toUpperCase() }))
              }
              placeholder="T12345678"
              maxLength={9}
              className="tnum font-mono"
            />
          </div>
          <div>
            <label htmlFor="t-credit" className="mb-1.5 block text-sm text-fg-2">
              Value credited, ₹ (on credit)
            </label>
            <Input
              id="t-credit"
              inputMode="decimal"
              value={track.creditedValueRupees}
              onChange={(e) =>
                setTrack((s) => ({
                  ...s,
                  creditedValueRupees: e.target.value.replace(/[^\d.]/g, ""),
                }))
              }
              placeholder="Closing price × shares on the credit date"
              className="tnum"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="outline" size="sm" disabled={!!busy}>
            {busy === "save" ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <SaveIcon aria-hidden="true" />
            )}
            Save tracking
          </Button>
          {saved && (
            <span className="text-sm text-confirmed" role="status">
              Saved.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
