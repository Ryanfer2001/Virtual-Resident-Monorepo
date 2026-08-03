const jwt = require("jsonwebtoken");

function autenticarToken(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Token de autenticação não fornecido."
      });
    }

    const partes = authorization.split(" ");

    if (
      partes.length !== 2 ||
      partes[0] !== "Bearer" ||
      !partes[1]
    ) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Formato do token inválido."
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error(
        "JWT_SECRET não está configurada no ficheiro .env."
      );
    }

    const token = partes[1];

    const dados = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.utilizador = dados;

    return next();
  } catch (erro) {
    console.error(
      "Erro na autenticação:",
      erro.message
    );

    return res.status(401).json({
      sucesso: false,
      mensagem: "Token inválido ou expirado."
    });
  }
}

module.exports = {
  autenticarToken
};