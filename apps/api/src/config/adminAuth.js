/*
 * Constantes partilhadas entre a emissão (adminAuthController) e a
 * verificação (adminAuthMiddleware) do JWT administrativo, para garantir
 * que issuer/audience nunca divergem entre os dois.
 */

module.exports = {
  JWT_ISSUER: "noszona-smart-admin",
  JWT_AUDIENCE: "noszona-admin-painel",
  JWT_EXPIRES_IN: "30m",
  MAX_TENTATIVAS_FALHADAS: 5,
  MINUTOS_BLOQUEIO: 15
};
