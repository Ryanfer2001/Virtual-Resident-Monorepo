import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import {
  RESIDENTE_COOKIE_NAME,
  RESIDENTE_CSRF_COOKIE_NAME,
  RESIDENTE_CSRF_HEADER_NAME,
} from "@/lib/residente-session";

const producao =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  (producao ? "" : "http://localhost:3002")
).replace(/\/+$/, "");

const JWT_SECRET = process.env.JWT_SECRET;

/*
 * O residenteId nunca é aceite do formulário — vem sempre do token do
 * cookie httpOnly da sessão, nunca de algo que o cliente possa forjar.
 * Sem isto, qualquer pessoa podia iniciar um pagamento Vinti4 associado à
 * conta de outro residente só mudando o campo oculto (ou, antes da
 * migração para cookie, só lendo o token de outra aba/localStorage).
 * Por ser um cookie ambiente, exige-se também o par CSRF (double-submit).
 */
async function residenteIdAutenticado(
  request: Request,
): Promise<{ id: string; token: string } | null> {
  if (!JWT_SECRET) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(RESIDENTE_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const csrfCookie = cookieStore.get(RESIDENTE_CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get(RESIDENTE_CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id?: string;
      sub?: string;
    };

    const id = payload.id || payload.sub || "";

    return id ? { id: String(id), token } : null;
  } catch {
    return null;
  }
}

function paginaErro(mensagem: string) {
  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Erro no pagamento</title>
</head>
<body
  style="
    font-family: Arial, sans-serif;
    background: #061827;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
  "
>
  <div
    style="
      background: white;
      color: #0f1f2e;
      padding: 40px;
      border-radius: 20px;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    "
  >
    <h1>Erro no pagamento</h1>
    <p style="color: #607080;">${mensagem}</p>
  </div>
</body>
</html>`;
}

function respostaHtml(corpo: string, status: number) {
  return new Response(corpo, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  if (!BACKEND_API_URL) {
    console.error(
      "BACKEND_API_URL não está configurada (obrigatória em produção).",
    );

    return respostaHtml(
      paginaErro(
        "O serviço de pagamento não está configurado corretamente.",
      ),
      500,
    );
  }

  const autenticacao = await residenteIdAutenticado(request);

  if (!autenticacao) {
    return respostaHtml(
      paginaErro("Sessão inválida ou expirada. Inicia sessão novamente."),
      401,
    );
  }

  const { id: residenteId, token } = autenticacao;

  const formData = await request.formData();

  const valorTexto = formData.get("valor");

  const valor =
    typeof valorTexto === "string" ? Number(valorTexto) : NaN;

  if (
    !Number.isFinite(valor) ||
    !Number.isInteger(valor) ||
    valor <= 0
  ) {
    return respostaHtml(
      paginaErro(
        "O valor da recarga tem de ser um número inteiro superior a zero.",
      ),
      400,
    );
  }

  // Mesmo teto aplicado em apps/api/src/services/sispService.js — repetido
  // aqui para rejeitar cedo, sem sequer contactar o backend de pagamento.
  const VALOR_MAXIMO_CVE = 500000;

  if (valor > VALOR_MAXIMO_CVE) {
    return respostaHtml(
      paginaErro(
        `O valor da recarga não pode exceder ${VALOR_MAXIMO_CVE} CVE.`,
      ),
      400,
    );
  }

  const params = new URLSearchParams();

  for (const [chave, valorCampo] of formData.entries()) {
    if (chave === "residenteId") {
      continue;
    }

    if (typeof valorCampo === "string") {
      params.append(chave, valorCampo);
    }
  }

  params.set("residenteId", residenteId);

  let resposta: Response;

  try {
    resposta = await fetch(
      `${BACKEND_API_URL}/api/pagamento/iniciar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${token}`,
        },
        body: params.toString(),
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("Erro ao contactar o backend de pagamento:", error);

    return respostaHtml(
      paginaErro("Não foi possível contactar o serviço de pagamento."),
      502,
    );
  }

  const corpo = await resposta.text();

  return new Response(corpo, {
    status: resposta.status,
    headers: {
      "Content-Type":
        resposta.headers.get("content-type") ||
        "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
