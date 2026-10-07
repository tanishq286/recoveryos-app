import Form from "next/form";
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  ChartCandlestickIcon,
  ChartPieIcon,
  LandmarkIcon,
  LockIcon,
  type LucideIcon,
} from "lucide-react";

import type { AssetType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CHECK_CTA } from "@/components/site/cta";
import { cn } from "@/lib/utils";

const ASSETS: { value: AssetType; label: string; Icon: LucideIcon }[] = [
  { value: "iepf_shares_dividends", label: "Shares & dividends", Icon: ChartCandlestickIcon },
  { value: "mutual_funds", label: "Mutual funds", Icon: ChartPieIcon },
  { value: "provident_fund", label: "Provident fund", Icon: BriefcaseBusinessIcon },
  { value: "bank_deposits", label: "Bank deposits", Icon: LandmarkIcon },
];

const field =
  "min-h-12 w-full min-w-0 rounded-[var(--radius-control)] border border-control bg-(--glass-elevated) px-3.5 text-base text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] transition-[border-color,box-shadow] duration-150 placeholder:text-fg-3 hover:border-fg-3 focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--selection)]";

/**
 * Quick start from the hero: pick the holding, type what you know, and land
 * inside the guided check with those answers filled in. A plain GET form to
 * /check, so it works before (and without) JavaScript. Nothing is looked up
 * or stored here; the check's own steps validate every answer.
 */
export function QuickScanBar({ className }: { className?: string }) {
  return (
    <Form
      action="/check"
      aria-labelledby="quick-scan-heading"
      className={cn("vault-glass relative rounded-[20px] p-4 sm:p-5", className)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-(image:--specular)"
      />
      <fieldset>
        <legend id="quick-scan-heading" className="text-sm font-medium text-fg-2">
          Start from what you know
        </legend>
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
          {ASSETS.map(({ value, label, Icon }, i) => (
            <label key={value} className="relative cursor-pointer">
              <input
                type="radio"
                name="asset"
                value={value}
                defaultChecked={i === 0}
                className="peer sr-only"
              />
              <span className="flex h-full min-h-11 items-center gap-1.5 rounded-[12px] border border-(--glass-border) bg-(--glass-elevated) px-3 py-2 text-[0.9375rem] text-fg-2 sm:rounded-full sm:whitespace-nowrap transition-[border-color,background-color,color,box-shadow] duration-150 peer-checked:border-signal peer-checked:bg-signal-wash peer-checked:text-fg peer-checked:shadow-[inset_0_0_0_1px_var(--color-signal)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal hover:border-(--glass-border-hover) hover:text-fg">
                <Icon className="size-4 shrink-0 text-signal" aria-hidden="true" />
                <span className="leading-tight">{label}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor="qs-issuer" className="mb-1.5 block text-sm text-fg-3">
            Company or institution
          </label>
          <input
            id="qs-issuer"
            name="issuer"
            autoComplete="organization"
            maxLength={120}
            placeholder="As printed on a certificate"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="qs-ref" className="mb-1.5 block text-sm text-fg-3">
            Folio or UAN (optional)
          </label>
          <input
            id="qs-ref"
            name="ref"
            autoComplete="off"
            spellCheck={false}
            maxLength={32}
            placeholder="If you have it"
            className={cn(field, "tnum font-mono text-[0.9375rem]")}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" className="sheen min-h-12 shrink-0">
          {CHECK_CTA}
          <ArrowRightIcon aria-hidden="true" />
        </Button>
        <p className="flex items-start gap-1.5 text-sm text-fg-3">
          <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Fills in the guided check. Nothing is looked up or stored, and we never need a password or
          OTP.
        </p>
      </div>
    </Form>
  );
}
