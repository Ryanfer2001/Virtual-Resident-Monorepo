import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import type {
  RegistoResponse,
} from "@/types/residente";
import { encaminharParaNodeRed } from "@/lib/node-red-proxy";

const NODE_RED_URL = (
  process.env.NODE_RED_URL ||
  "https://darkgrey-meerkat-287167.hostingersite.com"
).replace(/\/+$/, "");

const JWT_SECRET = process.env.JWT_SECRET;

const CAMPOS_OBRIGATORIOS = [
  "nome",
  "dataNascimento",
  "nacionalidade",
  "documento",
  "telefone",
  "email",
  "morada",
  "municipio",
  "username",
  "password",
  "pacote",
] as const;

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * Repete no servidor as mesmas regras já aplicadas em registo/page.tsx
 * (validarFormulario). Antes desta função, um POST direto para esta rota
 * (sem passar pelo formulário/JS do browser) não tinha nenhuma validação
 * própria — passava tudo tal e qual para o Node-RED.
 */
function validarRegisto(body: Record<string, unknown>): string | null {
  for (const campo of CAMPOS_OBRIGATORIOS) {
    if (!String(body[campo] || "").trim()) {
      return "Preenche todos os campos obrigatórios.";
    }
  }

  const nome = String(body.nome).trim();
  const username = String(body.username).trim();
  const email = String(body.email).trim();
  const password = String(body.password);

  if (nome.length < 3) {
    return "Introduz o nome completo.";
  }

  if (username.length < 3) {
    return "O username deve ter pelo menos 3 caracteres.";
  }

  if (!REGEX_EMAIL.test(email)) {
    return "Introduz um endereço de email válido.";
  }

  if (password.length < 6) {
    return "A palavra-passe deve ter pelo menos 6 caracteres.";
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "A palavra-passe deve conter letras e números.";
  }

  return null;
}

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const erroValidacao = validarRegisto(body);

    if (erroValidacao) {
      return NextResponse.json(
        { sucesso: false, mensagem: erroValidacao },
        { status: 400 },
      );
    }

    const resultado = await encaminharParaNodeRed<RegistoResponse>({
      baseUrl: NODE_RED_URL,
      caminho: "/api/residentes/registar",
      body,
      mensagemRespostaVazia:
        "O servidor devolveu uma resposta vazia.",
      mensagemRespostaInvalida:
        "O servidor devolveu uma resposta inválida.",
    });

    if ("erro" in resultado) {
      return resultado.erro;
    }

    const dados = resultado.dados;

    /*
     * O registo não faz login automático (o utilizador continua a ser
     * reencaminhado para /login), mas o formulário envia logo a seguir a
     * foto de perfil/BI para /api/residentes/fotos — que agora exige um
     * token válido. Emite-se aqui um token de vida curta (10 min), só com
     * o id da conta acabada de criar, exclusivamente para autorizar esse
     * envio imediato. Nunca é guardado como sessão.
     */
    let token: string | undefined;

    if (dados.sucesso && dados.residenteId && JWT_SECRET) {
      token = jwt.sign(
        {
          sub: dados.residenteId,
          id: dados.residenteId,
          username:
            typeof body?.username === "string" ? body.username : "",
          email:
            typeof body?.email === "string" ? body.email : "",
          tipo: "residente",
        },
        JWT_SECRET,
        {
          algorithm: "HS256",
          expiresIn: "10m",
          issuer: "noszona-smart",
          audience: "noszona-residente",
        },
      );
    }

    return NextResponse.json(
      { ...dados, token },
      {
        status: resultado.status,
      },
    );
  } catch (error) {
    console.error(
      "Erro no registo:",
      error,
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível concluir o registo.",
      },
      {
        status: 500,
      },
    );
  }
}
