import { NextResponse } from "next/server";

import {
  ADMIN_API_BASE_URL,
  ADMIN_COOKIE_NAME,
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_CSRF_HEADER_NAME,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  const cookiesRecebidos = request.headers.get("cookie") || "";

  const token = cookiesRecebidos
    .split("; ")
    .find((linha) => linha.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.split("=")[1];

  const csrfCookie = cookiesRecebidos
    .split("; ")
    .find((linha) => linha.startsWith(`${ADMIN_CSRF_COOKIE_NAME}=`))
    ?.split("=")[1];

  const csrfHeader = request.headers.get(ADMIN_CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json(
      { sucesso: false, mensagem: "Token CSRF inválido ou em falta." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (token) {
    try {
      await fetch(`${ADMIN_API_BASE_URL}/api/admin/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      // Sessão stateless do lado do backend — mesmo que o pedido falhe,
      // o cookie local é sempre apagado abaixo.
    }
  }

  const resposta = NextResponse.json(
    { sucesso: true, mensagem: "Sessão administrativa terminada." },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );

  resposta.cookies.delete(ADMIN_COOKIE_NAME);
  resposta.cookies.delete(ADMIN_CSRF_COOKIE_NAME);

  return resposta;
}
