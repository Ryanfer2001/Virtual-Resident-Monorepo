import { NextResponse } from "next/server";

import type {
  RegistoResponse,
} from "@/types/residente";
import { encaminharParaNodeRed } from "@/lib/node-red-proxy";

const NODE_RED_URL = (
  process.env.NODE_RED_URL ||
  "https://darkgrey-meerkat-287167.hostingersite.com"
).replace(/\/+$/, "");

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const resultado = await encaminharParaNodeRed<RegistoResponse>({
      baseUrl: NODE_RED_URL,
      caminho: "/api/residentes/registar",
      body,
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
      "Erro no registo:",
      error,
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível concluir o registo.",
      },
      {
        status: 500,
      },
    );
  }
}
