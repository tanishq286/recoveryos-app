import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { TriageFlow } from "@/components/triage/triage-flow";
import { currentYearIST } from "@/lib/rules/triage";

export const metadata: Metadata = {
  title: "3-minute guided check",
  description:
    "Five short questions to find the likely route back to unclaimed shares, dividends, mutual funds, PF or bank deposits in India.",
};

export default function CheckPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="eyebrow mb-6 flex items-center gap-2 text-brass-ink">
        <Lock className="size-3.5" aria-hidden="true" />
        Guided check · about 3 minutes · no sign-up
      </p>
      <TriageFlow maxYear={currentYearIST(new Date())} />
    </div>
  );
}
