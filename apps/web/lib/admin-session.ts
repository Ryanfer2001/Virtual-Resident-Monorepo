export const ADMIN_API_BASE_URL = (
  process.env.ADMIN_API_BASE_URL || "http://localhost:3002"
).replace(/\/+$/, "");

export const ADMIN_COOKIE_NAME = "admin_session";

export const ADMIN_COOKIE_MAX_AGE_SEGUNDOS = 30 * 60;
