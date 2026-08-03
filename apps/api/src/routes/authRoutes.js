const express = require("express");

const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/teste", (req, res) => {
  return res.status(200).json({
    sucesso: true,
    mensagem: "Rotas de autenticação ligadas."
  });
});

router.post("/login", authController.login);
router.post("/registo", authController.registar);

router.get(
  "/perfil",
  authMiddleware.autenticarToken,
  authController.obterPerfil
);

module.exports = router;