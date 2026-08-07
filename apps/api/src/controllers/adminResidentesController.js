const pool = require("../config/database");
const auditoriaModel = require("../models/auditoriaModel");

const LIMITE_MAXIMO_PAGINA = 100;

const ESTADOS_PERMITIDOS = ["pendente", "ativo", "suspenso"];

const COLUNAS_ORDENACAO_PERMITIDAS = {
  criadoEm: "criadoEm",
  nome: "nome",
  saldo: "saldo",
  swipes: "swipes"
};

function obterIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "desconhecido"
  );
}

function construirFiltros(query) {
  const condicoes = [];
  const valores = [];

  const pesquisa = typeof query.pesquisa === "string" ? query.pesquisa.trim() : "";

  if (pesquisa) {
    condicoes.push(
      `(
        id LIKE ?
        OR nome LIKE ?
        OR username LIKE ?
        OR email LIKE ?
        OR documento LIKE ?
        OR telefone LIKE ?
      )`
    );

    const termo = `%${pesquisa}%`;
    valores.push(termo, termo, termo, termo, termo, termo);
  }

  if (query.estado && ESTADOS_PERMITIDOS.includes(query.estado)) {
    condicoes.push("estado = ?");
    valores.push(query.estado);
  }

  if (query.pacote && typeof query.pacote === "string") {
    condicoes.push("pacote = ?");
    valores.push(query.pacote);
  }

  if (query.pais && typeof query.pais === "string") {
    condicoes.push("pais = ?");
    valores.push(query.pais);
  }

  if (query.fotosPendentes === "1" || query.fotosPendentes === "true") {
    condicoes.push(
      `(
        estado_foto_perfil = 'pendente'
        OR estado_foto_bi = 'pendente'
        OR estado_foto_cartao = 'pendente'
      )`
    );
  }

  if (query.pedidoCartao === "1" || query.pedidoCartao === "true") {
    condicoes.push("pedidoCartao = 1");
  }

  if (query.cartaoGerado === "1" || query.cartaoGerado === "true") {
    condicoes.push("cartaoGerado = 1");
  } else if (query.cartaoGerado === "0" || query.cartaoGerado === "false") {
    condicoes.push("(cartaoGerado = 0 OR cartaoGerado IS NULL)");
  }

  return {
    whereSql: condicoes.length > 0 ? `WHERE ${condicoes.join(" AND ")}` : "",
    valores
  };
}

async function listar(req, res) {
  try {
    const pagina = Math.max(1, Number(req.query.pagina) || 1);
    const porPagina = Math.min(
      LIMITE_MAXIMO_PAGINA,
      Math.max(1, Number(req.query.porPagina) || 20)
    );
    const offset = (pagina - 1) * porPagina;

    const colunaOrdenacao =
      COLUNAS_ORDENACAO_PERMITIDAS[req.query.ordenarPor] || "criadoEm";
    const direcaoOrdenacao = req.query.direcao === "asc" ? "ASC" : "DESC";

    const { whereSql, valores } = construirFiltros(req.query);

    const [linhas] = await pool.query(
      `SELECT
        id,
        nome,
        username,
        email,
        telefone,
        pais,
        municipio,
        pacote,
        saldo,
        swipes,
        estado,
        pedidoCartao,
        estadoPedidoCartao,
        cartaoGerado,
        estado_foto_perfil AS estadoFotoPerfil,
        estado_foto_bi AS estadoFotoBI,
        estado_foto_cartao AS estadoFotoCartao,
        criadoEm
      FROM residentes
      ${whereSql}
      ORDER BY ${colunaOrdenacao} ${direcaoOrdenacao}
      LIMIT ? OFFSET ?`,
      [...valores, porPagina, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM residentes ${whereSql}`,
      valores
    );

    return res.status(200).json({
      sucesso: true,
      residentes: linhas.map((residente) => ({
        ...residente,
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        pedidoCartao: Boolean(residente.pedidoCartao),
        cartaoGerado: Boolean(residente.cartaoGerado)
      })),
      total,
      pagina,
      porPagina
    });
  } catch (erro) {
    console.error("Erro ao listar residentes (admin):", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao listar os residentes."
    });
  }
}

async function detalhe(req, res) {
  try {
    const { id } = req.params;

    const [linhas] = await pool.execute(
      `SELECT
        id,
        nome,
        username,
        email,
        telefone,
        dataNascimento,
        nacionalidade,
        documento,
        morada,
        municipio,
        pais,
        codigoPostal,
        pacote,
        saldo,
        swipes,
        parking,
        eventos,
        uid,
        qrAtivo,
        pedidoCartao,
        estadoPedidoCartao,
        cartaoGerado,
        estado,
        criadoEm,
        estado_foto_perfil AS estadoFotoPerfil,
        estado_foto_bi AS estadoFotoBI,
        estado_foto_cartao AS estadoFotoCartao,
        motivo_rejeicao_foto_perfil AS motivoRejeicaoFotoPerfil,
        motivo_rejeicao_foto_bi AS motivoRejeicaoFotoBI,
        motivo_rejeicao_foto_cartao AS motivoRejeicaoFotoCartao,
        foto_perfil_tipo AS fotoPerfilTipo,
        foto_bi_tipo AS fotoBITipo,
        foto_cartao_tipo AS fotoCartaoTipo
      FROM residentes
      WHERE id = ?
      LIMIT 1`,
      [id]
    );

    const residente = linhas[0];

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const historico = await auditoriaModel.listarAuditoria(
      { entidade: "residente", entidadeId: id },
      { pagina: 1, porPagina: 50 }
    );

    return res.status(200).json({
      sucesso: true,
      residente: {
        ...residente,
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        parking: Boolean(residente.parking),
        eventos: Boolean(residente.eventos),
        qrAtivo: Boolean(residente.qrAtivo),
        pedidoCartao: Boolean(residente.pedidoCartao),
        cartaoGerado: Boolean(residente.cartaoGerado)
      },
      historico: historico.registos
    });
  } catch (erro) {
    console.error("Erro ao carregar detalhe do residente:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao carregar o residente."
    });
  }
}

async function atualizarEstado(req, res) {
  const conexao = await pool.getConnection();

  try {
    const { id } = req.params;
    const { estado, motivo } = req.body || {};

    if (!ESTADOS_PERMITIDOS.includes(estado)) {
      conexao.release();

      return res.status(400).json({
        sucesso: false,
        mensagem: `Estado inválido. Usa um de: ${ESTADOS_PERMITIDOS.join(", ")}.`
      });
    }

    if (estado === "suspenso" && !motivo) {
      conexao.release();

      return res.status(400).json({
        sucesso: false,
        mensagem: "O motivo é obrigatório para suspender uma conta."
      });
    }

    await conexao.beginTransaction();

    const [linhas] = await conexao.execute(
      "SELECT id, estado FROM residentes WHERE id = ? FOR UPDATE",
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

    await conexao.execute(
      "UPDATE residentes SET estado = ? WHERE id = ?",
      [estado, id]
    );

    await auditoriaModel.registarAcao(
      {
        adminId: req.admin.id,
        acao: "atualizar_estado_residente",
        entidade: "residente",
        entidadeId: id,
        valoresAnteriores: { estado: residenteAtual.estado },
        valoresNovos: { estado },
        motivo: motivo || null,
        ip: obterIp(req)
      },
      conexao
    );

    await conexao.commit();

    return res.status(200).json({
      sucesso: true,
      mensagem: "Estado do residente atualizado com sucesso.",
      residenteId: id,
      estado
    });
  } catch (erro) {
    await conexao.rollback();

    console.error("Erro ao atualizar estado do residente:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao atualizar o estado do residente."
    });
  } finally {
    conexao.release();
  }
}

async function atualizarPermissoes(req, res) {
  const conexao = await pool.getConnection();

  try {
    const { id } = req.params;
    const { parking, eventos } = req.body || {};

    if (parking === undefined && eventos === undefined) {
      conexao.release();

      return res.status(400).json({
        sucesso: false,
        mensagem: "Envia pelo menos uma permissão para atualizar."
      });
    }

    await conexao.beginTransaction();

    const [linhas] = await conexao.execute(
      "SELECT id, parking, eventos FROM residentes WHERE id = ? FOR UPDATE",
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

    const novoParking =
      parking !== undefined ? Boolean(parking) : Boolean(residenteAtual.parking);
    const novoEventos =
      eventos !== undefined ? Boolean(eventos) : Boolean(residenteAtual.eventos);

    await conexao.execute(
      "UPDATE residentes SET parking = ?, eventos = ? WHERE id = ?",
      [novoParking, novoEventos, id]
    );

    await auditoriaModel.registarAcao(
      {
        adminId: req.admin.id,
        acao: "atualizar_permissoes_residente",
        entidade: "residente",
        entidadeId: id,
        valoresAnteriores: {
          parking: Boolean(residenteAtual.parking),
          eventos: Boolean(residenteAtual.eventos)
        },
        valoresNovos: { parking: novoParking, eventos: novoEventos },
        ip: obterIp(req)
      },
      conexao
    );

    await conexao.commit();

    return res.status(200).json({
      sucesso: true,
      mensagem: "Permissões atualizadas com sucesso.",
      residenteId: id,
      parking: novoParking,
      eventos: novoEventos
    });
  } catch (erro) {
    await conexao.rollback();

    console.error("Erro ao atualizar permissões (admin):", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao atualizar as permissões."
    });
  } finally {
    conexao.release();
  }
}

module.exports = {
  listar,
  detalhe,
  atualizarEstado,
  atualizarPermissoes
};
