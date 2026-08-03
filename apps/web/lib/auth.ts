import type { Residente } from "@/types/residente";

const TOKEN_KEY = "noszona_token";
const RESIDENTE_KEY = "noszona_residente";

export function guardarSessao(
  token: string,
  residente: Residente,
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(RESIDENTE_KEY, JSON.stringify(residente));
}

export function obterToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function obterResidenteGuardado(): Residente | null {
  if (typeof window === "undefined") {
    return null;
  }

  const residenteSalvo = localStorage.getItem(RESIDENTE_KEY);

  if (!residenteSalvo) {
    return null;
  }

  try {
    return JSON.parse(residenteSalvo) as Residente;
  } catch {
    localStorage.removeItem(RESIDENTE_KEY);
    return null;
  }
}

export function atualizarResidenteGuardado(
  residente: Residente,
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(RESIDENTE_KEY, JSON.stringify(residente));
}

export function terminarSessao(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(RESIDENTE_KEY);
}