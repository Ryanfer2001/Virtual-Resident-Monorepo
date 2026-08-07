import { NextResponse } from "next/server";

import type {
  EnviarFotosResponse,
} from "@/types/residente";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  "https://darkgrey-meerkat-287167.hostingersite.com"
).replace(/\/+$/, "");

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const respostaNodeRed = await fetch(
      `${BACKEND_API_URL}/api/residentes/fotos`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    const texto = await respostaNodeRed.text();

    let dados: EnviarFotosResponse;

    try {
      dados = texto
        ? JSON.parse(texto)
        : {
            sucesso: false,
            mensagem:
              "O servidor devolveu uma resposta vazia.",
          };
    } catch {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "O servidor devolveu uma resposta inválida.",
          respostaOriginal: texto,
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json(dados, {
      status: respostaNodeRed.status,
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
