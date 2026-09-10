const express = require("express");

const pagamentoController = require(
  "../controllers/pagamentoController"
);
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/iniciar",
  authMiddleware.autenticarToken,
  pagamentoController.iniciarPagamento
);

router.post(
  "/pacote/iniciar",
  authMiddleware.autenticarToken,
  pagamentoController.iniciarPagamentoPacote
);

router.get(
  "/retorno",
  pagamentoController.processarRetorno
);

router.post(
  "/retorno",
  pagamentoController.processarRetorno
);

module.exports = router;