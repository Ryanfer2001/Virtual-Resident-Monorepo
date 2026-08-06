const jwt = require("jsonwebtoken");

const { JWT_ISSUER, JWT_AUDIENCE } = require("../config/adminAuth");

/*
 * Verifica o JWT administrativo (assinado com ADMIN_JWT_SECRET, separado
 * do JWT_SECRET dos residentes). Não confirma sozinho a role — isso é
 * responsabilidade de exigirAdministrador, para permitir no futuro outras
 * roles autenticadas por este mesmo middleware sem terem acesso admin.
 */
function autenticarAdmin(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Sessão administrativa não fornecida."
      });
    }

    const partes = authorization.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Formato do token administrativo inválido."
      });
    }

    if (!process.env.ADMIN_JWT_SECRET) {
      throw new Error(
        "ADMIN_JWT_SECRET não está configurada no ficheiro .env."
      );
    }

    const dados = jwt.verify(partes[1], process.env.ADMIN_JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    req.admin = dados;

    return next();
  } catch (erro) {
    console.error(
      "Erro na autenticação administrativa:",
      erro.message
    );

    return res.status(401).json({
      sucesso: false,
      mensagem: "Sessão administrativa inválida ou expirada."
    });
  }
}

function exigirAdministrador(req, res, next) {
  if (!req.admin || req.admin.role !== "admin") {
    return res.status(403).json({
      sucesso: false,
      mensagem: "Acesso restrito a administradores."
    });
  }

  return next();
}

module.exports = {
  autenticarAdmin,
  exigirAdministrador
};
