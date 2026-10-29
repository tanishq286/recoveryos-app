/**
 * Browser-side calls. They go to this app's /api/v1 route, which adds the
 * httpOnly session and unlock cookies and forwards to the API, so no token
 * is ever readable from JavaScript.
 */
export class ClientApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function callApi<T>(
  path: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<T> {
  const res = await fetch(`/api/v1/${path.replace(/^\//, "")}`, {
    method: init.method ?? (init.body !== undefined || init.form ? "POST" : "GET"),
    headers: init.form
      ? undefined
      : init.body !== undefined
        ? { "content-type": "application/json" }
        : undefined,
    body: init.form ?? (init.body === undefined ? undefined : JSON.stringify(init.body)),
    credentials: "same-origin",
  });
  const data = res.headers.get("content-type")?.includes("json")
    ? await res.json().catch(() => null)
    : null;
  if (!res.ok) {
    const m =
      data && typeof data === "object" && "message" in data
        ? (data as { message: unknown }).message
        : null;
    throw new ClientApiError(
      res.status,
      Array.isArray(m) ? m.join(" ") : m ? String(m) : "Something went wrong. Please try again.",
    );
  }
  return data as T;
}
