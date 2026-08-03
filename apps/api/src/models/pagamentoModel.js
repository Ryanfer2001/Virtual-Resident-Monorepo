const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Criar pagamento pendente
|--------------------------------------------------------------------------
*/

async function criarPagamentoPendente(dados) {
  const {
    residenteId,
    merchantRef,
    merchantSession,
    tipo,
    pacote,
    valor
  } = dados;

  const [resultado] = await pool.execute(
    `INSERT INTO pagamentos (
      residenteId,
      merchantRef,
      merchantSession,
      tipo,
      pacote,
      valor,
      estado
    )
    VALUES (?, ?, ?, ?, ?, ?, 'pendente')`,
    [
      residenteId,
      merchantRef,
      merchantSession,
      tipo,
      pacote,
      valor
    ]
  );

  return resultado;
}

/*
|--------------------------------------------------------------------------
| Procurar pagamento pela referência
|--------------------------------------------------------------------------
*/

async function procurarPorMerchantRef(
  merchantRef
) {
  const [rows] = await pool.execute(
    `SELECT *
    FROM pagamentos
    WHERE merchantRef = ?
    LIMIT 1`,
    [merchantRef]
  );

  return rows[0] || null;
}

/*
|--------------------------------------------------------------------------
| Marcar pagamento como concluído
|--------------------------------------------------------------------------
|
| Esta função pode continuar no model,
| mas a recarga final deve usar
| concluirPagamentoEAplicarRecarga.
|--------------------------------------------------------------------------
*/

async function marcarComoConcluido({
  merchantRef,
  codigoResposta,
  descricaoResposta
}) {
  const [resultado] = await pool.execute(
    `UPDATE pagamentos
    SET
      estado = 'concluido',
      codigoResposta = ?,
      descricaoResposta = ?,
      confirmadoEm = NOW()
    WHERE merchantRef = ?
      AND estado = 'pendente'`,
    [
      codigoResposta || "",
      descricaoResposta || "",
      merchantRef
    ]
  );

  return resultado;
}

/*
|--------------------------------------------------------------------------
| Marcar pagamento como falhado
|--------------------------------------------------------------------------
*/

async function marcarComoFalhado({
  merchantRef,
  codigoResposta,
  descricaoResposta
}) {
  const [resultado] = await pool.execute(
    `UPDATE pagamentos
    SET
      estado = 'falhado',
      codigoResposta = ?,
      descricaoResposta = ?
    WHERE merchantRef = ?
      AND estado = 'pendente'`,
    [
      codigoResposta || "",
      descricaoResposta || "",
      merchantRef
    ]
  );

  return resultado;
}

/*
|--------------------------------------------------------------------------
| Concluir pagamento e aplicar recarga
|--------------------------------------------------------------------------
|
| Esta função executa tudo numa única transação MySQL:
|
| 1. bloqueia o pagamento;
| 2. confirma que ainda está pendente;
| 3. bloqueia o residente;
| 4. adiciona o valor ao saldo;
| 5. marca o pagamento como concluído;
| 6. faz COMMIT.
|
| Se alguma etapa falhar, executa ROLLBACK.
|--------------------------------------------------------------------------
*/

async function concluirPagamentoEAplicarRecarga({
  merchantRef,
  codigoResposta,
  descricaoResposta
}) {
  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    /*
     * Bloqueia a linha do pagamento para impedir
     * que duas respostas sejam processadas ao mesmo tempo.
     */
    const [pagamentos] = await conexao.execute(
      `SELECT
        id,
        residenteId,
        merchantRef,
        merchantSession,
        tipo,
        pacote,
        valor,
        estado
      FROM pagamentos
      WHERE merchantRef = ?
      LIMIT 1
      FOR UPDATE`,
      [merchantRef]
    );

    const pagamento = pagamentos[0];

    if (!pagamento) {
      throw new Error(
        "Pagamento não encontrado."
      );
    }

    /*
     * Impede que o mesmo pagamento
     * aplique a recarga duas vezes.
     */
    if (pagamento.estado !== "pendente") {
      await conexao.rollback();

      return {
        sucesso: false,
        jaProcessado: true,
        estado: pagamento.estado,
        residenteId: pagamento.residenteId,
        valorAplicado: 0
      };
    }

    const valor = Number(
      pagamento.valor || 0
    );

    if (
      !Number.isFinite(valor) ||
      valor <= 0
    ) {
      throw new Error(
        "Valor do pagamento inválido."
      );
    }

    /*
     * Nesta fase apenas os pagamentos do tipo
     * saldo aplicam recarga monetária.
     */
    if (pagamento.tipo !== "saldo") {
      throw new Error(
        `Tipo de pagamento ainda não suportado: ${pagamento.tipo}.`
      );
    }

    /*
     * Bloqueia o residente durante a atualização.
     */
    const [residentes] = await conexao.execute(
      `SELECT
        id,
        saldo
      FROM residentes
      WHERE id = ?
      LIMIT 1
      FOR UPDATE`,
      [pagamento.residenteId]
    );

    const residente = residentes[0];

    if (!residente) {
      throw new Error(
        "Residente associado ao pagamento não encontrado."
      );
    }

    const saldoAnterior = Number(
      residente.saldo || 0
    );

    /*
     * Adiciona o valor pago ao saldo atual.
     */
    const [resultadoSaldo] =
      await conexao.execute(
        `UPDATE residentes
        SET saldo = COALESCE(saldo, 0) + ?
        WHERE id = ?`,
        [
          valor,
          pagamento.residenteId
        ]
      );

    if (resultadoSaldo.affectedRows === 0) {
      throw new Error(
        "Não foi possível atualizar o saldo do residente."
      );
    }

    /*
     * Marca o pagamento como concluído.
     */
    const [resultadoPagamento] =
      await conexao.execute(
        `UPDATE pagamentos
        SET
          estado = 'concluido',
          codigoResposta = ?,
          descricaoResposta = ?,
          confirmadoEm = NOW()
        WHERE merchantRef = ?
          AND estado = 'pendente'`,
        [
          codigoResposta || "",
          descricaoResposta || "",
          merchantRef
        ]
      );

    if (resultadoPagamento.affectedRows === 0) {
      throw new Error(
        "Não foi possível concluir o pagamento."
      );
    }

    await conexao.commit();

    return {
      sucesso: true,
      jaProcessado: false,
      residenteId:
        pagamento.residenteId,
      valorAplicado:
        valor,
      saldoAnterior,
      saldoAtual:
        saldoAnterior + valor
    };
  } catch (erro) {
    try {
      await conexao.rollback();
    } catch (erroRollback) {
      console.error(
        "Erro ao executar rollback do pagamento:",
        erroRollback.message
      );
    }

    throw erro;
  } finally {
    conexao.release();
  }
}

/*
|--------------------------------------------------------------------------
| Exportações
|--------------------------------------------------------------------------
*/
async function expirarPagamentosPendentes() {
  const [resultado] = await pool.execute(
    `UPDATE pagamentos
    SET
      estado = 'expirado',
      descricaoResposta =
        'Pagamento expirado por falta de confirmação.'
    WHERE estado = 'pendente'
      AND criadoEm < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
  );

  return resultado;
}

module.exports = {
  criarPagamentoPendente,
  procurarPorMerchantRef,
  marcarComoConcluido,
  marcarComoFalhado,
  concluirPagamentoEAplicarRecarga,
  expirarPagamentosPendentes
};