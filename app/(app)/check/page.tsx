import type { Metadata } from "next";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";

import { TriageFlow } from "@/components/triage/triage-flow";
import { PageTransition } from "@/components/motion/page-transition";
import { currentYearIST } from "@/lib/rules/triage";

export const metadata: Metadata = {
  title: "3-minute guided check",
  description:
    "Five short questions to find the likely route back to unclaimed shares, dividends, mutual funds, PF or bank deposits in India.",
};

export default function CheckPage() {
  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <TriageFlow maxYear={currentYearIST(new Date())} />
        <p className="mt-14 flex items-center gap-2 border-t border-line pt-5 text-sm text-fg-3">
          <LockSimpleIcon className="size-4 shrink-0" aria-hidden="true" />
          Guided check: about 3 minutes, no sign-up.
        </p>
      </div>
    </PageTransition>
  );
}
