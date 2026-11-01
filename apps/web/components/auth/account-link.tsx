"use client";

import * as React from "react";
import Link from "next/link";
import { LogInIcon, UserRoundIcon } from "lucide-react";
import type { Role } from "@recoveryos/shared";

import { Button } from "@/components/ui/button";
import { WHO_COOKIE } from "@/lib/api/config";

const subscribe = () => () => {};
const cookieSnapshot = () => document.cookie;
const serverSnapshot = () => "";

export function readWho(cookie: string): { name: string; role: Role } | null {
  try {
    const raw = cookie.split("; ").find((c) => c.startsWith(`${WHO_COOKIE}=`));
    if (!raw) return null;
    const b64 = raw
      .slice(WHO_COOKIE.length + 1)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, "=")), (c) =>
      c.charCodeAt(0),
    );
    return JSON.parse(new TextDecoder().decode(bytes)) as { name: string; role: Role };
  } catch {
    return null;
  }
}

export function homeFor(role: Role): string {
  if (role === "VALUATION_ANALYST" || role === "LEGAL_OPS_EXEC" || role === "SUPER_ADMIN")
    return "/admin/crm";
  return role === "ASSOCIATE_PARTNER" ? "/partners/dashboard" : "/portal";
}

/**
 * "Sign in", or the signed-in person's first name linking to their home.
 * Read on the client from a display-only cookie, so marketing pages stay
 * static. It renders "Sign in" on the server and corrects itself on mount.
 */
export function AccountLink() {
  const cookie = React.useSyncExternalStore(subscribe, cookieSnapshot, serverSnapshot);
  const who = React.useMemo(() => readWho(cookie), [cookie]);
  if (!who) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">
          <LogInIcon aria-hidden="true" />
          Sign in
        </Link>
      </Button>
    );
  }
  return (
    <Button asChild variant="ghost" size="sm" className="max-w-[12rem]">
      <Link href={homeFor(who.role)}>
        <UserRoundIcon aria-hidden="true" />
        <span className="truncate">{who.name.split(" ")[0]}</span>
      </Link>
    </Button>
  );
}
