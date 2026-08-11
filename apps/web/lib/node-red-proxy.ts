import { NextResponse } from "next/server";

interface OpcoesProxyNodeRed {
  baseUrl: string;
  caminho: string;
  body: unknown;
  mensagemRespostaVazia: string;
  mensagemRespostaInvalida: string;
}

type ResultadoProxyNodeRed<T> =
  | { dados: T; status: number }
  | { erro: NextResponse };

/*
 * POST genérico para o backend Node-RED legado, partilhado pelas rotas
 * internas em app/api/residentes/*. Lê a resposta como texto em vez de
 * usar resposta.json() diretamente porque o Node-RED pode devolver corpo
 * vazio (sem isso, .json() rejeitaria antes de chegarmos à mensagem de
 * erro amigável abaixo).
 */
export async function encaminharParaNodeRed<T>(
  opcoes: OpcoesProxyNodeRed,
): Promise<ResultadoProxyNodeRed<T>> {
  const respostaNodeRed = await fetch(`${opcoes.baseUrl}${opcoes.caminho}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(opcoes.body),
    cache: "no-store",
  });

  const texto = await respostaNodeRed.text();

  let dados: T;

  try {
    dados = texto
      ? (JSON.parse(texto) as T)
      : ({ sucesso: false, mensagem: opcoes.mensagemRespostaVazia } as T);
  } catch {
    return {
      erro: NextResponse.json(
        {
          sucesso: false,
          mensagem: opcoes.mensagemRespostaInvalida,
          respostaOriginal: texto,
        },
        { status: 502 },
      ),
    };
  }

  return { dados, status: respostaNodeRed.status };
}
