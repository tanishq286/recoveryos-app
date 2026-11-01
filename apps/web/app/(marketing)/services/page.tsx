import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ChartCandlestickIcon } from "lucide-react";
import { SERVICE_VERTICALS } from "@recoveryos/shared";

import { StatusBadge } from "@/components/ui/status-badge";
import { SERVICE_ICONS } from "@/components/services/icons";

export const metadata: Metadata = {
  title: "Services: share recovery, transmission, demat and more",
  description:
    "Eleven turnkey recovery services from Finsol Enterprises, from IEPF share recovery and lost certificates to transmission after a death, demat conversion and NRI recovery. No upfront fee.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="display max-w-[20ch] text-[clamp(2rem,4vw,3rem)] text-fg">
        What we help recover
      </h1>
      <p className="mt-4 max-w-[62ch] text-lg text-fg-2">
        Shares and dividends are where we take cases today, end to end. For the other services we
        call you back and confirm whether we can act. No upfront fee, ever.
      </p>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICE_VERTICALS.map((s) => {
          const Icon = SERVICE_ICONS[s.slug] ?? ChartCandlestickIcon;
          return (
            <li key={s.slug}>
              <Link
                href={`/services/${s.slug}`}
                className="panel vault-glass-hover group flex h-full flex-col gap-3 p-5 focus-visible:outline-2 focus-visible:outline-signal"
              >
                <span className="flex items-start justify-between gap-3">
                  <Icon className="size-6 text-signal" aria-hidden="true" />
                  <StatusBadge
                    tone={s.status === "taking-cases" ? "success" : "neutral"}
                    live={false}
                  >
                    {s.status === "taking-cases" ? "Taking cases" : "Call-back"}
                  </StatusBadge>
                </span>
                <span className="text-lg font-semibold text-fg">{s.name}</span>
                <span className="text-fg-2">{s.summary}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium text-fg">
                  What we handle
                  <ArrowRightIcon
                    className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
