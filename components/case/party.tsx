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
    : [PARTY_ROLE_LABELS[party.role], party.organization].filter(Boolean).join(" · ");

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      {showAvatar && (
        <span
          aria-hidden="true"
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-semibold",
            isClient
              ? "border-brass/70 bg-brass-wash text-brass-ink"
              : "border-line bg-mist text-ink",
          )}
        >
          {isClient ? "You" : initials(party.name)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-medium text-ink">{isClient ? "You" : party.name}</span>
        <span className="block text-sm text-slate">{secondary}</span>
      </span>
    </span>
  );
}
