/** Where the NestJS API lives. Only the server talks to it; browsers go through /api/v1 here. */
const rawApiUrl = (
  process.env.FINSOL_API_URL ??
  process.env.RECOVERYOS_API_URL ??
  "http://localhost:4000/api/v1"
).replace(/\/$/, "");

export const API_URL = rawApiUrl.endsWith("/api/v1") ? rawApiUrl : `${rawApiUrl}/api/v1`;

/** The Login Gateway's httpOnly session. */
export const SESSION_COOKIE = "fe_session";

/** Display-only (name and role, readable by scripts) so static pages can show who is signed in. */
export const WHO_COOKIE = "fe_who";
