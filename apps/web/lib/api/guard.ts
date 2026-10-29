import "server-only";

import { notFound, redirect } from "next/navigation";

import { ApiError, getViewer, type Viewer } from "@/lib/api/server";

/** The signed-in viewer, or a redirect to sign in that comes back here afterwards. */
export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

/** Maps API failures on a private page: 401 → sign in, 403/404 → not found. */
export function handleApiError(e: unknown, next: string): never {
  if (e instanceof ApiError && e.status === 401)
    redirect(`/login?next=${encodeURIComponent(next)}`);
  if (e instanceof ApiError && (e.status === 404 || e.status === 403)) notFound();
  throw e;
}
