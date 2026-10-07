import Link from "next/link";
import { ArrowRightIcon, CalendarIcon, CircleAlertIcon } from "lucide-react";

import type { NextStep } from "@/lib/types";
import { formatDate, formatDayShort } from "@/lib/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PartyLine } from "@/components/case/party";
import { cn } from "@/lib/utils";

const DATE_LABEL: Record<NextStep["dateMeaning"], string> = {
  due: "Due",
  expected: "Expected",
  follow_up: "We follow up on",
};

export function NextStepCard({
  step,
  action,
}: {
  step: NextStep;
  action?: { href: string; label: string };
}) {
  const blocked = step.blocker !== null;
  return (
    <section
      aria-labelledby="next-step-heading"
      className={cn(
        "panel panel-lift vault-card p-6 sm:p-8",
        blocked &&
          "border-blocker/50 shadow-[var(--glass-rim),0_24px_48px_-24px_var(--color-status-error)]",
      )}
    >
      <p className="flex items-center gap-2 text-sm font-medium text-signal">
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-cyan opacity-70" />
          <span className="relative inline-flex size-2 rounded-full bg-brand-cyan" />
        </span>
        Next step
      </p>
      <h2
        id="next-step-heading"
        className="mt-3 max-w-[28ch] text-[clamp(1.5rem,2.6vw,2rem)] leading-[1.15] text-fg"
      >
        We are waiting for {step.waitingFor}.
      </h2>

      <dl className="mt-7 grid gap-6 sm:grid-cols-2 lg:max-w-2xl">
        <div>
          <dt className="text-sm text-fg-3">Who has it</dt>
          <dd className="mt-2">
            <PartyLine party={step.owner} />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-fg-3">{DATE_LABEL[step.dateMeaning]}</dt>
          <dd className="mt-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full border border-(--glass-border) bg-(--glass-elevated)"
            >
              <CalendarIcon className="size-4 text-fg-2" />
            </span>
            <span>
              <span className="tnum block font-medium text-fg">
                {formatDayShort(step.nextDate)}
              </span>
              <span className="tnum block text-sm text-fg-3">{formatDate(step.nextDate)}</span>
            </span>
          </dd>
        </div>
      </dl>

      {step.blocker && (
        <Alert variant="blocker" className="mt-7">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>
            <span className="sr-only">Blocker: </span>
            {step.blocker.title}
          </AlertTitle>
          <AlertDescription>
            <p>{step.blocker.detail}</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-6 border-t border-(--glass-border) pt-6 md:grid-cols-2">
        <div>
          <h3 className="text-base font-semibold text-fg">Why it matters</h3>
          <p className="mt-1.5 text-base text-fg-2">{step.whyItMatters}</p>
        </div>
        <div>
          <h3 className="text-base font-semibold text-fg">After that</h3>
          <p className="mt-1.5 text-base text-fg-2">{step.afterThat}</p>
        </div>
      </div>

      {action && (
        <div className="mt-8">
          <Button asChild className="sheen">
            <Link href={action.href}>
              {action.label}
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
