const pool = require("../config/database");

async function procurarPorUsername(username) {
  const [linhas] = await pool.execute(
    `SELECT
      id,
      username,
      password_hash,
      role,
      ativo,
      tentativas_falhadas,
      bloqueado_ate,
      ultimo_login,
      criado_em,
      atualizado_em
    FROM administradores
    WHERE username = ?
    LIMIT 1`,
    [username]
  );

  return linhas[0] || null;
}

async function procurarPorId(id) {
  const [linhas] = await pool.execute(
    `SELECT
      id,
      username,
      role,
      ativo,
      tentativas_falhadas,
      bloqueado_ate,
      ultimo_login,
      criado_em,
      atualizado_em
    FROM administradores
    WHERE id = ?
    LIMIT 1`,
    [id]
  );

  return linhas[0] || null;
}

async function criarAdmin({ username, passwordHash, role }) {
  const [resultado] = await pool.execute(
    `INSERT INTO administradores (username, password_hash, role)
     VALUES (?, ?, ?)`,
    [username, passwordHash, role || "admin"]
  );

  return resultado;
}

async function registarTentativaFalhada(id) {
  const [resultado] = await pool.execute(
    `UPDATE administradores
     SET tentativas_falhadas = tentativas_falhadas + 1
     WHERE id = ?`,
    [id]
  );

  return resultado;
}

async function resetarTentativas(id) {
  const [resultado] = await pool.execute(
    `UPDATE administradores
     SET tentativas_falhadas = 0,
         bloqueado_ate = NULL
     WHERE id = ?`,
    [id]
  );

  return resultado;
}

async function bloquearTemporariamente(id, minutos) {
  const [resultado] = await pool.execute(
    `UPDATE administradores
     SET bloqueado_ate = DATE_ADD(NOW(), INTERVAL ? MINUTE)
     WHERE id = ?`,
    [minutos, id]
  );

  return resultado;
}

async function atualizarUltimoLogin(id) {
  const [resultado] = await pool.execute(
    `UPDATE administradores
     SET ultimo_login = NOW()
     WHERE id = ?`,
    [id]
  );

  return resultado;
}

module.exports = {
  procurarPorUsername,
  procurarPorId,
  criarAdmin,
  registarTentativaFalhada,
  resetarTentativas,
  bloquearTemporariamente,
  atualizarUltimoLogin
};
