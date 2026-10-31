"use client";

import { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react";

/**
 * A list that keeps the order its items first arrived in while it stays
 * mounted. The server sorts details that need the client first; without
 * this, approving one re-sorts the list and the card under the pointer
 * jumps away with its confirmation. Items new since the first render keep
 * the server's order after the known ones. Key it by document so a
 * different document starts fresh.
 */
export function StableOrder({ children, className }: { children: ReactNode; className?: string }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement[];
  const [first] = useState(() => items.map((c) => String(c.key)));
  const rank = (c: ReactElement) => {
    const i = first.indexOf(String(c.key));
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  // Array.prototype.sort is stable, so unknown items keep their relative order.
  const ordered = [...items].sort((a, b) => rank(a) - rank(b));
  return <ul className={className}>{ordered}</ul>;
}
