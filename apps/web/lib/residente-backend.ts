import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { RESIDENTE_COOKIE_NAME } from "@/lib/residente-session";

/*
 * Utilitário dos Route Handlers só de leitura do residente (histórico e
 * recibo PDF): mesmo padrão de app/api/pagamento/recibo/[merchantRef] —
 * confirma o cookie httpOnly da sessão e devolve o token para ser
 * reenviado ao Express como Bearer. O Express volta a validar o JWT e a
 * propriedade de cada pagamento; o frontend nunca envia residenteId.
 */

const producao =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

export const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  (producao ? "" : "http://localhost:3002")
).replace(/\/+$/, "");

const SEM_CACHE = { "Cache-Control": "private, no-store" };

export function respostaErro(status: number, mensagem: string) {
  return NextResponse.json(
    { sucesso: false, mensagem },
    { status, headers: SEM_CACHE },
  );
}

export async function obterTokenResidente(): Promise<
  { token: string } | { erro: NextResponse }
> {
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    return { erro: respostaErro(500, "JWT_SECRET não está configurada.") };
  }

  if (!BACKEND_API_URL) {
    console.error(
      "BACKEND_API_URL não está configurada (obrigatória em produção).",
    );

    return {
      erro: respostaErro(500, "O serviço não está configurado corretamente."),
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(RESIDENTE_COOKIE_NAME)?.value;

  if (!token) {
    return { erro: respostaErro(401, "Sessão inválida ou expirada.") };
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return { erro: respostaErro(401, "Sessão inválida ou expirada.") };
  }

  return { token };
}

/*
 * Reencaminha uma resposta de erro JSON do Express mantendo o estado
 * HTTP (401/403/404/409...).
 */
export async function reencaminharErroJson(resposta: Response) {
  const texto = await resposta.text();

  try {
    return NextResponse.json(JSON.parse(texto), {
      status: resposta.status,
      headers: SEM_CACHE,
    });
  } catch {
    return respostaErro(
      resposta.status >= 400 ? resposta.status : 502,
      "O servidor devolveu uma resposta inválida.",
    );
  }
}
