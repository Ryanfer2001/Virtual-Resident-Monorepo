const crypto = require("crypto");
const bcrypt = require("bcrypt");

const residenteModel = require("../models/residenteModel");
const emailService = require("../services/emailService");

function gerarTokenSeguro() {
  return crypto.randomBytes(32).toString("hex");
}

function gerarHashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

async function recuperarPassword(req, res) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Email em falta."
      });
    }

    const residente =
      await residenteModel.procurarPorEmail(email);

    /*
     * Mantemos uma resposta genérica para não revelar
     * se o email existe ou não na base de dados.
     */
    if (!residente) {
      return res.status(200).json({
        sucesso: true,
        mensagem:
          "Se o email existir, vais receber um link de recuperação em breve."
      });
    }

    const token = gerarTokenSeguro();
    const tokenHash = gerarHashToken(token);

    await residenteModel.guardarTokenRecuperacao(
      residente.id,
      tokenHash
    );

    const frontendUrl =
      process.env.FRONTEND_URL ||
      "http://127.0.0.1:5500";

    const linkRecuperacao =
      `${frontendUrl}/#reset-password?token=${token}`;

    await emailService.enviarEmailRecuperacao({
      destinatario: residente.email,
      nome: residente.nome,
      linkRecuperacao
    });

    return res.status(200).json({
      sucesso: true,
      mensagem:
        "Se o email existir, vais receber um link de recuperação em breve."
    });
  } catch (erro) {
    console.error(
      "Erro na recuperação de password:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao iniciar a recuperação de password."
    });
  }
}

async function redefinirPassword(req, res) {
  try {
    const token = String(req.body.token || "").trim();

    const novaPassword = String(
      req.body.novaPassword ||
      req.body.password ||
      ""
    );

    if (!token || !novaPassword) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Token e nova password são obrigatórios."
      });
    }

    if (novaPassword.length < 6) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "A nova password deve ter pelo menos 6 caracteres."
      });
    }

    const tokenHash = gerarHashToken(token);

    const residente =
      await residenteModel.procurarPorTokenRecuperacao(
        tokenHash
      );

    if (!residente) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Token inválido ou expirado."
      });
    }

    const passwordHash = await bcrypt.hash(
      novaPassword,
      12
    );

    const resultado =
      await residenteModel.atualizarPasswordRecuperada(
        residente.id,
        passwordHash
      );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem:
        "Password atualizada com sucesso. Já podes fazer login."
    });
  } catch (erro) {
    console.error(
      "Erro ao redefinir password:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao redefinir a password."
    });
  }
}

module.exports = {
  recuperarPassword,
  redefinirPassword
};