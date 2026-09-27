import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert } from "lucide-react";

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
        "rounded-lg border bg-pearl p-5 shadow-[0_1px_0_rgba(20,35,43,0.04)] sm:p-7",
        blocked ? "border-alert/60" : "border-line",
      )}
    >
      <p className="eyebrow text-brass-ink">What happens next</p>
      <h2
        id="next-step-heading"
        className="mt-2 max-w-3xl font-display text-2xl leading-snug font-medium text-ink sm:text-[1.75rem]"
      >
        We are waiting for {step.waitingFor}.
      </h2>

      <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:max-w-2xl">
        <div>
          <dt className="eyebrow text-slate">Who has it</dt>
          <dd className="mt-2">
            <PartyLine party={step.owner} />
          </dd>
        </div>
        <div>
          <dt className="eyebrow text-slate">{DATE_LABEL[step.dateMeaning]}</dt>
          <dd className="mt-2 flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full border border-line bg-mist"
            >
              <CalendarClock className="size-4 text-ink" />
            </span>
            <span>
              <span className="tnum block font-medium text-ink">
                {formatDayShort(step.nextDate)}
              </span>
              <span className="tnum block text-sm text-slate">{formatDate(step.nextDate)}</span>
            </span>
          </dd>
        </div>
      </dl>

      {step.blocker && (
        <Alert variant="blocker" className="mt-6">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>
            <span className="sr-only">Blocker: </span>
            {step.blocker.title}
          </AlertTitle>
          <AlertDescription>
            <p>{step.blocker.detail}</p>
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-6 grid gap-4 border-t border-line pt-5 md:grid-cols-2">
        <div>
          <h3 className="font-sans text-base font-semibold text-ink">Why it matters</h3>
          <p className="mt-1 text-base text-ink/90">{step.whyItMatters}</p>
        </div>
        <div>
          <h3 className="font-sans text-base font-semibold text-ink">After that</h3>
          <p className="mt-1 text-base text-ink/90">{step.afterThat}</p>
        </div>
      </div>

      {action && (
        <div className="mt-6">
          <Button asChild>
            <Link href={action.href}>
              {action.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
