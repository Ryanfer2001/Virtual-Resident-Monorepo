import type { Residente } from "@/types/residente";
import {
  RESIDENTE_CSRF_COOKIE_NAME,
  RESIDENTE_CSRF_HEADER_NAME,
} from "@/lib/residente-session";

const RESIDENTE_KEY = "noszona_residente";

/*
 * O token de sessão nunca passa por aqui — vive só num cookie httpOnly,
 * definido pelo Route Handler de login e inacessível a JavaScript (mesmo
 * em caso de XSS). Isto guarda apenas os dados de perfil (não sensíveis
 * para exibição na UI) em sessionStorage, que é limpo ao fechar o
 * separador — ao contrário do localStorage anterior, que persistia
 * indefinidamente até logout explícito.
 */
export function guardarSessao(residente: Residente): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(RESIDENTE_KEY, JSON.stringify(residente));
}

export function obterResidenteGuardado(): Residente | null {
  if (typeof window === "undefined") {
    return null;
  }

  const residenteSalvo = sessionStorage.getItem(RESIDENTE_KEY);

  if (!residenteSalvo) {
    return null;
  }

  try {
    return JSON.parse(residenteSalvo) as Residente;
  } catch {
    sessionStorage.removeItem(RESIDENTE_KEY);
    return null;
  }
}

export function atualizarResidenteGuardado(residente: Residente): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(RESIDENTE_KEY, JSON.stringify(residente));
}

/*
 * Lê o cookie CSRF (double-submit) legível por JavaScript, para o
 * reenviar como cabeçalho em cada pedido de escrita autenticado por
 * cookie de sessão — mesmo padrão de lib/admin-api.ts.
 */
export function obterCabecalhoCsrf(): Record<string, string> {
  if (typeof document === "undefined") {
    return {};
  }

  const linha = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${RESIDENTE_CSRF_COOKIE_NAME}=`));

  const valor = linha ? decodeURIComponent(linha.split("=")[1]) : "";

  return valor ? { [RESIDENTE_CSRF_HEADER_NAME]: valor } : {};
}

/*
 * Confirma no servidor, via cookie httpOnly, que a sessão ainda é válida
 * — nunca confiar só nos dados guardados em sessionStorage para decidir
 * se uma página protegida (ex.: /dashboard) pode ser desenhada.
 */
export async function verificarSessao(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const resposta = await fetch("/api/residentes/sessao", {
      cache: "no-store",
    });

    return resposta.ok;
  } catch {
    return false;
  }
}

export async function terminarSessao(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(RESIDENTE_KEY);

  try {
    await fetch("/api/residentes/logout", {
      method: "POST",
      headers: obterCabecalhoCsrf(),
    });
  } catch {
    // A sessão local já foi limpa; se o pedido falhar, o cookie httpOnly
    // expira sozinho ao fim do seu tempo de vida.
  }
}
