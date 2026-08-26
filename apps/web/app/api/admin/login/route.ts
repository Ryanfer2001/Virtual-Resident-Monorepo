import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import type { LoginAdminResponse } from "@/types/admin";

import {
  ADMIN_API_BASE_URL,
  ADMIN_COOKIE_MAX_AGE_SEGUNDOS,
  ADMIN_COOKIE_NAME,
  ADMIN_CSRF_COOKIE_NAME,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { sucesso: false, mensagem: "Username e password são obrigatórios." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const respostaBackend = await fetch(
      `${ADMIN_API_BASE_URL}/api/admin/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      },
    );

    const dados = (await respostaBackend.json()) as LoginAdminResponse;

    if (!respostaBackend.ok || !dados.sucesso || !dados.token) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem: dados.mensagem || "Não foi possível iniciar sessão.",
        },
        {
          status: respostaBackend.status || 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const resposta = NextResponse.json(
      { sucesso: true, mensagem: dados.mensagem, admin: dados.admin },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );

    resposta.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: dados.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE_SEGUNDOS,
    });

    // Cookie CSRF (double-submit): legível por JavaScript de propósito, para
    // o frontend o reenviar como cabeçalho em cada pedido de escrita. Por si
    // só não autentica nada — só prova que quem fez o pedido conseguiu ler
    // um cookie do nosso site, o que um site terceiro nunca consegue.
    resposta.cookies.set({
      name: ADMIN_CSRF_COOKIE_NAME,
      value: randomBytes(32).toString("hex"),
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_COOKIE_MAX_AGE_SEGUNDOS,
    });

    return resposta;
  } catch (error) {
    console.error("Erro no login administrativo:", error);

    return NextResponse.json(
      {
        sucesso: false,
        mensagem: "Não foi possível concluir o login administrativo.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
