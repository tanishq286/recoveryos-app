import { Check, CircleAlert, Clock, Hourglass } from "lucide-react";

import type { CaseTask, TaskStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PartyLine } from "@/components/case/party";

const STATUS_BADGE: Record<
  TaskStatus,
  { label: string; variant: "neutral" | "progress" | "confirmed" | "blocker"; Icon: typeof Check }
> = {
  open: { label: "To do", variant: "progress", Icon: Clock },
  waiting: { label: "Waiting", variant: "neutral", Icon: Hourglass },
  blocked: { label: "Blocked", variant: "blocker", Icon: CircleAlert },
  done: { label: "Done", variant: "confirmed", Icon: Check },
};

function TaskItem({ task }: { task: CaseTask }) {
  const s = STATUS_BADGE[task.status];
  const dateText =
    task.status === "done" && task.completedAt
      ? `Done ${formatDate(task.completedAt)}`
      : task.dueOn
        ? `${task.dueMeaning === "due" ? "Due" : "Expected"} ${formatDate(task.dueOn)}`
        : "No date yet";

  return (
    <li className="rounded-md border border-line bg-pearl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 font-sans text-base font-semibold text-ink">{task.title}</h3>
        <Badge variant={s.variant}>
          <s.Icon aria-hidden="true" />
          {s.label}
        </Badge>
      </div>
      <p className="mt-1.5 text-base text-ink/85">{task.detail}</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <PartyLine party={task.owner} />
        <p className="tnum text-sm font-medium text-slate">{dateText}</p>
      </div>
    </li>
  );
}

export function TaskList({ tasks }: { tasks: CaseTask[] }) {
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <section aria-labelledby="tasks-heading">
      <h2 id="tasks-heading" className="font-display text-xl font-medium text-ink">
        Tasks
      </h2>
      {tasks.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-control/60 p-4 text-base text-slate">
          No tasks yet. They appear here as soon as the case is scoped, each with a named owner and
          a date.
        </p>
      ) : (
        <>
          {open.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {open.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-base text-slate">Nothing open right now.</p>
          )}
          {done.length > 0 && (
            <details className="group mt-3">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                <span className="group-open:hidden">Show {done.length} completed</span>
                <span className="hidden group-open:inline">Hide completed</span>
              </summary>
              <ul className="mt-3 space-y-3">
                {done.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}
