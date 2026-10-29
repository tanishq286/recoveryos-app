import type { CaseTask, TaskStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { PartyLine } from "@/components/case/party";
import { TASK_TONE } from "@/components/case/status-tone";

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: "To do",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Done",
};

function TaskItem({ task }: { task: CaseTask }) {
  const dateText =
    task.status === "done" && task.completedAt
      ? `Done ${formatDate(task.completedAt)}`
      : task.dueOn
        ? `${task.dueMeaning === "due" ? "Due" : "Expected"} ${formatDate(task.dueOn)}`
        : "No date yet";

  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-base font-semibold text-fg">{task.title}</h3>
        <StatusBadge tone={TASK_TONE[task.status]}>{STATUS_LABEL[task.status]}</StatusBadge>
      </div>
      <p className="mt-1.5 text-base text-fg-2">{task.detail}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <PartyLine party={task.owner} />
        <p className="tnum text-sm font-medium text-fg-3">{dateText}</p>
      </div>
    </li>
  );
}

export function TaskList({ tasks }: { tasks: CaseTask[] }) {
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <section aria-labelledby="tasks-heading">
      <h2 id="tasks-heading" className="text-xl text-fg">
        Tasks
      </h2>
      {tasks.length === 0 ? (
        <p className="mt-4 rounded-[var(--radius-panel)] border border-dashed border-control/60 p-5 text-base text-fg-2">
          No tasks yet. They appear here as soon as the case is scoped, each with a named owner and
          a date.
        </p>
      ) : (
        <>
          {open.length > 0 ? (
            <ul className="panel mt-4 divide-y divide-(--glass-border) p-5 sm:p-6">
              {open.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-base text-fg-2">Nothing open right now.</p>
          )}
          {done.length > 0 && (
            <details className="group mt-4">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-base font-medium text-fg underline decoration-fg/30 underline-offset-[0.22em] hover:decoration-signal">
                <span className="group-open:hidden">Show {done.length} completed</span>
                <span className="hidden group-open:inline">Hide completed</span>
              </summary>
              <ul className="panel mt-3 animate-arrive divide-y divide-(--glass-border) p-5 sm:p-6">
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
