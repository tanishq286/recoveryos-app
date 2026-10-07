import type { Party } from "@/lib/types";
import { PARTY_ROLE_LABELS } from "@/lib/rules/case-states";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

/** Named owner of a step. The client is always shown as "You". */
export function PartyLine({
  party,
  className,
  showAvatar = true,
}: {
  party: Party;
  className?: string;
  showAvatar?: boolean;
}) {
  const isClient = party.role === "client";
  const secondary = isClient
    ? party.name
    : [PARTY_ROLE_LABELS[party.role], party.organization].filter(Boolean).join(", ");

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      {showAvatar && (
        <span
          aria-hidden="true"
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full border text-xs font-semibold tracking-[0.02em]",
            isClient
              ? "border-signal/50 bg-signal-wash text-signal"
              : "border-line bg-ink-800 text-fg-2",
          )}
        >
          {isClient ? "You" : initials(party.name)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-medium text-fg">{isClient ? "You" : party.name}</span>
        <span className="block text-sm text-fg-3">{secondary}</span>
      </span>
    </span>
  );
}
