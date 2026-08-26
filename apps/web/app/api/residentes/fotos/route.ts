import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import type {
  EnviarFotosResponse,
} from "@/types/residente";
import { encaminharParaNodeRed } from "@/lib/node-red-proxy";
import {
  RESIDENTE_COOKIE_NAME,
  RESIDENTE_CSRF_COOKIE_NAME,
  RESIDENTE_CSRF_HEADER_NAME,
} from "@/lib/residente-session";

const NODE_RED_URL = (
  process.env.NODE_RED_URL ||
  "https://violet-beaver-178312.hostingerite.com"
).replace(/\/+$/, "");

const JWT_SECRET = process.env.JWT_SECRET;

function idDoToken(token: string): string | null {
  if (!token || !JWT_SECRET) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id?: string;
      sub?: string;
    };

    const id = payload.id || payload.sub || "";

    return id ? String(id) : null;
  } catch {
    return null;
  }
}

/*
 * O residenteId nunca é aceite do corpo do pedido — vem sempre de um token
 * verificado aqui. Dois casos válidos:
 *  1. Sessão normal: token no cookie httpOnly residente_session — exige-se
 *     também o par CSRF, porque é um cookie ambiente enviado
 *     automaticamente pelo browser.
 *  2. Registo imediato: token de curta duração emitido por registar/route.ts,
 *     passado explicitamente no cabeçalho Authorization. Não é um cookie
 *     ambiente (o cliente tem de o conhecer e enviar), por isso não está
 *     sujeito a CSRF.
 * Sem isto, qualquer pessoa podia substituir a foto de perfil/BI/cartão de
 * outro residente só indicando o respetivo id.
 */
async function residenteIdAutenticado(
  request: Request,
): Promise<{ id: string } | { erro: NextResponse }> {
  const authorization = request.headers.get("authorization") || "";
  const [esquema, tokenRegisto] = authorization.split(" ");

  if (esquema === "Bearer" && tokenRegisto) {
    const id = idDoToken(tokenRegisto);

    if (id) {
      return { id };
    }
  }

  const cookieStore = await cookies();
  const tokenSessao = cookieStore.get(RESIDENTE_COOKIE_NAME)?.value;

  if (!tokenSessao) {
    return {
      erro: NextResponse.json(
        { sucesso: false, mensagem: "Sessão inválida ou expirada." },
        { status: 401 },
      ),
    };
  }

  const csrfCookie = cookieStore.get(RESIDENTE_CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get(RESIDENTE_CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return {
      erro: NextResponse.json(
        { sucesso: false, mensagem: "Token CSRF inválido ou em falta." },
        { status: 403 },
      ),
    };
  }

  const id = idDoToken(tokenSessao);

  if (!id) {
    return {
      erro: NextResponse.json(
        { sucesso: false, mensagem: "Sessão inválida ou expirada." },
        { status: 401 },
      ),
    };
  }

  return { id };
}

export async function POST(
  request: Request,
) {
  try {
    const autenticacao = await residenteIdAutenticado(request);

    if ("erro" in autenticacao) {
      return autenticacao.erro;
    }

    const residenteId = autenticacao.id;

    const body = await request.json();

    const resultado = await encaminharParaNodeRed<EnviarFotosResponse>({
      baseUrl: NODE_RED_URL,
      caminho: "/api/residentes/fotos",
      body: { ...body, residenteId },
      mensagemRespostaVazia:
        "O servidor devolveu uma resposta vazia.",
      mensagemRespostaInvalida:
        "O servidor devolveu uma resposta inválida.",
    });

    if ("erro" in resultado) {
      return resultado.erro;
    }

    return NextResponse.json(resultado.dados, {
      status: resultado.status,
    });
  } catch (error) {
    console.error(
      "Erro ao enviar fotos:",
      error,
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível enviar as fotos.",
      },
      {
        status: 500,
      },
    );
  }
}
