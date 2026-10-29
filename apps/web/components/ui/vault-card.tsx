import * as React from "react";

import { cn } from "@/lib/utils";

type VaultCardProps<T extends React.ElementType> = {
  /** Element to render. Defaults to a div; use "article", "section" or "li" for semantics. */
  as?: T;
  /** Adds the hover lift for cards that are links or controls. */
  interactive?: boolean;
  /** Deeper shadow for hero cards that sit above the page. */
  lift?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, "as">;

/**
 * VaultCard: the product's glass card. Specular rim and a lit top edge
 * always; on fine pointers a cyan glow follows the cursor (driven by the one
 * listener in <CursorGlow />, so cards never re-render while you move).
 */
export function VaultCard<T extends React.ElementType = "div">({
  as,
  interactive = false,
  lift = false,
  className,
  ...props
}: VaultCardProps<T>) {
  const Tag: React.ElementType = as ?? "div";
  return (
    <Tag
      data-slot="vault-card"
      className={cn(
        "panel vault-card",
        lift && "panel-lift",
        interactive && "vault-glass-hover",
        className,
      )}
      {...props}
    />
  );
}
