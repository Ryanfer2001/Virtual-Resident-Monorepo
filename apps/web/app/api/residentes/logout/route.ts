import { NextResponse } from "next/server";

import {
  RESIDENTE_COOKIE_NAME,
  RESIDENTE_CSRF_COOKIE_NAME,
  RESIDENTE_CSRF_HEADER_NAME,
} from "@/lib/residente-session";

export async function POST(request: Request) {
  const cookiesRecebidos = request.headers.get("cookie") || "";

  const csrfCookie = cookiesRecebidos
    .split("; ")
    .find((linha) => linha.startsWith(`${RESIDENTE_CSRF_COOKIE_NAME}=`))
    ?.split("=")[1];

  const csrfHeader = request.headers.get(RESIDENTE_CSRF_HEADER_NAME);

  // Sem cookie de sessão para começar, o pior que um pedido forjado
  // conseguiria era apagar cookies já inexistentes — mas exige-se sempre o
  // CSRF quando há um cookie CSRF ativo, pela mesma razão do logout admin.
  if (csrfCookie && (!csrfHeader || csrfCookie !== csrfHeader)) {
    return NextResponse.json(
      { sucesso: false, mensagem: "Token CSRF inválido ou em falta." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const resposta = NextResponse.json(
    { sucesso: true, mensagem: "Sessão terminada." },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );

  resposta.cookies.delete(RESIDENTE_COOKIE_NAME);
  resposta.cookies.delete(RESIDENTE_CSRF_COOKIE_NAME);

  return resposta;
}
