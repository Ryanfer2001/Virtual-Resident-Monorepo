import { NextResponse } from "next/server";

const producao =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  (producao ? "" : "http://localhost:3002")
).replace(/\/+$/, "");

/*
 * Encaminha só o cabeçalho Authorization: Bearer <token> — nunca a URL nem
 * a query string — para o Express. Ao contrário de /api/pagamento/iniciar
 * (sessão normal, cookie httpOnly + CSRF), este pedido acontece logo a
 * seguir ao registo, antes de existir qualquer cookie de sessão: usa o
 * mesmo token de curta duração (10 min) já emitido por
 * /api/residentes/registar para autorizar o envio de fotos. O
 * residenteId nunca é aceite deste lado — vem sempre do token, verificado
 * pelo authMiddleware do Express.
 *
 * A resposta do Express é JSON ({ sucesso, url, campos } ou { sucesso:
 * false, mensagem }) — este proxy só reencaminha esse JSON, nunca HTML.
 */
export async function POST(request: Request) {
  if (!BACKEND_API_URL) {
    console.error(
      "BACKEND_API_URL não está configurada (obrigatória em produção).",
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "O serviço de pagamento não está configurado corretamente.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const autorizacao = request.headers.get("authorization");

  if (!autorizacao) {
    return NextResponse.json(
      {
        sucesso: false,
        mensagem: "Sessão inválida ou expirada. Regista-te novamente.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let resposta: Response;

  try {
    resposta = await fetch(
      `${BACKEND_API_URL}/api/pagamento/pacote/iniciar`,
      {
        method: "POST",
        headers: {
          Authorization: autorizacao,
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error(
      "Erro ao contactar o backend de pagamento de pacote:",
      error,
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem: "Não foi possível contactar o serviço de pagamento.",
      },
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
      {
        sucesso: false,
        mensagem: "O servidor devolveu uma resposta inválida.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(dados, {
    status: resposta.status,
    headers: { "Cache-Control": "no-store" },
  });
}
