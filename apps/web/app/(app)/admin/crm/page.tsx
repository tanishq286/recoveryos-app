import type { Metadata } from "next";
import Link from "next/link";

import { KanbanBoard } from "@/components/admin/kanban-board";
import { api } from "@/lib/api/server";
import { handleApiError } from "@/lib/api/guard";
import type { Board, TeamMember } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "CRM board", robots: { index: false } };

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const mine = (await searchParams).mine === "1";
  let board: Board;
  let team: TeamMember[];
  try {
    [board, team] = await Promise.all([
      api<Board>(`crm/board${mine ? "?mine=1" : ""}`, { session: true }),
      api<TeamMember[]>("crm/team", { session: true }),
    ]);
  } catch (e) {
    handleApiError(e, "/admin/crm");
  }
  const leads = board.columns
    .filter((c) => c.kind === "lead")
    .reduce((n, c) => n + c.items.length, 0);
  const cases = board.columns
    .filter((c) => c.kind === "case")
    .reduce((n, c) => n + c.items.length, 0);
  const tab = (active: boolean) =>
    cn(
      "inline-flex min-h-10 items-center rounded-full border px-4 text-sm transition-colors",
      active
        ? "border-signal bg-signal-wash text-fg"
        : "border-(--glass-border) text-fg-2 hover:text-fg",
    );
  return (
    <div className="mx-auto max-w-[120rem] px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[clamp(1.75rem,3.4vw,2.5rem)] text-fg">CRM board</h1>
          <p className="mt-1 text-fg-2 tnum">
            {leads} open leads · {cases} cases. Drag a card, or use its Move to menu.
          </p>
        </div>
        <nav aria-label="Filter" className="flex gap-2">
          <Link href="/admin/crm" aria-current={!mine ? "page" : undefined} className={tab(!mine)}>
            Everyone&apos;s
          </Link>
          <Link
            href="/admin/crm?mine=1"
            aria-current={mine ? "page" : undefined}
            className={tab(mine)}
          >
            Assigned to me
          </Link>
        </nav>
      </div>
      <div className="mt-8">
        <KanbanBoard board={board} team={team} />
      </div>
    </div>
  );
}
