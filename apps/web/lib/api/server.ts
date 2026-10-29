import "server-only";

import { cookies } from "next/headers";
import type { Role } from "@recoveryos/shared";

import { API_URL, SESSION_COOKIE, UNLOCK_COOKIE } from "@/lib/api/config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function messageOf(body: unknown, status: number): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message: unknown }).message;
    return Array.isArray(m) ? m.join(" ") : String(m);
  }
  return `The service answered ${status}.`;
}

interface ApiOptions {
  /** Send the visitor's session (private data). Forces a fresh, uncached request. */
  session?: boolean;
  /** Send the visitor's unlock token (search results). */
  unlock?: boolean;
  /** Cache public data for this many seconds. */
  revalidate?: number;
  method?: string;
  body?: unknown;
}

/** Server-side call to the API. Throws ApiError with the API's own message. */
export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.session || opts.unlock) {
    const jar = await cookies();
    const session = jar.get(SESSION_COOKIE)?.value;
    const unlock = jar.get(UNLOCK_COOKIE)?.value;
    if (opts.session && session) headers.authorization = `Bearer ${session}`;
    if (opts.unlock && unlock) headers["x-unlock-token"] = unlock;
    if (opts.unlock && session) headers.authorization = `Bearer ${session}`;
  }
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  const personal = opts.session || opts.unlock;
  const res = await fetch(`${API_URL}/${path.replace(/^\//, "")}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    ...(personal || opts.revalidate === undefined
      ? { cache: "no-store" as const }
      : { next: { revalidate: opts.revalidate } }),
  });
  const body = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
  if (!res.ok) throw new ApiError(res.status, messageOf(body, res.status));
  return body as T;
}

/** Like api(), but resolves to null when the API is unreachable or answers with an error. */
export async function apiOrNull<T>(path: string, opts: ApiOptions = {}): Promise<T | null> {
  try {
    return await api<T>(path, opts);
  } catch {
    return null;
  }
}

export interface Viewer {
  id: string;
  name: string;
  role: Role;
}

/**
 * Who is signed in, read from the session cookie for display only (the API
 * verifies the token on every call). Expired or malformed tokens read as no one.
 */
export async function getViewer(): Promise<Viewer | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as {
      sub: string;
      name: string;
      role: Role;
      exp: number;
    };
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return { id: payload.sub, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

export const isStaffRole = (role: Role | undefined) =>
  role === "VALUATION_ANALYST" || role === "LEGAL_OPS_EXEC" || role === "SUPER_ADMIN";
