const pool = require("../config/database");

async function procurarPorUsername(username) {
  const [rows] = await pool.execute(
    `SELECT
      *,
      foto_perfil_tipo AS fotoPerfilTipo,
      TO_BASE64(foto_perfil) AS fotoPerfilBase64,
      fotos_aprovadas AS fotosAprovadas
    FROM residentes
    WHERE username = ?
    LIMIT 1`,
    [username]
  );

  return rows[0] || null;
}

async function procurarPorId(id) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      nome,
      username,
      dataNascimento,
      nacionalidade,
      documento,
      telefone,
      email,
      morada,
      municipio,
      pais,
      codigoPostal,
      pacote,
      saldo,
      swipes,
      parking,
      eventos,
      qrToken,
      uid,
      estado,
      pedidoCartao,
      estadoPedidoCartao,
      criadoEm,
      cartaoGerado,
      qrAtivo,
      pagamentoStatus,
      ultimos4Cartao,
      valorPago,
      foto_perfil_tipo AS fotoPerfilTipo,
      TO_BASE64(foto_perfil) AS fotoPerfilBase64,
      fotos_aprovadas AS fotosAprovadas,
      data_fotos AS dataFotos
    FROM residentes
    WHERE id = ?
    LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function usernameExiste(username) {
  const [rows] = await pool.execute(
    `SELECT id
    FROM residentes
    WHERE username = ?
    LIMIT 1`,
    [username]
  );

  return rows.length > 0;
}

async function emailExiste(email) {
  if (!email) {
    return false;
  }

  const [rows] = await pool.execute(
    `SELECT id
    FROM residentes
    WHERE LOWER(email) = LOWER(?)
    LIMIT 1`,
    [email]
  );

  return rows.length > 0;
}

async function criarResidente(dados) {
  const {
    nome,
    username,
    password,
    dataNascimento,
    nacionalidade,
    documento,
    telefone,
    email,
    morada,
    municipio,
    pais,
    codigoPostal,
    pacote,
    saldo,
    swipes,
    parking,
    eventos,
    qrToken,
    uid,
    estado,
    pedidoCartao,
    estadoPedidoCartao
  } = dados;

  const [resultado] = await pool.execute(
    `INSERT INTO residentes (
      id,
      nome,
      username,
      password,
      dataNascimento,
      nacionalidade,
      documento,
      telefone,
      email,
      morada,
      municipio,
      pais,
      codigoPostal,
      pacote,
      saldo,
      swipes,
      parking,
      eventos,
      qrToken,
      uid,
      estado,
      pedidoCartao,
      estadoPedidoCartao
    )
    SELECT
      CONCAT(
        'NZS-VR-',
        LPAD(
          COALESCE(
            MAX(
              CASE
                WHEN id LIKE 'NZS-VR-%'
                THEN CAST(
                  SUBSTRING_INDEX(
                    SUBSTRING_INDEX(id, '-', 3),
                    '-',
                    -1
                  ) AS UNSIGNED
                )
                ELSE NULL
              END
            ),
            0
          ) + 1,
          7,
          '0'
        ),
        '-',
        YEAR(NOW())
      ),
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    FROM residentes`,
    [
      nome,
      username,
      password,
      dataNascimento,
      nacionalidade,
      documento,
      telefone || "",
      email || "",
      morada || "",
      municipio || "",
      pais || "",
      codigoPostal || "",
      pacote,
      saldo,
      swipes,
      parking,
      eventos,
      qrToken,
      uid || "",
      estado,
      pedidoCartao,
      estadoPedidoCartao
    ]
  );

  return resultado;
}

async function listarResidentes() {
  const [rows] = await pool.execute(
    `SELECT
      id,
      nome,
      username,
      dataNascimento,
      nacionalidade,
      documento,
      telefone,
      email,
      morada,
      municipio,
      pais,
      codigoPostal,
      pacote,
      saldo,
      swipes,
      parking,
      eventos,
      qrToken,
      uid,
      estado,
      pedidoCartao,
      estadoPedidoCartao,
      criadoEm,
      cartaoGerado,
      qrAtivo,
      pagamentoStatus,
      ultimos4Cartao,
      valorPago,
      foto_perfil_tipo AS fotoPerfilTipo,
      foto_bi_tipo AS fotoBITipo,

      CASE
        WHEN foto_perfil IS NOT NULL
          AND OCTET_LENGTH(foto_perfil) > 0
        THEN 1
        ELSE 0
      END AS temFotoPerfil,

      CASE
        WHEN foto_bi IS NOT NULL
          AND OCTET_LENGTH(foto_bi) > 0
        THEN 1
        ELSE 0
      END AS temFotoBI,

      fotos_aprovadas AS fotosAprovadas,
      data_fotos AS dataFotos
    FROM residentes
    ORDER BY criadoEm DESC`
  );

  return rows;
}

async function procurarFotoPerfilPorId(id) {
  const [rows] = await pool.execute(
    `SELECT
      foto_perfil AS foto,
      foto_perfil_tipo AS tipo
    FROM residentes
    WHERE id = ?
    LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function procurarFotoBIPorId(id) {
  const [rows] = await pool.execute(
    `SELECT
      foto_bi AS foto,
      foto_bi_tipo AS tipo
    FROM residentes
    WHERE id = ?
    LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function aprovarFotos(id) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET fotos_aprovadas = 1
     WHERE id = ?`,
    [id]
  );

  return resultado;
}

async function rejeitarFotos(id) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       foto_perfil = NULL,
       foto_perfil_tipo = NULL,
       foto_bi = NULL,
       foto_bi_tipo = NULL,
       fotos_aprovadas = 0,
       data_fotos = NULL
     WHERE id = ?`,
    [id]
  );

  return resultado;
}
async function atualizarFotos(dados) {
  const {
    id,
    fotoPerfilBuffer,
    fotoPerfilTipo,
    fotoBIBuffer,
    fotoBITipo,
    fotoCartaoBuffer,
    fotoCartaoTipo,
    removerFotoPerfil
  } = dados;

  const campos = [];
  const valores = [];
  let dataFotosAtualizada = false;

  /*
   * Remover a fotografia de perfil.
   */
  if (removerFotoPerfil) {
    campos.push("foto_perfil = NULL");
    campos.push("foto_perfil_tipo = NULL");
    campos.push("estado_foto_perfil = 'ausente'");
  }

  /*
   * Atualizar a fotografia de perfil (rosto).
   * Sempre que é alterada, volta a ficar pendente de revisão.
   */
  if (fotoPerfilBuffer) {
    campos.push("foto_perfil = ?");
    valores.push(fotoPerfilBuffer);

    campos.push("foto_perfil_tipo = ?");
    valores.push(fotoPerfilTipo || "image/jpeg");

    campos.push("estado_foto_perfil = 'pendente'");
    dataFotosAtualizada = true;
  }

  /*
   * Atualizar a fotografia do BI.
   * Sempre que o BI é alterado, volta a ficar pendente.
   */
  if (fotoBIBuffer) {
    campos.push("foto_bi = ?");
    valores.push(fotoBIBuffer);

    campos.push("foto_bi_tipo = ?");
    valores.push(fotoBITipo || "image/jpeg");

    campos.push("fotos_aprovadas = 0");
    campos.push("estado_foto_bi = 'pendente'");
    dataFotosAtualizada = true;
  }

  /*
   * Atualizar a fotografia do cartão.
   * Sempre que é alterada, volta a ficar pendente de revisão.
   */
  if (fotoCartaoBuffer) {
    campos.push("foto_cartao = ?");
    valores.push(fotoCartaoBuffer);

    campos.push("foto_cartao_tipo = ?");
    valores.push(fotoCartaoTipo || "image/jpeg");

    campos.push("estado_foto_cartao = 'pendente'");
    dataFotosAtualizada = true;
  }

  if (dataFotosAtualizada) {
    campos.push("data_fotos = NOW()");
  }

  if (campos.length === 0) {
    return {
      affectedRows: 0,
      nenhumaAlteracao: true
    };
  }

  valores.push(id);

  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET ${campos.join(", ")}
     WHERE id = ?`,
    valores
  );

  return resultado;
}
async function procurarPorEmail(email) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      nome,
      username,
      email
    FROM residentes
    WHERE LOWER(email) = LOWER(?)
    LIMIT 1`,
    [email]
  );

  return rows[0] || null;
}

async function guardarTokenRecuperacao(id, tokenHash) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       resetToken = ?,
       resetTokenExpira = DATE_ADD(NOW(), INTERVAL 1 HOUR)
     WHERE id = ?`,
    [tokenHash, id]
  );

  return resultado;
}

async function procurarPorTokenRecuperacao(tokenHash) {
  const [rows] = await pool.execute(
    `SELECT
      id,
      nome,
      username,
      email,
      resetTokenExpira
    FROM residentes
    WHERE resetToken = ?
      AND resetTokenExpira IS NOT NULL
      AND resetTokenExpira > NOW()
    LIMIT 1`,
    [tokenHash]
  );

  return rows[0] || null;
}

async function atualizarPasswordRecuperada(id, passwordHash) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       password = ?,
       resetToken = NULL,
       resetTokenExpira = NULL
     WHERE id = ?`,
    [passwordHash, id]
  );

  return resultado;
}
  /*
|--------------------------------------------------------------------------
| Solicitar cartão
|--------------------------------------------------------------------------
*/

async function solicitarCartao(id) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       pedidoCartao = 1,
       estadoPedidoCartao = 'pendente',
       cartaoGerado = 0
     WHERE id = ?
       AND (
         pedidoCartao = 0
         OR pedidoCartao IS NULL
         OR estadoPedidoCartao IN (
           'rejeitado',
           'cancelado'
         )
       )`,
    [id]
  );

  return resultado;
}

/*
|--------------------------------------------------------------------------
| Consultar estado do pedido de cartão
|--------------------------------------------------------------------------
*/

async function consultarPedidoCartao(id) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       nome,
       username,
       pedidoCartao,
       estadoPedidoCartao,
       cartaoGerado,
       uid
     FROM residentes
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

/*
|--------------------------------------------------------------------------
| Cancelar pedido de cartão
|--------------------------------------------------------------------------
*/

async function cancelarPedidoCartao(id) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       pedidoCartao = 0,
       estadoPedidoCartao = 'cancelado',
       cartaoGerado = 0
     WHERE id = ?
       AND pedidoCartao = 1
       AND estadoPedidoCartao = 'pendente'`,
    [id]
  );

  return resultado;
}

async function listarPedidosCartao() {
  const [rows] = await pool.execute(
    `SELECT
       id,
       nome,
       username,
       email,
       telefone,
       pacote,
       uid,
       pedidoCartao,
       estadoPedidoCartao,
       cartaoGerado,
       criadoEm,
       foto_perfil_tipo AS fotoPerfilTipo,

       CASE
         WHEN foto_perfil IS NOT NULL
           AND OCTET_LENGTH(foto_perfil) > 0
         THEN 1
         ELSE 0
       END AS temFotoPerfil

     FROM residentes
     WHERE pedidoCartao = 1
        OR estadoPedidoCartao IN (
          'pendente',
          'aprovado',
          'rejeitado',
          'cancelado'
        )
     ORDER BY
       CASE
         WHEN estadoPedidoCartao = 'pendente' THEN 0
         WHEN estadoPedidoCartao = 'aprovado' THEN 1
         ELSE 2
       END,
       criadoEm DESC`
  );

  return rows;
}

async function aprovarPedidoCartao(id) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       pedidoCartao = 1,
       estadoPedidoCartao = 'aprovado',
       cartaoGerado = 0
     WHERE id = ?
       AND pedidoCartao = 1
       AND estadoPedidoCartao = 'pendente'`,
    [id]
  );

  return resultado;
}

async function rejeitarPedidoCartao(id) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       pedidoCartao = 0,
       estadoPedidoCartao = 'rejeitado',
       cartaoGerado = 0
     WHERE id = ?
       AND pedidoCartao = 1
       AND estadoPedidoCartao = 'pendente'`,
    [id]
  );

  return resultado;
}

async function marcarCartaoComoGerado(id, uid) {
  const uidNormalizado =
    typeof uid === "string" && uid.trim()
      ? uid.trim()
      : null;

  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       cartaoGerado = 1,
       pedidoCartao = 1,
       estadoPedidoCartao = 'aprovado',
       uid = COALESCE(?, uid)
     WHERE id = ?
       AND pedidoCartao = 1
       AND estadoPedidoCartao = 'aprovado'
       AND (
         cartaoGerado = 0
         OR cartaoGerado IS NULL
       )`,
    [uidNormalizado, id]
  );

  return resultado;
}

async function consultarQRPorResidente(id) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       nome,
       username,
       qrToken,
       qrAtivo
     FROM residentes
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function guardarQRToken(id, qrToken) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       qrToken = ?,
       qrAtivo = 1
     WHERE id = ?`,
    [qrToken, id]
  );

  return resultado;
}

async function desativarQR(id) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET qrAtivo = 0
     WHERE id = ?`,
    [id]
  );

  return resultado;
}

async function validarQRToken(qrToken) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       nome,
       username,
       pacote,
       saldo,
       swipes,
       parking,
       eventos,
       estado,
       qrToken,
       qrAtivo
     FROM residentes
     WHERE qrToken = ?
       AND qrAtivo = 1
     LIMIT 1`,
    [qrToken]
  );

  return rows[0] || null;
}

/*
|--------------------------------------------------------------------------
| Permissões e swipes
|--------------------------------------------------------------------------
*/

async function consultarPermissoes(id) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       nome,
       username,
       pacote,
       saldo,
       swipes,
       parking,
       eventos,
       estado
     FROM residentes
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] || null;
}

async function consumirSwipe(id) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT
         id,
         swipes,
         estado
       FROM residentes
       WHERE id = ?
       FOR UPDATE`,
      [id]
    );

    const residente = rows[0] || null;

    if (!residente) {
      await connection.rollback();

      return {
        sucesso: false,
        motivo: "residente_nao_encontrado"
      };
    }

    if (
      residente.estado &&
      String(residente.estado).toLowerCase() !== "ativo"
    ) {
      await connection.rollback();

      return {
        sucesso: false,
        motivo: "residente_inativo",
        swipes: Number(residente.swipes || 0)
      };
    }

    const swipesAtuais =
      Number(residente.swipes || 0);

    if (swipesAtuais <= 0) {
      await connection.rollback();

      return {
        sucesso: false,
        motivo: "sem_swipes",
        swipes: 0
      };
    }

    const [resultado] = await connection.execute(
      `UPDATE residentes
       SET swipes = swipes - 1
       WHERE id = ?
         AND swipes > 0`,
      [id]
    );

    if (resultado.affectedRows === 0) {
      await connection.rollback();

      return {
        sucesso: false,
        motivo: "sem_swipes",
        swipes: 0
      };
    }

    const swipesRestantes = swipesAtuais - 1;

    await connection.commit();

    return {
      sucesso: true,
      swipesAnteriores: swipesAtuais,
      swipesRestantes
    };
  } catch (erro) {
    await connection.rollback();
    throw erro;
  } finally {
    connection.release();
  }
}

async function atualizarPermissoes(id, permissoes) {
  const parking =
    permissoes.parking === true ||
    permissoes.parking === 1 ||
    permissoes.parking === "1"
      ? 1
      : 0;

  const eventos =
    permissoes.eventos === true ||
    permissoes.eventos === 1 ||
    permissoes.eventos === "1"
      ? 1
      : 0;

  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       parking = ?,
       eventos = ?
     WHERE id = ?`,
    [parking, eventos, id]
  );

  return resultado;
}

async function definirSwipes(id, quantidade) {
  const quantidadeNormalizada =
    Number.isFinite(Number(quantidade))
      ? Math.max(
          0,
          Math.trunc(Number(quantidade))
        )
      : 0;

  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET swipes = ?
     WHERE id = ?`,
    [quantidadeNormalizada, id]
  );

  return {
    ...resultado,
    swipes: quantidadeNormalizada
  };
}

/*
|--------------------------------------------------------------------------
| Compatibilidade com endpoints legados do Node-RED
|--------------------------------------------------------------------------
*/

async function gerarCartaoLegado(id, uid) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       uid = ?,
       cartaoGerado = 1,
       estado = 'ativo',
       estadoPedidoCartao = 'concluído'
     WHERE id = ?`,
    [uid, id]
  );

  return resultado;
}

async function procurarPorUid(uid) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       nome,
       pacote,
       saldo,
       swipes,
       estado,
       uid
     FROM residentes
     WHERE UPPER(uid) = ?
     LIMIT 1`,
    [uid]
  );

  return rows[0] || null;
}

async function procurarPorQRTokenLegado(qrToken) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       nome,
       pacote,
       saldo,
       swipes,
       parking,
       eventos,
       estado,
       uid,
       qrAtivo,
       documento,
       telefone,
       email,
       nacionalidade,
       municipio,
       pedidoCartao,
       estadoPedidoCartao
     FROM residentes
     WHERE qrToken = ?
     LIMIT 1`,
    [qrToken]
  );

  return rows[0] || null;
}

async function solicitarCartaoLegado(id) {
  const [resultado] = await pool.execute(
    `UPDATE residentes
     SET
       pedidoCartao = 1,
       estadoPedidoCartao = 'pendente'
     WHERE id = ?`,
    [id]
  );

  return resultado;
}

module.exports = {
  procurarPorUsername,
  procurarPorId,
  usernameExiste,
  emailExiste,
  criarResidente,
  listarResidentes,
  procurarFotoPerfilPorId,
  procurarFotoBIPorId,
  aprovarFotos,
  rejeitarFotos,
  atualizarFotos,
  procurarPorEmail,
  guardarTokenRecuperacao,
  procurarPorTokenRecuperacao,
  atualizarPasswordRecuperada,
  solicitarCartao,
  consultarPedidoCartao,
  cancelarPedidoCartao,
  listarPedidosCartao,
  aprovarPedidoCartao,
  rejeitarPedidoCartao,
  marcarCartaoComoGerado,
  consultarQRPorResidente,
  guardarQRToken,
  desativarQR,
  validarQRToken,
  consultarPermissoes,
  consumirSwipe,
  atualizarPermissoes,
  definirSwipes,
  gerarCartaoLegado,
  procurarPorUid,
  procurarPorQRTokenLegado,
  solicitarCartaoLegado
};