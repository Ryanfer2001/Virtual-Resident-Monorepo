import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { ADMIN_API_BASE_URL, ADMIN_COOKIE_NAME } from "@/lib/admin-session";

interface Contexto {
  params: Promise<{ path: string[] }>;
}

const METODOS_COM_CORPO = new Set(["POST", "PATCH", "PUT", "DELETE"]);

async function encaminhar(request: NextRequest, contexto: Contexto) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { sucesso: false, mensagem: "Sessão administrativa não encontrada." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { path } = await contexto.params;
  const caminho = path.join("/");
  const query = request.nextUrl.search;

  const corpo = METODOS_COM_CORPO.has(request.method)
    ? await request.text()
    : undefined;

  let respostaBackend: Response;

  try {
    respostaBackend = await fetch(
      `${ADMIN_API_BASE_URL}/api/admin/${caminho}${query}`,
      {
        method: request.method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(corpo
            ? {
                "Content-Type":
                  request.headers.get("content-type") || "application/json",
              }
            : {}),
        },
        body: corpo,
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("Erro ao contactar a API administrativa:", error);

    return NextResponse.json(
      { sucesso: false, mensagem: "API administrativa indisponível." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const conteudoBinario = await respostaBackend.arrayBuffer();

  return new NextResponse(conteudoBinario, {
    status: respostaBackend.status,
    headers: {
      "Content-Type":
        respostaBackend.headers.get("content-type") || "application/json",
      "Cache-Control":
        respostaBackend.headers.get("cache-control") || "no-store",
    },
  });
}

export async function GET(request: NextRequest, contexto: Contexto) {
  return encaminhar(request, contexto);
}

export async function POST(request: NextRequest, contexto: Contexto) {
  return encaminhar(request, contexto);
}

export async function PATCH(request: NextRequest, contexto: Contexto) {
  return encaminhar(request, contexto);
}
