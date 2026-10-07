import { cn } from "@/lib/utils";

/**
 * A document's SHA-256 checksum drawn as a mark: 32 bytes become 32 radial
 * ticks, each as long as its byte is large, with the four largest bytes lit.
 * Two files share a mark only if they share a checksum, so changing one byte
 * of a file changes this drawing entirely. Decorative twin of the hex string,
 * which stays on the page.
 */
export function HashGlyph({
  sha256,
  className,
  title,
}: {
  sha256: string;
  className?: string;
  /** When set, the glyph is exposed to assistive tech with this name. */
  title?: string;
}) {
  const bytes = Array.from(
    { length: 32 },
    (_, i) => parseInt(sha256.slice(i * 2, i * 2 + 2), 16) || 0,
  );
  const lit = new Set(
    bytes
      .map((b, i) => [b, i] as const)
      .sort((a, b) => b[0] - a[0])
      .slice(0, 4)
      .map(([, i]) => i),
  );
  const inner = 5.2;
  return (
    <svg
      viewBox="-16 -16 32 32"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("size-6 shrink-0", className)}
    >
      <circle r="2.1" fill="var(--color-fg-3)" />
      <circle r={inner - 1.4} fill="none" stroke="var(--color-line)" strokeWidth="0.6" />
      {bytes.map((b, i) => {
        const a = (i / 32) * Math.PI * 2 - Math.PI / 2;
        const len = 2.2 + (b / 255) * 7.6;
        const x1 = Math.cos(a) * inner;
        const y1 = Math.sin(a) * inner;
        const x2 = Math.cos(a) * (inner + len);
        const y2 = Math.sin(a) * (inner + len);
        return (
          <line
            key={i}
            x1={x1.toFixed(2)}
            y1={y1.toFixed(2)}
            x2={x2.toFixed(2)}
            y2={y2.toFixed(2)}
            stroke={lit.has(i) ? "var(--color-signal)" : "var(--color-fg-3)"}
            strokeOpacity={lit.has(i) ? 1 : 0.7}
            strokeWidth="1.15"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
