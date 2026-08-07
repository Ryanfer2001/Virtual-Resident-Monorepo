const pool = require("../config/database");
const auditoriaModel = require("../models/auditoriaModel");

/*
 * Mapa único do tipo (perfil/bi/cartao) para as colunas reais em
 * `residentes`. Os nomes de coluna da foto de rosto continuam a ser
 * foto_perfil/foto_perfil_tipo — não foram renomeados, para não quebrar
 * o registo/dashboard do residente. "rosto" é aceite como alias de
 * "perfil" para quem já estiver a usar esse nome.
 */
const MAPA_TIPO_FOTO = {
  perfil: {
    blob: "foto_perfil",
    tipoMime: "foto_perfil_tipo",
    estado: "estado_foto_perfil",
    motivo: "motivo_rejeicao_foto_perfil",
    revisadoEm: "foto_perfil_revisado_em",
    revisadoPor: "foto_perfil_revisado_por"
  },
  rosto: {
    blob: "foto_perfil",
    tipoMime: "foto_perfil_tipo",
    estado: "estado_foto_perfil",
    motivo: "motivo_rejeicao_foto_perfil",
    revisadoEm: "foto_perfil_revisado_em",
    revisadoPor: "foto_perfil_revisado_por"
  },
  bi: {
    blob: "foto_bi",
    tipoMime: "foto_bi_tipo",
    estado: "estado_foto_bi",
    motivo: "motivo_rejeicao_foto_bi",
    revisadoEm: "foto_bi_revisado_em",
    revisadoPor: "foto_bi_revisado_por"
  },
  cartao: {
    blob: "foto_cartao",
    tipoMime: "foto_cartao_tipo",
    estado: "estado_foto_cartao",
    motivo: "motivo_rejeicao_foto_cartao",
    revisadoEm: "foto_cartao_revisado_em",
    revisadoPor: "foto_cartao_revisado_por"
  }
};

function obterIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "desconhecido"
  );
}

function validarTipo(tipo, res) {
  const definicao = MAPA_TIPO_FOTO[tipo];

  if (!definicao) {
    res.status(400).json({
      sucesso: false,
      mensagem: "Tipo de fotografia inválido. Usa perfil, bi ou cartao."
    });

    return null;
  }

  return definicao;
}

async function listarPendentes(req, res) {
  try {
    const [linhas] = await pool.query(
      `SELECT
        id,
        nome,
        username,
        pacote,
        estado_foto_perfil AS estadoFotoPerfil,
        estado_foto_bi AS estadoFotoBI,
        estado_foto_cartao AS estadoFotoCartao,
        data_fotos AS dataFotos
      FROM residentes
      WHERE estado_foto_perfil = 'pendente'
         OR estado_foto_bi = 'pendente'
         OR estado_foto_cartao = 'pendente'
      ORDER BY data_fotos DESC`
    );

    return res.status(200).json({
      sucesso: true,
      total: linhas.length,
      residentes: linhas
    });
  } catch (erro) {
    console.error("Erro ao listar fotografias pendentes:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao listar as fotografias pendentes."
    });
  }
}

async function obterImagem(req, res) {
  try {
    const { id, tipo } = req.params;

    const definicao = validarTipo(tipo, res);

    if (!definicao) {
      return;
    }

    const [linhas] = await pool.query(
      `SELECT
        ${definicao.blob} AS imagem,
        ${definicao.tipoMime} AS tipoMime
      FROM residentes
      WHERE id = ?
      LIMIT 1`,
      [id]
    );

    const resultado = linhas[0];

    if (!resultado || !resultado.imagem) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Fotografia não encontrada."
      });
    }

    res.setHeader("Content-Type", resultado.tipoMime || "image/jpeg");
    res.setHeader("Content-Length", resultado.imagem.length);
    res.setHeader("Cache-Control", "private, no-store");

    return res.status(200).send(resultado.imagem);
  } catch (erro) {
    console.error("Erro ao carregar imagem (admin):", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao carregar a fotografia."
    });
  }
}

async function revisar(req, res, { novoEstado, exigirMotivo }) {
  const conexao = await pool.getConnection();

  try {
    const { id } = req.params;
    const { tipo, motivo } = req.body || {};

    const definicao = validarTipo(tipo, res);

    if (!definicao) {
      conexao.release();
      return;
    }

    if (exigirMotivo && (!motivo || !String(motivo).trim())) {
      conexao.release();

      return res.status(400).json({
        sucesso: false,
        mensagem: "O motivo é obrigatório para rejeitar uma fotografia."
      });
    }

    await conexao.beginTransaction();

    const [linhas] = await conexao.query(
      `SELECT
        ${definicao.blob} AS imagem,
        ${definicao.estado} AS estadoAtual
      FROM residentes
      WHERE id = ?
      FOR UPDATE`,
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

    if (!residenteAtual.imagem) {
      await conexao.rollback();

      return res.status(409).json({
        sucesso: false,
        mensagem: "Este residente ainda não enviou esta fotografia."
      });
    }

    const motivoFinal = novoEstado === "rejeitada" ? String(motivo).trim() : null;

    await conexao.query(
      `UPDATE residentes
       SET ${definicao.estado} = ?,
           ${definicao.motivo} = ?,
           ${definicao.revisadoEm} = NOW(),
           ${definicao.revisadoPor} = ?
       WHERE id = ?`,
      [novoEstado, motivoFinal, req.admin.id, id]
    );

    await auditoriaModel.registarAcao(
      {
        adminId: req.admin.id,
        acao: novoEstado === "aprovada" ? "aprovar_foto" : "rejeitar_foto",
        entidade: "residente",
        entidadeId: id,
        valoresAnteriores: { tipo, estado: residenteAtual.estadoAtual },
        valoresNovos: { tipo, estado: novoEstado, motivo: motivoFinal },
        motivo: motivoFinal,
        ip: obterIp(req)
      },
      conexao
    );

    await conexao.commit();

    return res.status(200).json({
      sucesso: true,
      mensagem:
        novoEstado === "aprovada"
          ? "Fotografia aprovada com sucesso."
          : "Fotografia rejeitada com sucesso.",
      residenteId: id,
      tipo,
      estado: novoEstado
    });
  } catch (erro) {
    await conexao.rollback();

    console.error("Erro ao rever fotografia:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao rever a fotografia."
    });
  } finally {
    conexao.release();
  }
}

async function aprovar(req, res) {
  return revisar(req, res, { novoEstado: "aprovada", exigirMotivo: false });
}

async function rejeitar(req, res) {
  return revisar(req, res, { novoEstado: "rejeitada", exigirMotivo: true });
}

module.exports = {
  listarPendentes,
  obterImagem,
  aprovar,
  rejeitar
};
