import type {
  EnviarFotosPayload,
  EnviarFotosResponse,
  LoginResponse,
  RegistoData,
  RegistoResponse,
} from "@/types/residente";
import { obterCabecalhoCsrf } from "@/lib/auth";

/*
 * Wrapper partilhado pelos pedidos a /api/residentes/* — mesmo padrão do
 * pedido<T> em lib/admin-api.ts. Centraliza o fetch, a leitura segura do
 * JSON e o erro de fallback; cada chamador mantém a sua própria mensagem
 * de erro (com ou sem código de estado, tal como antes desta extração).
 */
async function pedido<T extends { mensagem?: string }>(
  caminho: string,
  opcoes: RequestInit,
  mensagemErroPadrao: (status: number) => string,
): Promise<T> {
  const resposta = await fetch(caminho, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
    ...opcoes,
  });

  let dados: T;

  try {
    dados = (await resposta.json()) as T;
  } catch {
    throw new Error(
      "O servidor devolveu uma resposta inválida.",
    );
  }

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem || mensagemErroPadrao(resposta.status),
    );
  }

  return dados;
}

export async function fazerLogin(
  username: string,
  password: string,
): Promise<LoginResponse> {
  return pedido<LoginResponse>(
    "/api/residentes/login",
    {
      method: "POST",
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    },
    (status) => `Erro durante o login (${status}).`,
  );
}

export async function criarResidente(
  dados: RegistoData,
): Promise<RegistoResponse> {
  return pedido<RegistoResponse>(
    "/api/residentes/registar",
    {
      method: "POST",
      body: JSON.stringify(dados),
    },
    (status) => `Erro durante o registo (${status}).`,
  );
}

export async function enviarFotosResidente(
  dados: EnviarFotosPayload,
  tokenSessaoRegisto?: string,
): Promise<EnviarFotosResponse> {
  // No registo (antes de existir sessão) usa-se o token de curta duração
  // devolvido por criarResidente, explícito no cabeçalho Authorization.
  // Depois do login, a sessão vive no cookie httpOnly — só é preciso
  // provar, com o cabeçalho CSRF, que o pedido partiu do nosso site.
  const cabecalhos: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(tokenSessaoRegisto
      ? { Authorization: `Bearer ${tokenSessaoRegisto}` }
      : obterCabecalhoCsrf()),
  };

  return pedido<EnviarFotosResponse>(
    "/api/residentes/fotos",
    {
      method: "POST",
      headers: cabecalhos,
      body: JSON.stringify({
        residenteId: dados.residenteId,
        fotoPerfilBase64:
          dados.fotoPerfilBase64 || "",
        fotoBIBase64: dados.fotoBIBase64,
        fotoCartaoBase64:
          dados.fotoCartaoBase64 || "",
      }),
    },
    (status) => `Erro ao enviar as fotos (${status}).`,
  );
}

export async function solicitarRecuperacaoPassword(
  email: string,
): Promise<{
  sucesso: boolean;
  mensagem?: string;
}> {
  return pedido<{ sucesso: boolean; mensagem?: string }>(
    "/api/residentes/recuperar-password",
    {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
    },
    () => "Erro ao solicitar recuperação.",
  );
}