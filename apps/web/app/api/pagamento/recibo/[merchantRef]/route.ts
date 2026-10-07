import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { RESIDENTE_COOKIE_NAME } from "@/lib/residente-session";

const producao =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  (producao ? "" : "http://localhost:3002")
).replace(/\/+$/, "");

const JWT_SECRET = process.env.JWT_SECRET;

interface Contexto {
  params: Promise<{ merchantRef: string }>;
}

/*
 * Consulta read-only de um recibo já confirmado — por isso só confirma
 * a sessão pelo cookie httpOnly (mesmo padrão de
 * /api/residentes/sessao), sem par CSRF: não há aqui nenhuma alteração
 * de estado a proteger, só leitura de um recurso já pertencente ao
 * residente autenticado (o Express confirma de novo
 * pagamento.residenteId === req.utilizador.id antes de devolver nada).
 */
export async function GET(
  request: Request,
  contexto: Contexto,
) {
  if (!JWT_SECRET) {
    return NextResponse.json(
      { sucesso: false, mensagem: "JWT_SECRET não está configurada." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!BACKEND_API_URL) {
    console.error(
      "BACKEND_API_URL não está configurada (obrigatória em produção).",
    );

    return NextResponse.json(
      { sucesso: false, mensagem: "O serviço não está configurado corretamente." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(RESIDENTE_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { sucesso: false, mensagem: "Sessão inválida ou expirada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json(
      { sucesso: false, mensagem: "Sessão inválida ou expirada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { merchantRef } = await contexto.params;

  let resposta: Response;

  try {
    resposta = await fetch(
      `${BACKEND_API_URL}/api/pagamento/recibo/${encodeURIComponent(merchantRef)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("Erro ao contactar o backend para obter o recibo:", error);

    return NextResponse.json(
      { sucesso: false, mensagem: "Não foi possível contactar o serviço." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const texto = await resposta.text();

  let dados: unknown;

  try {
    dados = texto
      ? JSON.parse(texto)
      : { sucesso: false, mensagem: "O servidor devolveu uma resposta vazia." };
  } catch {
    return NextResponse.json(
      { sucesso: false, mensagem: "O servidor devolveu uma resposta inválida." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(dados, {
    status: resposta.status,
    headers: { "Cache-Control": "no-store" },
  });
}
