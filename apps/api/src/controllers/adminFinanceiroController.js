const pool = require("../config/database");
const auditoriaModel = require("../models/auditoriaModel");
const { obterIp } = require("../utils/request");

const OPERACOES_PERMITIDAS = ["adicionar", "retirar", "definir"];

function calcularNovoValor(operacao, valorAtual, valor) {
  if (operacao === "definir") {
    return valor;
  }

  if (operacao === "adicionar") {
    return valorAtual + valor;
  }

  return valorAtual - valor;
}

/*
 * Ajusta saldo ou swipes de um residente dentro de uma transação com
 * SELECT ... FOR UPDATE: o lock de linha serializa pedidos concorrentes
 * para o mesmo residente (evita que um duplo-clique/pedido repetido em
 * paralelo aplique o ajuste duas vezes), impede resultado negativo e
 * grava o valor anterior/novo tanto na tabela residentes como na
 * auditoria, na mesma transação.
 */
async function ajustarCampoNumerico({
  req,
  res,
  coluna,
  acaoAuditoria
}) {
  const conexao = await pool.getConnection();

  try {
    const { id } = req.params;
    const { operacao, valor, motivo } = req.body || {};

    if (!OPERACOES_PERMITIDAS.includes(operacao)) {
      conexao.release();

      return res.status(400).json({
        sucesso: false,
        mensagem: `Operação inválida. Usa uma de: ${OPERACOES_PERMITIDAS.join(", ")}.`
      });
    }

    const valorNumerico = Number(valor);

    if (!Number.isFinite(valorNumerico) || valorNumerico < 0) {
      conexao.release();

      return res.status(400).json({
        sucesso: false,
        mensagem: "O valor deve ser um número igual ou maior que zero."
      });
    }

    if (!motivo || !String(motivo).trim()) {
      conexao.release();

      return res.status(400).json({
        sucesso: false,
        mensagem: "O motivo é obrigatório."
      });
    }

    await conexao.beginTransaction();

    const [linhas] = await conexao.execute(
      `SELECT id, ${coluna} AS valorAtual FROM residentes WHERE id = ? FOR UPDATE`,
      [id]
    );

    const residenteAtual = linhas[0];

    if (!residenteAtual) {
      await conexao.rollback();

      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const valorAnterior = Number(residenteAtual.valorAtual || 0);
    const valorNovo = calcularNovoValor(operacao, valorAnterior, valorNumerico);

    if (valorNovo < 0) {
      await conexao.rollback();

      return res.status(409).json({
        sucesso: false,
        mensagem: "A operação resultaria num valor negativo."
      });
    }

    await conexao.execute(
      `UPDATE residentes SET ${coluna} = ? WHERE id = ?`,
      [valorNovo, id]
    );

    await auditoriaModel.registarAcao(
      {
        adminId: req.admin.id,
        acao: acaoAuditoria,
        entidade: "residente",
        entidadeId: id,
        valoresAnteriores: { [coluna]: valorAnterior },
        valoresNovos: { [coluna]: valorNovo },
        motivo: String(motivo).trim(),
        ip: obterIp(req)
      },
      conexao
    );

    await conexao.commit();

    return res.status(200).json({
      sucesso: true,
      mensagem: "Valor atualizado com sucesso.",
      residenteId: id,
      [coluna]: valorNovo
    });
  } catch (erro) {
    await conexao.rollback();

    console.error(`Erro ao ajustar ${coluna}:`, erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao ajustar o valor."
    });
  } finally {
    conexao.release();
  }
}

async function ajustarSaldo(req, res) {
  return ajustarCampoNumerico({
    req,
    res,
    coluna: "saldo",
    acaoAuditoria: "ajustar_saldo"
  });
}

async function ajustarSwipes(req, res) {
  return ajustarCampoNumerico({
    req,
    res,
    coluna: "swipes",
    acaoAuditoria: "ajustar_swipes"
  });
}

module.exports = {
  ajustarSaldo,
  ajustarSwipes
};
