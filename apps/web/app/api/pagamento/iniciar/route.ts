const producao =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";

const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ||
  (producao ? "" : "http://localhost:3002")
).replace(/\/+$/, "");

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

  const formData = await request.formData();

  const residenteId =
    typeof formData.get("residenteId") === "string"
      ? (formData.get("residenteId") as string).trim()
      : "";

  if (!residenteId) {
    return respostaHtml(
      paginaErro("Residente não identificado."),
      400,
    );
  }

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

  const params = new URLSearchParams();

  for (const [chave, valorCampo] of formData.entries()) {
    if (typeof valorCampo === "string") {
      params.append(chave, valorCampo);
    }
  }

  let resposta: Response;

  try {
    resposta = await fetch(
      `${BACKEND_API_URL}/api/pagamento/iniciar`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
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
