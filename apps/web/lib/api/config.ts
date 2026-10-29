/** Where the NestJS API lives. Only the server talks to it; browsers go through /api/v1 here. */
export const API_URL = (process.env.RECOVERYOS_API_URL ?? "http://localhost:4000/api/v1").replace(
  /\/$/,
  "",
);

export const SESSION_COOKIE = "ros_session";
export const UNLOCK_COOKIE = "ros_unlock";

/** Display-only (name and role, readable by scripts) so static pages can show who is signed in. */
export const WHO_COOKIE = "ros_who";
