import { NextResponse } from "next/server";

import { SESSION_COOKIE, UNLOCK_COOKIE, WHO_COOKIE } from "@/lib/api/config";

/** Sign out: clears the session (and any unlock) cookies. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  res.cookies.delete(UNLOCK_COOKIE);
  res.cookies.delete(WHO_COOKIE);
  return res;
}
