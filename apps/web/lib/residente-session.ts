export const RESIDENTE_COOKIE_NAME = "residente_session";

export const RESIDENTE_COOKIE_MAX_AGE_SEGUNDOS = 8 * 60 * 60;

// Cookie do token CSRF (double-submit): tem de ser legível por JavaScript
// (não httpOnly) para o frontend o poder reenviar como cabeçalho — ao
// contrário do residente_session, que guarda a credencial real e nunca é
// lido fora dos Route Handlers.
export const RESIDENTE_CSRF_COOKIE_NAME = "residente_csrf";
export const RESIDENTE_CSRF_HEADER_NAME = "x-residente-csrf";
