"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  Building2Icon,
  CheckIcon,
  KeyRoundIcon,
  LockIcon,
  UnlockIcon,
  UserRoundIcon,
} from "lucide-react";
import {
  CUSTODY_LABELS,
  folioStateLabel,
  type CustodyStatus,
  type SearchResultItem,
} from "@recoveryos/shared";

import { Button } from "@/components/ui/button";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { UnlockDialog } from "@/components/search/unlock-dialog";
import { formatCount, formatPaiseCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX_SELECT = 10;

const CUSTODY_TONE: Record<CustodyStatus, StatusTone> = {
  IEPF_AUTHORITY: "iepf",
  COMPANY_SUSPENSE: "pending",
  PHYSICAL_DORMANT: "neutral",
};

const MATCH_LABEL = {
  exact: "Exact name",
  trigram: "Close spelling",
  phonetic: "Sounds alike",
  soundex: "Similar sound",
} as const;

function Fact({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-fg-3">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-base text-fg",
          mono && "tnum font-mono text-[0.9375rem]",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * The teaser list. Masked rows can be selected (up to ten) and unlocked in
 * one go; unlocked rows show the company, registrar, folio and certificates.
 */
export function SearchResults({
  results,
  referralCode,
}: {
  results: SearchResultItem[];
  referralCode?: string;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);
  // A partner's referral link sets ?ref=; it is kept for later searches in this tab.
  const [ref] = React.useState(() => {
    if (referralCode || typeof window === "undefined") return referralCode;
    try {
      return sessionStorage.getItem("recoveryos:ref") ?? undefined;
    } catch {
      return undefined;
    }
  });
  React.useEffect(() => {
    try {
      if (referralCode) sessionStorage.setItem("recoveryos:ref", referralCode);
    } catch {
      /* storage unavailable: the code only lasts for this page */
    }
  }, [referralCode]);

  const locked = results.filter((r) => !r.unlocked);
  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX_SELECT ? s : [...s, id],
    );

  return (
    <div>
      <ul className="grid gap-3">
        {results.map((r) => {
          const isSelected = selected.includes(r.id);
          return (
            <li key={r.id}>
              <article
                aria-labelledby={`r-${r.id}`}
                className={cn(
                  "panel relative grid gap-4 p-4 transition-[border-color,box-shadow] duration-150 sm:p-5",
                  isSelected && "border-signal shadow-[inset_0_0_0_1px_var(--color-signal)]",
                  r.unlocked && "border-confirmed/40",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      id={`r-${r.id}`}
                      className="flex items-center gap-2 text-lg font-semibold text-fg"
                    >
                      <UserRoundIcon className="size-4 shrink-0 text-fg-3" aria-hidden="true" />
                      {r.investorFullName}
                    </h3>
                    <p className="mt-1 text-sm text-fg-2">
                      {r.fatherOrSpouseName ? (
                        <>Father or spouse: {r.fatherOrSpouseName} · </>
                      ) : null}
                      {[r.city, folioStateLabel(r.state)].filter(Boolean).join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={CUSTODY_TONE[r.custodyStatus]} live={false}>
                      {CUSTODY_LABELS[r.custodyStatus]}
                    </StatusBadge>
                    <StatusBadge tone="neutral" live={false}>
                      {MATCH_LABEL[r.matchedBy]}
                    </StatusBadge>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  <Fact label="Company">
                    {r.unlocked ? (
                      <Link href={`/unclaimed-shares/${r.companySlug}`} className="link">
                        {r.companyName}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <LockIcon className="size-3.5 shrink-0 text-fg-3" aria-hidden="true" />
                        <span aria-label="Company name hidden until unlocked">{r.companyName}</span>
                      </span>
                    )}
                  </Fact>
                  <Fact label="Folio" mono>
                    {r.folioNumber}
                  </Fact>
                  <Fact label="Shares today">
                    <span className="tnum">{formatCount(r.postActionShares)}</span>
                  </Fact>
                  <Fact label="Estimated value">
                    <span className="tnum font-semibold">
                      {formatPaiseCompact(r.estimatedTotalValuePaise)}
                    </span>
                  </Fact>
                </dl>

                {r.unlocked ? (
                  <div className="grid gap-3 border-t border-(--glass-border) pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
                      <Fact label="Registrar">
                        <span className="inline-flex items-center gap-1.5">
                          <Building2Icon
                            className="size-3.5 shrink-0 text-fg-3"
                            aria-hidden="true"
                          />
                          {r.rtaLabel}
                        </span>
                      </Fact>
                      <Fact label="Certificates" mono>
                        {r.certificateNumbers ?? "Not on record"}
                      </Fact>
                      <Fact label="Source filing" mono>
                        {r.sourceFilingSrn ?? "Not on record"}
                        {r.transferFinancialYear ? ` · FY ${r.transferFinancialYear}` : ""}
                      </Fact>
                    </dl>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/unclaimed-shares/${r.companySlug}`}>
                        How to claim it
                        <ArrowRightIcon aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--glass-border) pt-4">
                    <p className="text-sm text-fg-3">
                      {r.transferFinancialYear ? `Moved in FY ${r.transferFinancialYear}. ` : ""}
                      Verify your phone to see the company and folio.
                    </p>
                    <Button
                      type="button"
                      variant={isSelected ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={isSelected}
                      onClick={() => toggle(r.id)}
                      disabled={!isSelected && selected.length >= MAX_SELECT}
                    >
                      {isSelected ? (
                        <CheckIcon aria-hidden="true" />
                      ) : (
                        <UnlockIcon aria-hidden="true" />
                      )}
                      {isSelected ? "Selected" : "This could be mine"}
                    </Button>
                  </div>
                )}
              </article>
            </li>
          );
        })}
      </ul>

      {locked.length > 0 && (
        <div className="sticky bottom-4 z-10 mt-6">
          <div className="vault-glass flex flex-col gap-3 rounded-[16px] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <p className="text-base text-fg-2" aria-live="polite">
              {selected.length
                ? `${selected.length} of ${MAX_SELECT} selected.`
                : "Select the holdings that could be your family's, then unlock them together."}
            </p>
            <Button size="lg" disabled={!selected.length} onClick={() => setOpen(true)}>
              <KeyRoundIcon aria-hidden="true" />
              Unlock {selected.length ? selected.length : ""} with my phone
            </Button>
          </div>
        </div>
      )}

      <UnlockDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setSelected([]);
        }}
        folioIds={selected}
        referralCode={ref}
      />
    </div>
  );
}
