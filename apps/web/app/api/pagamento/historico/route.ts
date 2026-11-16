import { NextResponse } from "next/server";

import {
  BACKEND_API_URL,
  obterTokenResidente,
  reencaminharErroJson,
  respostaErro,
} from "@/lib/residente-backend";

/*
 * Histórico de pagamentos concluídos do residente autenticado (só
 * leitura). Só reencaminha pagina/limite — o residente é sempre o do
 * JWT, resolvido no Express.
 */
export async function GET(request: Request) {
  const sessao = await obterTokenResidente();

  if ("erro" in sessao) {
    return sessao.erro;
  }

  const origem = new URL(request.url).searchParams;
  const params = new URLSearchParams();

  for (const chave of ["pagina", "limite"]) {
    const valor = origem.get(chave);

    if (valor && /^\d{1,4}$/.test(valor)) {
      params.set(chave, valor);
    }
  }

  let resposta: Response;

  try {
    resposta = await fetch(
      `${BACKEND_API_URL}/api/pagamento/historico?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${sessao.token}` },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("Erro ao contactar o backend para obter o histórico:", error);
    return respostaErro(502, "Não foi possível contactar o serviço.");
  }

  if (!resposta.ok) {
    return reencaminharErroJson(resposta);
  }

  return NextResponse.json(await resposta.json(), {
    status: 200,
    headers: { "Cache-Control": "private, no-store" },
  });
}
