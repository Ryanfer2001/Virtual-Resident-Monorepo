const pool = require("../config/database");

async function resumo(req, res) {
  try {
    const [[contas]] = await pool.query(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN estado = 'ativo' THEN 1 ELSE 0 END) AS ativas,
        SUM(CASE WHEN estado = 'pendente' THEN 1 ELSE 0 END) AS pendentes,
        SUM(CASE WHEN estado = 'suspenso' THEN 1 ELSE 0 END) AS suspensas,
        SUM(saldo) AS somaSaldo,
        SUM(swipes) AS somaSwipes
      FROM residentes`
    );

    const [[fotos]] = await pool.query(
      `SELECT
        SUM(
          CASE
            WHEN estado_foto_perfil = 'pendente'
              OR estado_foto_bi = 'pendente'
              OR estado_foto_cartao = 'pendente'
            THEN 1 ELSE 0
          END
        ) AS fotosPendentes
      FROM residentes`
    );

    const [[pedidosCartao]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM residentes
       WHERE pedidoCartao = 1
         AND estadoPedidoCartao = 'pendente'`
    );

    const [recentes] = await pool.query(
      `SELECT
        id,
        nome,
        username,
        pacote,
        estado,
        criadoEm
      FROM residentes
      ORDER BY criadoEm DESC
      LIMIT 5`
    );

    const [distribuicaoPacotes] = await pool.query(
      `SELECT pacote, COUNT(*) AS total
       FROM residentes
       GROUP BY pacote
       ORDER BY total DESC`
    );

    const anoAtual = new Date().getFullYear();

    const [pagamentosPorMes] = await pool.query(
      `SELECT MONTH(confirmadoEm) AS mes, SUM(valor) AS total
       FROM pagamentos
       WHERE estado = 'concluido'
         AND YEAR(confirmadoEm) = ?
       GROUP BY mes`,
      [anoAtual]
    );

    const somaPorMes = new Map(
      pagamentosPorMes.map((linha) => [Number(linha.mes), Number(linha.total || 0)])
    );

    const receitaMensal = Array.from({ length: 12 }, (_valor, indice) => ({
      mes: `${anoAtual}-${String(indice + 1).padStart(2, "0")}`,
      total: somaPorMes.get(indice + 1) || 0
    }));

    return res.status(200).json({
      sucesso: true,
      resumo: {
        totalResidentes: Number(contas.total || 0),
        contasAtivas: Number(contas.ativas || 0),
        contasPendentes: Number(contas.pendentes || 0),
        contasSuspensas: Number(contas.suspensas || 0),
        somaSaldo: Number(contas.somaSaldo || 0),
        somaSwipes: Number(contas.somaSwipes || 0),
        fotosPendentes: Number(fotos.fotosPendentes || 0),
        pedidosCartaoPendentes: Number(pedidosCartao.total || 0),
        registosRecentes: recentes,
        distribuicaoPacotes: distribuicaoPacotes.map((linha) => ({
          pacote: linha.pacote || "Sem pacote",
          total: Number(linha.total || 0)
        })),
        receitaMensal
      }
    });
  } catch (erro) {
    console.error("Erro ao carregar o resumo administrativo:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao carregar o resumo."
    });
  }
}

module.exports = {
  resumo
};
