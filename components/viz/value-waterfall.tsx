import type { Quote } from "@/lib/types";
import { formatBps, formatPaise, shareOfPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Step {
  key: string;
  label: string;
  note?: string;
  /** Bar position on a 0..value scale, in paise. */
  from: number;
  to: number;
  amount: string;
  tone: "context" | "fee" | "planned" | "net";
  /** Decrements grow leftward from the running total; totals grow from zero. */
  growFrom: "left" | "right";
}

const BAR: Record<Step["tone"], string> = {
  context: "bg-chart-muted",
  fee: "bg-chart-signal",
  planned: "border border-dashed border-signal bg-signal/10",
  net: "bg-chart-credit",
};

/**
 * What reaches you: the indicative value walked down to the claimant's share,
 * as a horizontal waterfall. Every amount is printed; the bars only show
 * proportion. The protection slice is drawn dashed (planned, conditional) and
 * only taken out of the total if the claimant has said yes.
 */
export function ValueWaterfall({
  quote,
  value,
  basis,
}: {
  quote: Quote;
  value: number;
  /** How the value was estimated, shown under the first row. */
  basis?: string | null;
}) {
  const fee = shareOfPaise(value, quote.successFeeBps);
  const protection = shareOfPaise(value, quote.protectionAllocationBps);
  const optIn = quote.protectionOptIn;
  const net = value - fee - (optIn === true ? protection : 0);

  const steps: Step[] = [
    {
      key: "value",
      label: "Indicative value",
      note: basis ?? undefined,
      from: 0,
      to: value,
      amount: formatPaise(value),
      tone: "context",
      growFrom: "left",
    },
    {
      key: "fee",
      label: `Our success fee, ${formatBps(quote.successFeeBps)}`,
      note: "Only after credit, plus GST",
      from: value - fee,
      to: value,
      amount: `−${formatPaise(fee)}`,
      tone: "fee",
      growFrom: "right",
    },
  ];
  if (optIn !== false) {
    steps.push({
      key: "protection",
      label: `Protection allocation, ${formatBps(quote.protectionAllocationBps)}`,
      note: optIn === true ? "Planned; you said yes" : "Planned; only if you say yes",
      from: value - fee - protection,
      to: value - fee,
      amount: `−${formatPaise(protection)}`,
      tone: "planned",
      growFrom: "right",
    });
  }
  steps.push({
    key: "net",
    label: "Reaches you",
    note:
      optIn === false
        ? "Before GST on our fee. You opted out of protection"
        : "Before GST on our fee",
    from: 0,
    to: net,
    amount: `≈ ${formatPaise(net)}`,
    tone: "net",
    growFrom: "left",
  });

  const pct = (p: number) => (p / value) * 100;

  return (
    <figure className="mt-6 border-t border-line pt-6">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-base font-semibold text-fg">What reaches you</span>
        <span className="text-sm text-fg-3">Indicative, on today&apos;s figures</span>
      </figcaption>
      <dl className="mt-4 space-y-4">
        {steps.map((s, i) => (
          <div
            key={s.key}
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4"
          >
            <dt
              className={cn(
                "min-w-0 text-[0.9375rem]",
                s.tone === "net" ? "font-semibold text-fg" : "text-fg-2",
              )}
            >
              {s.label}
              {s.note && <span className="block text-sm font-normal text-fg-3">{s.note}</span>}
            </dt>
            <dd
              className={cn(
                "tnum text-right",
                s.tone === "net" ? "text-lg font-semibold text-fg" : "text-[0.9375rem] text-fg",
                s.tone === "planned" && "text-fg-2",
              )}
            >
              {s.amount}
            </dd>
            <dd aria-hidden="true" className="relative col-span-2 mt-2 h-3">
              <span className="absolute inset-x-0 top-1/2 h-px bg-line" />
              <span
                style={{
                  left: `${pct(s.from)}%`,
                  width: `max(3px, ${pct(s.to - s.from)}%)`,
                  animationDelay: `${120 + i * 110}ms`,
                }}
                className={cn(
                  "absolute inset-y-0 animate-bar rounded-[3px] transition-[filter] duration-[160ms] group-hover:brightness-125",
                  s.growFrom === "right" ? "origin-right" : "origin-left",
                  BAR[s.tone],
                )}
              />
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
