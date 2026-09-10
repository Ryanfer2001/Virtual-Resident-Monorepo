const pool = require("../config/database");
const catalogoPacotes = require("../config/catalogoPacotes");

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
| Criar pagamento de pacote pendente (único por residente) — TC10
|--------------------------------------------------------------------------
|
| Diferente de criarPagamentoPendente (recargas TC1, onde várias
| tentativas em paralelo são aceitáveis): um pagamento de pacote só pode
| ter uma linha "pendente" de cada vez por residente, para o residente
| nunca pagar duas vezes o mesmo pacote antes de qualquer callback
| confirmar. A verificação e a inserção correm na mesma transação,
| protegidas por um único SELECT ... FOR UPDATE sobre a linha do
| residente — nunca bloqueia também a tabela pagamentos, para não
| inverter a ordem de locks face a concluirPagamentoEAtivarPacote (que
| bloqueia primeiro pagamentos, depois residentes). Como só esta função
| cria pagamentos "pacote" pendentes, e fá-lo sempre com o residente já
| bloqueado, nenhuma outra transação consegue inserir ou concluir um
| pagamento "pacote" deste residente enquanto o lock estiver ativo —
| por isso a segunda leitura (a pagamentos) não precisa de FOR UPDATE:
| qualquer escritor concorrente está bloqueado à espera do lock do
| residente, ou já terminou (commit) antes deste SELECT correr. Não
| invalida nem toca em nenhuma transação SISP já iniciada — só impede
| criar uma nova enquanto houver uma pendente.
|--------------------------------------------------------------------------
*/

async function criarPagamentoPacotePendenteUnico(dados) {
  const {
    residenteId,
    merchantRef,
    merchantSession,
    pacote,
    valor
  } = dados;

  const conexao = await pool.getConnection();

  try {
    await conexao.beginTransaction();

    const [residentes] = await conexao.execute(
      `SELECT
        id,
        estadoPacote
      FROM residentes
      WHERE id = ?
      LIMIT 1
      FOR UPDATE`,
      [residenteId]
    );

    const residente = residentes[0];

    if (!residente) {
      await conexao.rollback();

      return {
        sucesso: false,
        motivo: "residente_nao_encontrado"
      };
    }

    if (residente.estadoPacote !== "pendente_pagamento") {
      await conexao.rollback();

      return {
        sucesso: false,
        motivo: "pacote_nao_pendente"
      };
    }

    const [existentes] = await conexao.execute(
      `SELECT id
      FROM pagamentos
      WHERE residenteId = ?
        AND tipo = 'pacote'
        AND estado = 'pendente'`,
      [residenteId]
    );

    if (existentes.length > 0) {
      await conexao.rollback();

      return {
        sucesso: false,
        motivo: "pagamento_pendente_existente"
      };
    }

    const [resultado] = await conexao.execute(
      `INSERT INTO pagamentos (
        residenteId,
        merchantRef,
        merchantSession,
        tipo,
        pacote,
        valor,
        estado
      )
      VALUES (?, ?, ?, 'pacote', ?, ?, 'pendente')`,
      [
        residenteId,
        merchantRef,
        merchantSession,
        pacote,
        valor
      ]
    );

    await conexao.commit();

    return {
      sucesso: true,
      id: resultado.insertId
    };
  } catch (erro) {
    try {
      await conexao.rollback();
    } catch (erroRollback) {
      console.error(
        "Erro ao executar rollback da criação do pagamento de pacote:",
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
| Concluir pagamento de pacote e ativar o pacote — TC10
|--------------------------------------------------------------------------
|
| Mesma forma de concluirPagamentoEAplicarRecarga (bloqueia o pagamento,
| confirma que está pendente, bloqueia o residente, aplica, confirma o
| pagamento, COMMIT — ROLLBACK em qualquer falha), mas em vez de somar
| saldo ativa o pacote com os benefícios oficiais do catálogo. Nunca usa
| saldo/swipes/eventos/parking vindos de fora — resolve sempre pelo
| catalogoPacotes a partir do nome do pacote já gravado no residente, e
| confirma que esse nome corresponde ao pacote guardado no próprio
| pagamento antes de aplicar. concluirPagamentoEAplicarRecarga não é
| tocada por esta função.
|--------------------------------------------------------------------------
*/

async function concluirPagamentoEAtivarPacote({
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
     * ative o pacote duas vezes.
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

    if (pagamento.tipo !== "pacote") {
      throw new Error(
        `Tipo de pagamento inesperado para ativação de pacote: ${pagamento.tipo}.`
      );
    }

    /*
     * Bloqueia o residente durante a atualização.
     */
    const [residentes] = await conexao.execute(
      `SELECT
        id,
        pacote,
        estadoPacote
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

    /*
     * Isto NÃO é idempotência — é uma inconsistência. O pagamento
     * ainda está "pendente" (nenhuma execução anterior desta função o
     * concluiu), mas o pacote do residente já não está
     * "pendente_pagamento". No fluxo normal isto nunca acontece:
     * criarPagamentoPacotePendenteUnico só cria um pagamento "pacote"
     * quando estadoPacote é "pendente_pagamento", e esta função muda
     * os dois atomicamente. Se acontecer, indica alteração externa ao
     * fluxo (ex.: estadoPacote editado manualmente) e tem de ser
     * investigado — nunca tratado como sucesso silencioso nem como
     * "já processado".
     */
    if (residente.estadoPacote !== "pendente_pagamento") {
      console.error(
        "Inconsistência ao ativar pacote: pagamento pendente associado a residente cujo pacote já não está pendente_pagamento.",
        {
          merchantRef,
          residenteId: residente.id,
          estadoPacote: residente.estadoPacote
        }
      );

      throw new Error(
        "Estado do pacote inconsistente com o pagamento pendente."
      );
    }

    const pacoteCatalogo =
      catalogoPacotes.obterPorNome(residente.pacote);

    if (!pacoteCatalogo) {
      throw new Error(
        `Pacote gravado no residente não existe no catálogo: ${residente.pacote}.`
      );
    }

    if (pagamento.pacote !== residente.pacote) {
      throw new Error(
        "O pacote do pagamento não corresponde ao pacote do residente."
      );
    }

    const precoCVE = Number(pacoteCatalogo.precoCVE);
    const valorPagamento = Number(pagamento.valor);

    if (
      !Number.isFinite(precoCVE) ||
      valorPagamento !== precoCVE
    ) {
      throw new Error(
        "O valor do pagamento não corresponde ao preço atual do pacote no catálogo."
      );
    }

    /*
     * Ativa o pacote com os benefícios oficiais do catálogo.
     */
    const [resultadoResidente] = await conexao.execute(
      `UPDATE residentes
      SET
        estadoPacote = 'ativo',
        saldo = ?,
        swipes = ?,
        eventos = ?,
        parking = ?
      WHERE id = ?
        AND estadoPacote = 'pendente_pagamento'`,
      [
        pacoteCatalogo.saldo,
        pacoteCatalogo.swipes,
        pacoteCatalogo.eventos,
        pacoteCatalogo.parking,
        residente.id
      ]
    );

    if (resultadoResidente.affectedRows === 0) {
      throw new Error(
        "Não foi possível ativar o pacote do residente."
      );
    }

    /*
     * Marca o pagamento como concluído.
     */
    const [resultadoPagamento] = await conexao.execute(
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
      residenteId: residente.id,
      pacote: residente.pacote,
      valorAplicado: precoCVE,
      saldoAplicado: pacoteCatalogo.saldo,
      swipesAplicado: pacoteCatalogo.swipes
    };
  } catch (erro) {
    try {
      await conexao.rollback();
    } catch (erroRollback) {
      console.error(
        "Erro ao executar rollback da ativação de pacote:",
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
  criarPagamentoPacotePendenteUnico,
  concluirPagamentoEAtivarPacote,
  expirarPagamentosPendentes
};