import { cn } from "@/lib/utils";

/**
 * The branded loading mark: a short route draws from a holding to credit,
 * the credit point lands, and the cycle repeats. Decorative; pair it with a
 * text status. Under reduced motion it shows the finished route, still.
 */
export function RouteLoader({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 20"
      aria-hidden="true"
      className={cn("h-5 w-12 shrink-0 overflow-visible", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="route-loader-g" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--color-signal)" />
          <stop offset="1" stopColor="var(--color-confirmed)" />
        </linearGradient>
      </defs>
      <circle cx="3" cy="15" r="2" fill="var(--color-signal)" />
      <path
        d="M3 15 C 10 15, 12 5, 20 7 S 30 15, 36 10 S 42 4, 45 4"
        pathLength={1}
        stroke="url(#route-loader-g)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeDasharray="1 1"
        className="motion-safe:[animation:route-draw_1.8s_var(--ease-in-out)_infinite]"
      />
      <circle
        cx="45"
        cy="4"
        r="2.4"
        fill="var(--color-confirmed)"
        className="origin-[45px_4px] motion-safe:[animation:route-arrive_1.8s_var(--ease-out)_infinite]"
      />
    </svg>
  );
}
