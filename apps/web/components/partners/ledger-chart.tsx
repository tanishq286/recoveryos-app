"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatPaise, formatPaiseCompact } from "@/lib/format";

const monthLabel = (m: string) =>
  new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(`${m}-01T00:00:00Z`),
  );

/** Commission accrued and paid by month. The same figures are in the ledger table below it. */
export function LedgerChart({
  monthly,
}: {
  monthly: { month: string; accruedPaise: number; paidPaise: number }[];
}) {
  if (!monthly.length) return null;
  return (
    <div className="h-60" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer={false}
          data={monthly.map((m) => ({ ...m, label: monthLabel(m.month) }))}
          margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="var(--color-line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--color-fg-3)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "var(--color-fg-3)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) => formatPaiseCompact(v)}
          />
          <Tooltip
            cursor={{ fill: "var(--color-ink-800)", opacity: 0.4 }}
            contentStyle={{
              background: "var(--color-ink-850)",
              border: "1px solid var(--color-line)",
              borderRadius: 10,
              color: "var(--color-fg)",
            }}
            formatter={(v, name) => [
              formatPaise(Number(v)),
              name === "accruedPaise" ? "Accrued" : "Paid out",
            ]}
          />
          <Legend
            formatter={(v) => (
              <span className="text-sm text-fg-2">
                {v === "accruedPaise" ? "Accrued" : "Paid out"}
              </span>
            )}
          />
          <Bar dataKey="accruedPaise" fill="var(--color-chart-signal)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="paidPaise" fill="var(--color-chart-credit)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
