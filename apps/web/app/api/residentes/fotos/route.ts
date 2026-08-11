import { NextResponse } from "next/server";

import type {
  EnviarFotosResponse,
} from "@/types/residente";
import { encaminharParaNodeRed } from "@/lib/node-red-proxy";

const NODE_RED_URL = (
  process.env.NODE_RED_URL ||
  "https://violet-beaver-178312.hostingerite.com"
).replace(/\/+$/, "");

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const resultado = await encaminharParaNodeRed<EnviarFotosResponse>({
      baseUrl: NODE_RED_URL,
      caminho: "/api/residentes/fotos",
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
