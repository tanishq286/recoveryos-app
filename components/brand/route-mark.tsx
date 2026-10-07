import { cn } from "@/lib/utils";

/**
 * The route motif as a still illustration for states with nothing to show.
 *  - "lost":  a route that runs out before it reaches credit (404, errors).
 *  - "start": a holding with the route not yet drawn (empty states).
 * Decorative: the heading and text beside it carry the meaning.
 */
export function RouteMark({
  variant,
  className,
}: {
  variant: "lost" | "start";
  className?: string;
}) {
  const gid = `route-mark-${variant}`;
  return (
    <svg
      viewBox="0 0 240 96"
      aria-hidden="true"
      fill="none"
      className={cn("h-auto w-56 overflow-visible", className)}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--color-signal)" />
          <stop offset="1" stopColor="var(--color-signal)" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {/* the record field, as a quiet grid of points */}
      {Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 16 }, (_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={8 + c * 15}
            cy={10 + r * 15}
            r="1"
            fill="var(--color-fg-3)"
            opacity={0.18 + ((r * 7 + c * 3) % 5) * 0.04}
          />
        )),
      )}
      {variant === "lost" ? (
        <>
          <path
            d="M14 74 C 40 74, 52 34, 86 40 S 120 70, 142 56"
            stroke={`url(#${gid})`}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M150 51 C 162 44, 170 40, 176 38"
            stroke="var(--color-control)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="2 5"
          />
          <circle cx="14" cy="74" r="4" fill="var(--color-signal)" />
          <circle
            cx="222"
            cy="22"
            r="7"
            stroke="var(--color-control)"
            strokeWidth="1.4"
            strokeDasharray="3 3"
          />
        </>
      ) : (
        <>
          <path
            d="M14 74 C 52 74, 70 30, 112 38 S 180 64, 222 22"
            stroke="var(--color-control)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeDasharray="2 6"
          />
          <circle cx="14" cy="74" r="4.5" fill="var(--color-signal)" />
          <circle cx="14" cy="74" r="9" stroke="var(--color-signal)" strokeOpacity="0.35" />
          <circle cx="222" cy="22" r="6" stroke="var(--color-control)" strokeWidth="1.4" />
        </>
      )}
    </svg>
  );
}
