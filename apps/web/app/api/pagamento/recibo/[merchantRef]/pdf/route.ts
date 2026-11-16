import {
  BACKEND_API_URL,
  obterTokenResidente,
  reencaminharErroJson,
  respostaErro,
} from "@/lib/residente-backend";

interface Contexto {
  params: Promise<{ merchantRef: string }>;
}

/*
 * Download do recibo.pdf de um pagamento concluído. O Express confirma
 * de novo a sessão, que o pagamento pertence ao residente autenticado e
 * que está "concluido" — alterar o merchantRef no URL nunca dá acesso ao
 * recibo de outro residente.
 */
export async function GET(_request: Request, contexto: Contexto) {
  const sessao = await obterTokenResidente();

  if ("erro" in sessao) {
    return sessao.erro;
  }

  const { merchantRef } = await contexto.params;

  let resposta: Response;

  try {
    resposta = await fetch(
      `${BACKEND_API_URL}/api/pagamento/recibo/${encodeURIComponent(merchantRef)}/pdf`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${sessao.token}` },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("Erro ao contactar o backend para obter o recibo PDF:", error);
    return respostaErro(502, "Não foi possível contactar o serviço.");
  }

  const tipo = resposta.headers.get("content-type") || "";

  if (!resposta.ok) {
    return reencaminharErroJson(resposta);
  }

  if (!tipo.startsWith("application/pdf")) {
    return respostaErro(502, "O servidor devolveu uma resposta inválida.");
  }

  return new Response(await resposta.arrayBuffer(), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="recibo.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
