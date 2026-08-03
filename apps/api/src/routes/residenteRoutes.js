const express = require("express");

const authController = require("../controllers/authController");
const residenteController = require("../controllers/residenteController");
const passwordController = require("../controllers/passwordController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/login",
  authController.loginLegado
);

router.post(
  "/google-login",
  authController.googleLoginLegado
);

router.post(
  "/registar",
  authController.registar
);

router.get(
  "/perfil",
  authMiddleware.autenticarToken,
  authController.obterPerfil
);

router.post(
  "/fotos",
  residenteController.atualizarFotos
);

router.post(
  "/pedido-cartao",
  authMiddleware.autenticarToken,
  residenteController.solicitarCartao
);

router.get(
  "/pedido-cartao",
  authMiddleware.autenticarToken,
  residenteController.consultarPedidoCartao
);

router.post(
  "/pedido-cartao/cancelar",
  authMiddleware.autenticarToken,
  residenteController.cancelarPedidoCartao
);

router.get(
  "/qr",
  authMiddleware.autenticarToken,
  residenteController.consultarQR
);

router.post(
  "/qr/gerar",
  authMiddleware.autenticarToken,
  residenteController.gerarQR
);

router.post(
  "/qr/desativar",
  authMiddleware.autenticarToken,
  residenteController.desativarQR
);

router.post(
  "/qr/validar",
  residenteController.validarQR
);

router.get(
  "/permissoes",
  authMiddleware.autenticarToken,
  residenteController.consultarPermissoes
);

router.post(
  "/swipes/consumir",
  authMiddleware.autenticarToken,
  residenteController.consumirSwipe
);

router.get(
  "/pedido-cartao/:id",
  authMiddleware.autenticarToken,
  residenteController.consultarPedidoCartao
);

router.post(
  "/recuperar-password",
  passwordController.recuperarPassword
);

router.post(
  "/redefinir-password",
  passwordController.redefinirPassword
);

router.post(
  "/solicitar-cartao",
  residenteController.solicitarCartaoLegado
);

module.exports = router;