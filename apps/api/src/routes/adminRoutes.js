const express = require("express");

const adminController = require("../controllers/adminController");
const adminAuthController = require("../controllers/adminAuthController");
const adminDashboardController = require("../controllers/adminDashboardController");
const adminResidentesController = require("../controllers/adminResidentesController");
const adminFinanceiroController = require("../controllers/adminFinanceiroController");
const adminFotosController = require("../controllers/adminFotosController");
const adminAuditoriaController = require("../controllers/adminAuditoriaController");

const {
  autenticarAdmin,
  exigirAdministrador
} = require("../middleware/adminAuthMiddleware");

const router = express.Router();

/*
 * Todas as rotas abaixo de /api/admin exigem uma sessão administrativa
 * válida (autenticarAdmin) com role "admin" (exigirAdministrador) —
 * exceto login, que é o próprio ponto de entrada. Antes desta reescrita,
 * a maioria destas rotas não tinha proteção nenhuma, e as poucas que
 * tinham usavam authMiddleware.autenticarToken (o token de RESIDENTE),
 * que apenas valida a assinatura do JWT sem confirmar nenhuma role —
 * ou seja, qualquer residente autenticado conseguia chamá-las.
 */

router.post("/login", adminAuthController.login);
router.post("/logout", adminAuthController.logout);

router.use(autenticarAdmin, exigirAdministrador);

router.get("/me", adminAuthController.me);

/*
|--------------------------------------------------------------------------
| Visão geral
|--------------------------------------------------------------------------
*/

router.get("/dashboard/resumo", adminDashboardController.resumo);

/*
|--------------------------------------------------------------------------
| Residentes
|--------------------------------------------------------------------------
*/

router.get("/residentes", adminResidentesController.listar);
router.get("/residentes/:id", adminResidentesController.detalhe);

router.patch(
  "/residentes/:id/estado",
  adminResidentesController.atualizarEstado
);

router.patch(
  "/residentes/:id/permissoes",
  adminResidentesController.atualizarPermissoes
);

router.post(
  "/residentes/:id/saldo",
  adminFinanceiroController.ajustarSaldo
);

router.post(
  "/residentes/:id/swipes",
  adminFinanceiroController.ajustarSwipes
);

/*
|--------------------------------------------------------------------------
| Fotografias (perfil / BI / cartão), com estado próprio para cada uma
|--------------------------------------------------------------------------
| Nunca devolvem Base64 na listagem — só nestes endpoints dedicados,
| protegidos, é que o binário da imagem é servido.
*/

router.get(
  "/residentes/:id/foto-:tipo",
  adminFotosController.obterImagem
);

router.get("/fotos", adminFotosController.listarPendentes);

router.post("/fotos/:id/aprovar", adminFotosController.aprovar);
router.post("/fotos/:id/rejeitar", adminFotosController.rejeitar);

/*
|--------------------------------------------------------------------------
| Pedidos de cartão
|--------------------------------------------------------------------------
| Lógica já existia em adminController.js — só ganhou proteção correta
| (antes usava o token de residente) e auditoria nesta revisão, mantendo
| a mesma forma de endpoint.
*/

router.get("/cartoes/pedidos", adminController.listarPedidosCartao);
router.post("/cartoes/:id/aprovar", adminController.aprovarPedidoCartao);
router.post("/cartoes/:id/rejeitar", adminController.rejeitarPedidoCartao);
router.post("/cartoes/:id/gerado", adminController.marcarCartaoComoGerado);

/*
|--------------------------------------------------------------------------
| Auditoria
|--------------------------------------------------------------------------
*/

router.get("/auditoria", adminAuditoriaController.listar);

/*
|--------------------------------------------------------------------------
| Compatibilidade legada
|--------------------------------------------------------------------------
| Endpoints que já existiam antes desta revisão, mantidos no mesmo URL,
| agora atrás do middleware administrativo — antes estavam completamente
| públicos, incluindo a foto do BI (obterFotoBI).
|
| As antigas rotas GET /residentes/:id/foto-bi e /residentes/:id/foto-perfil
| deixaram de estar montadas em separado (adminController.obterFotoBI /
| obterFotoPerfil): os mesmos URLs passam a ser servidos pela rota
| genérica /residentes/:id/foto-:tipo acima — mesma coluna, mesmo
| comportamento para quem consome o endpoint, agora com
| Cache-Control: private, no-store.
|
| O antigo POST /residentes/:id/swipes (definirSwipesResidente, sem
| transação/auditoria/motivo obrigatório) foi substituído pelo endpoint
| novo acima, que usa o mesmo URL com transação e auditoria. Da mesma
| forma, o antigo POST /residentes/:id/permissoes (sem transação/
| auditoria) foi substituído pelo novo PATCH no mesmo caminho. As duas
| funções antigas continuam definidas em adminController.js mas
| deixaram de estar montadas em rotas.
*/

router.get(
  "/residentes/:id/permissoes",
  adminController.consultarPermissoesResidente
);

router.post("/fotos/aprovar", adminController.aprovarFotos);
router.post("/fotos/rejeitar", adminController.rejeitarFotos);

router.post("/gerar-cartao", adminController.gerarCartaoLegado);

module.exports = router;
