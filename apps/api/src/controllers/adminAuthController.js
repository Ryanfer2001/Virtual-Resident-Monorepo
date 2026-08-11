const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const adminModel = require("../models/adminModel");
const { obterIp } = require("../utils/request");

const {
  JWT_ISSUER,
  JWT_AUDIENCE,
  JWT_EXPIRES_IN,
  MAX_TENTATIVAS_FALHADAS,
  MINUTOS_BLOQUEIO
} = require("../config/adminAuth");

/*
 * Limitador simples em memória, por IP, como primeira barreira contra
 * força bruta antes de sequer chegar à base de dados. É complementado
 * (e não substituído) pelo bloqueio persistente por conta, que sobrevive
 * a reinícios do processo — este limitador em memória não sobrevive, e
 * não é partilhado entre instâncias caso a API corra replicada.
 */
const JANELA_LIMITE_MS = 15 * 60 * 1000;
const LIMITE_PEDIDOS_POR_IP = 30;
const tentativasPorIp = new Map();

function limiteIpExcedido(ip) {
  const agora = Date.now();
  const registo = tentativasPorIp.get(ip) || [];
  const dentroDaJanela = registo.filter(
    (timestamp) => agora - timestamp < JANELA_LIMITE_MS
  );

  dentroDaJanela.push(agora);
  tentativasPorIp.set(ip, dentroDaJanela);

  return dentroDaJanela.length > LIMITE_PEDIDOS_POR_IP;
}

function normalizarUsername(username) {
  return String(username || "").trim();
}

async function login(req, res) {
  try {
    const ip = obterIp(req);

    if (limiteIpExcedido(ip)) {
      return res.status(429).json({
        sucesso: false,
        mensagem: "Demasiadas tentativas. Tenta novamente mais tarde."
      });
    }

    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Username e password são obrigatórios."
      });
    }

    if (!process.env.ADMIN_JWT_SECRET) {
      throw new Error(
        "ADMIN_JWT_SECRET não está configurada no ficheiro .env."
      );
    }

    const usernameLimpo = normalizarUsername(username);

    const mensagemGenerica =
      "Credenciais administrativas inválidas.";

    const admin = await adminModel.procurarPorUsername(usernameLimpo);

    if (!admin || !admin.ativo) {
      return res.status(401).json({
        sucesso: false,
        mensagem: mensagemGenerica
      });
    }

    if (admin.bloqueado_ate && new Date(admin.bloqueado_ate) > new Date()) {
      return res.status(429).json({
        sucesso: false,
        mensagem:
          "Conta temporariamente bloqueada devido a várias tentativas falhadas. Tenta novamente mais tarde."
      });
    }

    const passwordValida = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!passwordValida) {
      const tentativas = Number(admin.tentativas_falhadas || 0) + 1;

      if (tentativas >= MAX_TENTATIVAS_FALHADAS) {
        await adminModel.bloquearTemporariamente(admin.id, MINUTOS_BLOQUEIO);
        await adminModel.registarTentativaFalhada(admin.id);
      } else {
        await adminModel.registarTentativaFalhada(admin.id);
      }

      return res.status(401).json({
        sucesso: false,
        mensagem: mensagemGenerica
      });
    }

    await adminModel.resetarTentativas(admin.id);
    await adminModel.atualizarUltimoLogin(admin.id);

    const token = jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        role: admin.role
      },
      process.env.ADMIN_JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: JWT_EXPIRES_IN,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      }
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: "Sessão administrativa iniciada com sucesso.",
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (erro) {
    console.error("Erro no login administrativo:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao efetuar o login administrativo."
    });
  }
}

async function logout(req, res) {
  // Sessão stateless (JWT de curta duração) — o cookie HttpOnly é apagado
  // pelo Route Handler do Next.js. Mantido por simetria REST e para um
  // eventual futuro registo de auditoria de logout.
  return res.status(200).json({
    sucesso: true,
    mensagem: "Sessão administrativa terminada."
  });
}

async function me(req, res) {
  try {
    const admin = await adminModel.procurarPorId(req.admin.id);

    if (!admin || !admin.ativo) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Sessão administrativa inválida ou expirada."
      });
    }

    return res.status(200).json({
      sucesso: true,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (erro) {
    console.error("Erro ao obter sessão administrativa:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao obter a sessão administrativa."
    });
  }
}

module.exports = {
  login,
  logout,
  me
};
