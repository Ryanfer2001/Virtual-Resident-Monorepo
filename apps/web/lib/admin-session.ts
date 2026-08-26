export const ADMIN_API_BASE_URL = (
  process.env.ADMIN_API_BASE_URL || "http://localhost:3002"
).replace(/\/+$/, "");

export const ADMIN_COOKIE_NAME = "admin_session";

export const ADMIN_COOKIE_MAX_AGE_SEGUNDOS = 30 * 60;

// Cookie do token CSRF (double-submit): tem de ser legível por JavaScript
// (não httpOnly) para o frontend o poder reenviar como cabeçalho — ao
// contrário do admin_session, que guarda a credencial real e nunca é lido
// fora dos Route Handlers.
export const ADMIN_CSRF_COOKIE_NAME = "admin_csrf";
export const ADMIN_CSRF_HEADER_NAME = "x-csrf-token";
