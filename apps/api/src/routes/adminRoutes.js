const express = require("express");

const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/residentes",
  adminController.listarResidentes
);

router.get(
  "/residentes/:id/foto-perfil",
  adminController.obterFotoPerfil
);

router.get(
  "/residentes/:id/foto-bi",
  adminController.obterFotoBI
);

router.get(
  "/residentes/:id/permissoes",
  authMiddleware.autenticarToken,
  adminController.consultarPermissoesResidente
);

router.post(
  "/residentes/:id/permissoes",
  authMiddleware.autenticarToken,
  adminController.atualizarPermissoesResidente
);

router.post(
  "/residentes/:id/swipes",
  authMiddleware.autenticarToken,
  adminController.definirSwipesResidente
);

router.post(
  "/fotos/aprovar",
  adminController.aprovarFotos
);

router.post(
  "/fotos/rejeitar",
  adminController.rejeitarFotos
);

router.get(
  "/cartoes/pedidos",
  authMiddleware.autenticarToken,
  adminController.listarPedidosCartao
);

router.post(
  "/cartoes/:id/aprovar",
  authMiddleware.autenticarToken,
  adminController.aprovarPedidoCartao
);

router.post(
  "/cartoes/:id/rejeitar",
  authMiddleware.autenticarToken,
  adminController.rejeitarPedidoCartao
);

router.post(
  "/cartoes/:id/gerado",
  authMiddleware.autenticarToken,
  adminController.marcarCartaoComoGerado
);

router.post(
  "/gerar-cartao",
  adminController.gerarCartaoLegado
);

module.exports = router;