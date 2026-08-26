import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { RESIDENTE_COOKIE_NAME } from "@/lib/residente-session";

const JWT_SECRET = process.env.JWT_SECRET;

/*
 * Confirma no servidor que o cookie httpOnly da sessão existe e é um JWT
 * válido, antes de qualquer página do residente (ex.: /dashboard) desenhar
 * conteúdo. Antes desta rota, o "gate" do dashboard confiava inteiramente
 * em dados guardados no browser — bastava escrevê-los na consola para o
 * dashboard renderizar sem sessão real nenhuma.
 */
export async function GET() {
  if (!JWT_SECRET) {
    return NextResponse.json(
      { sucesso: false, mensagem: "JWT_SECRET não está configurada." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(RESIDENTE_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { sucesso: false, mensagem: "Sessão não encontrada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id?: string;
      sub?: string;
      username?: string;
      email?: string;
    };

    const id = payload.id || payload.sub || "";

    if (!id) {
      throw new Error("Token sem id.");
    }

    return NextResponse.json(
      {
        sucesso: true,
        residente: {
          id,
          username: payload.username || "",
          email: payload.email || "",
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { sucesso: false, mensagem: "Sessão inválida ou expirada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}
