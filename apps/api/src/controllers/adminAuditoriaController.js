const auditoriaModel = require("../models/auditoriaModel");

async function listar(req, res) {
  try {
    const resultado = await auditoriaModel.listarAuditoria(
      {
        entidade: req.query.entidade,
        entidadeId: req.query.entidadeId,
        adminId: req.query.adminId,
        acao: req.query.acao
      },
      {
        pagina: req.query.pagina,
        porPagina: req.query.porPagina
      }
    );

    return res.status(200).json({
      sucesso: true,
      auditoria: resultado.registos,
      total: resultado.total,
      pagina: resultado.pagina,
      porPagina: resultado.porPagina
    });
  } catch (erro) {
    console.error("Erro ao listar auditoria:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao listar a auditoria."
    });
  }
}

module.exports = {
  listar
};
