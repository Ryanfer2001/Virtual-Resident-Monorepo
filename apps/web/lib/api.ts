import type {
  EnviarFotosPayload,
  EnviarFotosResponse,
  LoginResponse,
  RegistoData,
  RegistoResponse,
} from "@/types/residente";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";

async function interpretarResposta<T>(
  resposta: Response,
): Promise<T> {
  const contentType =
    resposta.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await resposta.json()) as T;
  }

  const texto = await resposta.text();

  throw new Error(
    `A API devolveu uma resposta inválida (${resposta.status}). ${texto.slice(0, 200)}`,
  );
}

export async function fazerLogin(
  username: string,
  password: string,
): Promise<LoginResponse> {
  const resposta = await fetch(
    "/api/residentes/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
      cache: "no-store",
    },
  );

  let dados: LoginResponse;

  try {
    dados =
      (await resposta.json()) as LoginResponse;
  } catch {
    throw new Error(
      "O servidor devolveu uma resposta inválida.",
    );
  }

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem ||
        `Erro durante o login (${resposta.status}).`,
    );
  }

  return dados;
}

export async function criarResidente(
  dados: RegistoData,
): Promise<RegistoResponse> {
  if (!API_BASE_URL) {
    throw new Error(
      "Configuração em falta: a variável NEXT_PUBLIC_API_URL não está definida.",
    );
  }

  const resposta = await fetch(
    `${API_BASE_URL}/api/residentes/registar`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(dados),
      cache: "no-store",
    },
  );

  const resultado =
    await interpretarResposta<RegistoResponse>(
      resposta,
    );

  if (!resposta.ok) {
    throw new Error(
      resultado.mensagem ||
        `Erro durante o registo (${resposta.status}).`,
    );
  }

  return resultado;
}

export async function enviarFotosResidente(
  dados: EnviarFotosPayload,
): Promise<EnviarFotosResponse> {
  if (!API_BASE_URL) {
    throw new Error(
      "Configuração em falta: a variável NEXT_PUBLIC_API_URL não está definida.",
    );
  }

  const resposta = await fetch(
    `${API_BASE_URL}/api/residentes/fotos`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        residenteId: dados.residenteId,
        fotoPerfilBase64:
          dados.fotoPerfilBase64 || "",
        fotoBIBase64: dados.fotoBIBase64,
        fotoCartaoBase64:
          dados.fotoCartaoBase64 || "",
      }),
      cache: "no-store",
    },
  );

  const resultado =
    await interpretarResposta<EnviarFotosResponse>(
      resposta,
    );

  if (!resposta.ok) {
    throw new Error(
      resultado.mensagem ||
        `Erro ao enviar as fotos (${resposta.status}).`,
    );
  }

  return resultado;
}

export async function solicitarRecuperacaoPassword(
  email: string,
): Promise<{
  sucesso: boolean;
  mensagem?: string;
}> {
  const resposta = await fetch(
    `${API_BASE_URL}/api/residentes/recuperar-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
      cache: "no-store",
    },
  );

  const dados = await interpretarResposta<{
    sucesso: boolean;
    mensagem?: string;
  }>(resposta);

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem ||
        "Erro ao solicitar recuperação.",
    );
  }

  return dados;
}