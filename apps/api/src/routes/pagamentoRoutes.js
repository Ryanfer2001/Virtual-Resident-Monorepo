const express = require("express");

const pagamentoController = require(
  "../controllers/pagamentoController"
);

const router = express.Router();

router.post(
  "/iniciar",
  pagamentoController.iniciarPagamento
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