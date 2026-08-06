const pool = require("../config/database");

const LIMITE_MAXIMO_PAGINA = 100;

/*
 * `executor` é opcional: passa a ligação de uma transação em curso (para
 * que a auditoria seja gravada atomicamente com a operação que a gerou),
 * ou usa a pool por omissão para ações fora de transação.
 */
async function registarAcao(dados, executor) {
  const ligacao = executor || pool;

  const {
    adminId,
    acao,
    entidade,
    entidadeId,
    valoresAnteriores,
    valoresNovos,
    motivo,
    ip
  } = dados;

  await ligacao.execute(
    `INSERT INTO admin_auditoria (
      admin_id,
      acao,
      entidade,
      entidade_id,
      valores_anteriores,
      valores_novos,
      motivo,
      ip
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId,
      acao,
      entidade,
      entidadeId !== undefined && entidadeId !== null
        ? String(entidadeId)
        : null,
      valoresAnteriores !== undefined
        ? JSON.stringify(valoresAnteriores)
        : null,
      valoresNovos !== undefined ? JSON.stringify(valoresNovos) : null,
      motivo || null,
      ip || null
    ]
  );
}

async function listarAuditoria(filtros = {}, paginacao = {}) {
  const condicoes = [];
  const valores = [];

  if (filtros.entidade) {
    condicoes.push("a.entidade = ?");
    valores.push(filtros.entidade);
  }

  if (filtros.entidadeId) {
    condicoes.push("a.entidade_id = ?");
    valores.push(String(filtros.entidadeId));
  }

  if (filtros.adminId) {
    condicoes.push("a.admin_id = ?");
    valores.push(filtros.adminId);
  }

  if (filtros.acao) {
    condicoes.push("a.acao = ?");
    valores.push(filtros.acao);
  }

  const whereSql =
    condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "";

  const pagina = Math.max(1, Number(paginacao.pagina) || 1);
  const porPagina = Math.min(
    LIMITE_MAXIMO_PAGINA,
    Math.max(1, Number(paginacao.porPagina) || 25)
  );
  const offset = (pagina - 1) * porPagina;

  const [linhas] = await pool.query(
    `SELECT
      a.id,
      a.admin_id AS adminId,
      admins.username AS adminUsername,
      a.acao,
      a.entidade,
      a.entidade_id AS entidadeId,
      a.valores_anteriores AS valoresAnteriores,
      a.valores_novos AS valoresNovos,
      a.motivo,
      a.ip,
      a.criado_em AS criadoEm
    FROM admin_auditoria a
    LEFT JOIN administradores admins ON admins.id = a.admin_id
    ${whereSql}
    ORDER BY a.criado_em DESC
    LIMIT ? OFFSET ?`,
    [...valores, porPagina, offset]
  );

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM admin_auditoria a
     ${whereSql}`,
    valores
  );

  return {
    registos: linhas,
    total,
    pagina,
    porPagina
  };
}

module.exports = {
  registarAcao,
  listarAuditoria
};
