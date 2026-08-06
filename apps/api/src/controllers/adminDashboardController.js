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
        registosRecentes: recentes
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
