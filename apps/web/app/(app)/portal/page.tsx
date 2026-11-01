import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, FolderOpenIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { api } from "@/lib/api/server";
import { handleApiError, requireViewer } from "@/lib/api/guard";
import type { CaseSummary } from "@/lib/api/types";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Your cases", robots: { index: false } };

export default async function PortalPage() {
  const viewer = await requireViewer("/portal");
  let cases: CaseSummary[] = [];
  try {
    cases = await api<CaseSummary[]>("cases", { session: true });
  } catch (e) {
    handleApiError(e, "/portal");
  }
  const staff = viewer.role !== "INVESTOR" && viewer.role !== "ASSOCIATE_PARTNER";
  return (
    <div className="mx-auto max-w-[84rem] px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="display text-[clamp(2rem,4vw,2.75rem)] text-fg">
        {staff
          ? "All cases"
          : viewer.role === "ASSOCIATE_PARTNER"
            ? "Cases you referred"
            : `Your cases, ${viewer.name.split(" ")[0]}`}
      </h1>
      <p className="mt-2 text-lg text-fg-2">
        Seven steps from the first call to shares in a demat account. Each shows who holds it.
      </p>

      {cases.length === 0 ? (
        <div className="panel mt-10 flex flex-col items-start gap-4 p-6">
          <FolderOpenIcon className="size-6 text-fg-3" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-fg">No cases yet</h2>
          <p className="max-w-[56ch] text-fg-2">
            A case opens once an analyst has called you and you have agreed a scope of work. Start
            by finding the holding.
          </p>
          <Button asChild>
            <Link href="/search">
              <SearchIcon aria-hidden="true" />
              Search unclaimed shares
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-10 grid gap-3 md:grid-cols-2">
          {cases.map((c) => (
            <li key={c.caseCode}>
              <Link
                href={`/portal/cases/${c.caseCode}`}
                className="panel vault-glass-hover group flex h-full flex-col gap-4 p-5 focus-visible:outline-2 focus-visible:outline-signal"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-fg-3 tnum">{c.caseCode}</p>
                    <h2 className="mt-1 text-lg font-semibold text-fg">{c.companyName}</h2>
                    <p className="text-sm text-fg-2">
                      {c.scenarioLabel}
                      {staff ? ` · ${c.clientName}` : ""}
                    </p>
                  </div>
                  <StatusBadge
                    tone={
                      c.recoverStep === 7
                        ? "success"
                        : c.recoverStep === 5 && c.esignStatus === "PENDING"
                          ? "active"
                          : "pending"
                    }
                    live={false}
                  >
                    Step {c.recoverStep}: {c.recoverStepName}
                  </StatusBadge>
                </div>
                <div aria-hidden="true" className="flex gap-1">
                  {Array.from({ length: 7 }, (_, i) => (
                    <span
                      key={i}
                      className={
                        i < c.recoverStep
                          ? "h-1.5 flex-1 rounded-full bg-signal"
                          : "h-1.5 flex-1 rounded-full bg-(--glass-elevated)"
                      }
                    />
                  ))}
                </div>
                <p className="mt-auto flex items-center justify-between text-sm text-fg-3">
                  Updated {formatDate(c.updatedAt)}
                  <ArrowRightIcon
                    className="size-4 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
