import type {
  LoginResponse,
  RegistoData,
  RegistoResponse,
} from "@/types/residente";

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
  const resposta = await fetch(
    "/api/residentes/registar",
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
    (await resposta.json()) as RegistoResponse;

  if (!resposta.ok) {
    throw new Error(
      resultado.mensagem ||
        `Erro durante o registo (${resposta.status}).`,
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
    "/api/residentes/recuperar-password",
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

  const dados = (await resposta.json()) as {
    sucesso: boolean;
    mensagem?: string;
  };

  if (!resposta.ok) {
    throw new Error(
      dados.mensagem ||
        "Erro ao solicitar recuperação.",
    );
  }

  return dados;
}