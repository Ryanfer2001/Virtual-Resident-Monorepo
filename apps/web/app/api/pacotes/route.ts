import { NextResponse } from "next/server";

const producao =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  (producao ? "" : "http://localhost:3002")
).replace(/\/+$/, "");

export async function GET() {
  if (!BACKEND_API_URL) {
    console.error(
      "BACKEND_API_URL não está configurada (obrigatória em produção).",
    );

    return NextResponse.json(
      { sucesso: false, mensagem: "O catálogo de pacotes não está configurado corretamente." },
      { status: 500 },
    );
  }

  let resposta: Response;

  try {
    resposta = await fetch(`${BACKEND_API_URL}/api/pacotes`, {
      method: "GET",
      cache: "no-store",
    });
  } catch (error) {
    console.error("Erro ao contactar o backend para obter o catálogo de pacotes:", error);

    return NextResponse.json(
      { sucesso: false, mensagem: "Não foi possível obter o catálogo de pacotes." },
      { status: 502 },
    );
  }

  const corpo = await resposta.text();

  return new Response(corpo, {
    status: resposta.status,
    headers: {
      "Content-Type":
        resposta.headers.get("content-type") ||
        "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
