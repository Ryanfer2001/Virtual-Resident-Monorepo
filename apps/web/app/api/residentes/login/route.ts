import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import type {
  LoginResponse,
  Residente,
} from "@/types/residente";
import { encaminharParaNodeRed } from "@/lib/node-red-proxy";
import {
  RESIDENTE_COOKIE_MAX_AGE_SEGUNDOS,
  RESIDENTE_COOKIE_NAME,
  RESIDENTE_CSRF_COOKIE_NAME,
} from "@/lib/residente-session";

const NODE_RED_URL = (
  process.env.NODE_RED_URL ||
  "https://darkgrey-meerkat-287167.hostingersite.com"
).replace(/\/+$/, "");

const JWT_SECRET = process.env.JWT_SECRET;

interface NodeRedLoginResponse {
  sucesso: boolean;
  mensagem?: string;
  residente?: Residente;
}

export async function POST(
  request: Request,
) {
  try {
    if (!JWT_SECRET) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "JWT_SECRET não está configurada.",
        },
        {
          status: 500,
        },
      );
    }

    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!username || !password) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            "Username ou palavra-passe em falta.",
        },
        {
          status: 400,
        },
      );
    }

    const resultado = await encaminharParaNodeRed<NodeRedLoginResponse>({
      baseUrl: NODE_RED_URL,
      caminho: "/api/residentes/login",
      body: { username, password },
      mensagemRespostaVazia:
        "O Node-RED devolveu uma resposta vazia.",
      mensagemRespostaInvalida:
        "O Node-RED devolveu uma resposta inválida.",
    });

    if ("erro" in resultado) {
      return resultado.erro;
    }

    const dados = resultado.dados;

    if (
      resultado.status < 200 ||
      resultado.status >= 300 ||
      !dados.sucesso ||
      !dados.residente
    ) {
      return NextResponse.json(
        {
          sucesso: false,
          mensagem:
            dados.mensagem ||
            "Login não reconhecido.",
        },
        {
          status: 401,
        },
      );
    }

    const residente =
      dados.residente;

    const token = jwt.sign(
      {
        sub: residente.id,
        id: residente.id,
        username: residente.username,
        email: residente.email || "",
        tipo: "residente",
      },
      JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "8h",
        issuer: "noszona-smart",
        audience: "noszona-residente",
      },
    );

    const resposta: LoginResponse = {
      sucesso: true,
      mensagem:
        dados.mensagem ||
        "Login feito com sucesso",
      residente,
    };

    const respostaHttp = NextResponse.json(
      resposta,
      {
        status: 200,
      },
    );

    // O token nunca é devolvido no corpo da resposta — só existe num
    // cookie httpOnly, inacessível a JavaScript (mesmo em caso de XSS).
    respostaHttp.cookies.set({
      name: RESIDENTE_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: RESIDENTE_COOKIE_MAX_AGE_SEGUNDOS,
    });

    // Cookie CSRF (double-submit), legível por JavaScript de propósito —
    // mesmo padrão usado na sessão administrativa (ver lib/admin-session.ts).
    respostaHttp.cookies.set({
      name: RESIDENTE_CSRF_COOKIE_NAME,
      value: randomBytes(32).toString("hex"),
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: RESIDENTE_COOKIE_MAX_AGE_SEGUNDOS,
    });

    return respostaHttp;
  } catch (error) {
    console.error(
      "Erro no login:",
      error,
    );

    return NextResponse.json(
      {
        sucesso: false,
        mensagem:
          "Não foi possível concluir o login.",
      },
      {
        status: 500,
      },
    );
  }
}