const residenteModel = require("../models/residenteModel");
const auditoriaModel = require("../models/auditoriaModel");

function obterIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "desconhecido"
  );
}

function obterResidenteId(req) {
  return (
    req.params?.id ||
    req.body?.id ||
    req.body?.residenteId ||
    req.query?.id ||
    req.query?.residenteId ||
    ""
  );
}

async function listarResidentes(req, res) {
  try {
    const residentes =
      await residenteModel.listarResidentes();

    const residentesFormatados = residentes.map(
      (residente) => ({
        ...residente,
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        parking: Boolean(residente.parking),
        eventos: Boolean(residente.eventos),
        pedidoCartao: Boolean(residente.pedidoCartao),
        cartaoGerado: Boolean(residente.cartaoGerado),
        qrAtivo: Boolean(residente.qrAtivo),
        valorPago: Number(residente.valorPago || 0),
        fotosAprovadas: Boolean(residente.fotosAprovadas),
        temFotoPerfil: Boolean(residente.temFotoPerfil),
        temFotoBI: Boolean(residente.temFotoBI),
        fotoPerfilTipo: residente.fotoPerfilTipo || "",
        fotoBITipo: residente.fotoBITipo || ""
      })
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: "Residentes carregados com sucesso.",
      total: residentesFormatados.length,
      residentes: residentesFormatados
    });
  } catch (erro) {
    console.error(
      "Erro ao listar residentes:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao carregar os residentes."
    });
  }
}

async function obterFotoPerfil(req, res) {
  try {
    const { id } = req.params;

    const resultado =
      await residenteModel.procurarFotoPerfilPorId(id);

    if (!resultado || !resultado.foto) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Foto de perfil não encontrada."
      });
    }

    res.setHeader(
      "Content-Type",
      resultado.tipo || "image/jpeg"
    );

    res.setHeader(
      "Content-Length",
      resultado.foto.length
    );

    res.setHeader(
      "Cache-Control",
      "private, max-age=3600"
    );

    return res.status(200).send(resultado.foto);
  } catch (erro) {
    console.error(
      "Erro ao carregar foto de perfil:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao carregar a foto de perfil."
    });
  }
}

async function obterFotoBI(req, res) {
  try {
    const { id } = req.params;

    const resultado =
      await residenteModel.procurarFotoBIPorId(id);

    if (!resultado || !resultado.foto) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Foto do BI não encontrada."
      });
    }

    res.setHeader(
      "Content-Type",
      resultado.tipo || "image/jpeg"
    );

    res.setHeader(
      "Content-Length",
      resultado.foto.length
    );

    res.setHeader(
      "Cache-Control",
      "private, max-age=3600"
    );

    return res.status(200).send(resultado.foto);
  } catch (erro) {
    console.error(
      "Erro ao carregar foto do BI:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao carregar a foto do BI."
    });
  }
}

async function aprovarFotos(req, res) {
  try {
    const id =
      req.body.id ||
      req.body.residenteId ||
      req.body.residente_id;

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const resultado =
      await residenteModel.aprovarFotos(id);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    await auditoriaModel.registarAcao({
      adminId: req.admin.id,
      acao: "aprovar_fotos_legado",
      entidade: "residente",
      entidadeId: id,
      valoresNovos: { fotosAprovadas: true },
      ip: obterIp(req)
    });

    return res.status(200).json({
      sucesso: true,
      mensagem: "Fotos aprovadas com sucesso.",
      residenteId: id
    });
  } catch (erro) {
    console.error(
      "Erro ao aprovar fotos:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao aprovar as fotos."
    });
  }
}

async function rejeitarFotos(req, res) {
  try {
    const id =
      req.body.id ||
      req.body.residenteId ||
      req.body.residente_id;

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const resultado =
      await residenteModel.rejeitarFotos(id);

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    await auditoriaModel.registarAcao({
      adminId: req.admin.id,
      acao: "rejeitar_fotos_legado",
      entidade: "residente",
      entidadeId: id,
      valoresNovos: { fotosAprovadas: false, fotosRemovidas: true },
      ip: obterIp(req)
    });

    return res.status(200).json({
      sucesso: true,
      mensagem: "Fotos rejeitadas e removidas com sucesso.",
      residenteId: id
    });
  } catch (erro) {
    console.error(
      "Erro ao rejeitar fotos:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao rejeitar as fotos."
    });
  }
}

async function listarPedidosCartao(req, res) {
  try {
    const pedidos = await residenteModel.listarPedidosCartao();

    return res.status(200).json({
      sucesso: true,
      total: pedidos.length,
      pedidos: pedidos.map((pedido) => ({
        id: pedido.id,
        nome: pedido.nome,
        username: pedido.username,
        email: pedido.email || "",
        telefone: pedido.telefone || "",
        pacote: pedido.pacote || "",
        uid: pedido.uid || "",
        pedidoCartao: Boolean(pedido.pedidoCartao),
        estadoPedidoCartao: pedido.estadoPedidoCartao || "",
        cartaoGerado: Boolean(pedido.cartaoGerado),
        criadoEm: pedido.criadoEm,
        fotoPerfilTipo: pedido.fotoPerfilTipo || "",
        temFotoPerfil: Boolean(pedido.temFotoPerfil)
      }))
    });
  } catch (erro) {
    console.error("Erro ao listar pedidos de cartão:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao listar os pedidos de cartão."
    });
  }
}

async function aprovarPedidoCartao(req, res) {
  try {
    const id = req.params?.id || req.body?.id || req.body?.residenteId;

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const pedido = await residenteModel.consultarPedidoCartao(id);

    if (!pedido) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const pendente = Number(pedido.pedidoCartao) === 1 && pedido.estadoPedidoCartao === "pendente";

    if (!pendente) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "O pedido de cartão não está pendente."
      });
    }

    const resultado = await residenteModel.aprovarPedidoCartao(id);

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Não foi possível aprovar o pedido de cartão."
      });
    }

    await auditoriaModel.registarAcao({
      adminId: req.admin.id,
      acao: "aprovar_pedido_cartao",
      entidade: "residente",
      entidadeId: id,
      valoresAnteriores: { estadoPedidoCartao: pedido.estadoPedidoCartao },
      valoresNovos: { estadoPedidoCartao: "aprovado" },
      ip: obterIp(req)
    });

    return res.status(200).json({
      sucesso: true,
      mensagem: "Pedido de cartão aprovado com sucesso.",
      residenteId: id,
      estadoPedidoCartao: "aprovado",
      cartaoGerado: false
    });
  } catch (erro) {
    console.error("Erro ao aprovar pedido de cartão:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao aprovar o pedido de cartão."
    });
  }
}

async function rejeitarPedidoCartao(req, res) {
  try {
    const id = req.params?.id || req.body?.id || req.body?.residenteId;

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const pedido = await residenteModel.consultarPedidoCartao(id);

    if (!pedido) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const pendente = Number(pedido.pedidoCartao) === 1 && pedido.estadoPedidoCartao === "pendente";

    if (!pendente) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "O pedido de cartão não está pendente."
      });
    }

    const resultado = await residenteModel.rejeitarPedidoCartao(id);

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Não foi possível rejeitar o pedido de cartão."
      });
    }

    await auditoriaModel.registarAcao({
      adminId: req.admin.id,
      acao: "rejeitar_pedido_cartao",
      entidade: "residente",
      entidadeId: id,
      valoresAnteriores: { estadoPedidoCartao: pedido.estadoPedidoCartao },
      valoresNovos: { estadoPedidoCartao: "rejeitado" },
      motivo: req.body?.motivo || null,
      ip: obterIp(req)
    });

    return res.status(200).json({
      sucesso: true,
      mensagem: "Pedido de cartão rejeitado com sucesso.",
      residenteId: id,
      estadoPedidoCartao: "rejeitado",
      cartaoGerado: false
    });
  } catch (erro) {
    console.error("Erro ao rejeitar pedido de cartão:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao rejeitar o pedido de cartão."
    });
  }
}

async function marcarCartaoComoGerado(req, res) {
  try {
    const id = req.params?.id || req.body?.id || req.body?.residenteId;
    const uid = req.body?.uid;

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const pedido = await residenteModel.consultarPedidoCartao(id);

    if (!pedido) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const isAprovado = Number(pedido.pedidoCartao) === 1 && pedido.estadoPedidoCartao === "aprovado";

    if (!isAprovado) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "O pedido de cartão ainda não foi aprovado."
      });
    }

    if (Number(pedido.cartaoGerado) === 1) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "O cartão deste residente já foi gerado."
      });
    }

    const resultado = await residenteModel.marcarCartaoComoGerado(id, uid);

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Não foi possível marcar o cartão como gerado."
      });
    }

    await auditoriaModel.registarAcao({
      adminId: req.admin.id,
      acao: "marcar_cartao_gerado",
      entidade: "residente",
      entidadeId: id,
      valoresAnteriores: { cartaoGerado: Boolean(pedido.cartaoGerado) },
      valoresNovos: {
        cartaoGerado: true,
        uid: typeof uid === "string" ? uid.trim() : ""
      },
      ip: obterIp(req)
    });

    return res.status(200).json({
      sucesso: true,
      mensagem: "Cartão marcado como gerado com sucesso.",
      residenteId: id,
      estadoPedidoCartao: "aprovado",
      cartaoGerado: true,
      uid: typeof uid === "string" ? uid.trim() : ""
    });
  } catch (erro) {
    console.error("Erro ao marcar cartão como gerado:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao marcar o cartão como gerado."
    });
  }
}

async function consultarPermissoesResidente(req, res) {
  try {
    const id = obterResidenteId(req);

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const residente =
      await residenteModel.consultarPermissoes(id);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    return res.status(200).json({
      sucesso: true,
      permissoes: {
        residenteId: residente.id,
        nome: residente.nome,
        username: residente.username,
        pacote: residente.pacote || "",
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        parking: Boolean(residente.parking),
        eventos: Boolean(residente.eventos),
        estado: residente.estado || ""
      }
    });
  } catch (erro) {
    console.error(
      "Erro ao consultar permissões do residente:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao consultar as permissões do residente."
    });
  }
}

async function atualizarPermissoesResidente(req, res) {
  try {
    const id = obterResidenteId(req);

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const residente =
      await residenteModel.consultarPermissoes(id);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const parking = req.body?.parking;
    const eventos = req.body?.eventos;

    if (parking === undefined && eventos === undefined) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Envia pelo menos uma permissão para atualizar."
      });
    }

    const permissoes = {
      parking:
        parking !== undefined
          ? parking
          : Boolean(residente.parking),

      eventos:
        eventos !== undefined
          ? eventos
          : Boolean(residente.eventos)
    };

    const resultado =
      await residenteModel.atualizarPermissoes(
        id,
        permissoes
      );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem:
          "Não foi possível atualizar as permissões."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "Permissões atualizadas com sucesso.",
      residenteId: id,
      parking:
        permissoes.parking === true ||
        permissoes.parking === 1 ||
        permissoes.parking === "1",
      eventos:
        permissoes.eventos === true ||
        permissoes.eventos === 1 ||
        permissoes.eventos === "1"
    });
  } catch (erro) {
    console.error(
      "Erro ao atualizar permissões:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao atualizar as permissões."
    });
  }
}

async function definirSwipesResidente(req, res) {
  try {
    const id = obterResidenteId(req);

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const quantidade =
      req.body?.quantidade ??
      req.body?.swipes;

    if (
      quantidade === undefined ||
      quantidade === null ||
      quantidade === ""
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "A quantidade de swipes é obrigatória."
      });
    }

    const quantidadeNumerica = Number(quantidade);

    if (!Number.isFinite(quantidadeNumerica)) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "A quantidade de swipes deve ser numérica."
      });
    }

    if (quantidadeNumerica < 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "A quantidade de swipes não pode ser negativa."
      });
    }

    const residente =
      await residenteModel.consultarPermissoes(id);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const resultado =
      await residenteModel.definirSwipes(
        id,
        quantidadeNumerica
      );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem:
          "Não foi possível definir os swipes."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem:
        "Quantidade de swipes atualizada com sucesso.",
      residenteId: id,
      swipes: Number(resultado.swipes || 0)
    });
  } catch (erro) {
    console.error(
      "Erro ao definir swipes:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao definir os swipes."
    });
  }
}

async function gerarCartaoLegado(req, res) {
  try {
    const { id, uid } = req.body || {};

    if (!id || !uid) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID ou UID em falta."
      });
    }

    const uidMaiusculo = String(uid).toUpperCase();

    const resultado = await residenteModel.gerarCartaoLegado(
      id,
      uidMaiusculo
    );

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    await auditoriaModel.registarAcao({
      adminId: req.admin.id,
      acao: "gerar_cartao_legado",
      entidade: "residente",
      entidadeId: id,
      valoresNovos: { uid: uidMaiusculo },
      ip: obterIp(req)
    });

    return res.status(200).json({
      sucesso: true,
      mensagem:
        "Cartão gerado com sucesso. Leitor RFID pronto para novo cartão.",
      id,
      uid: uidMaiusculo
    });
  } catch (erro) {
    console.error(
      "Erro ao gerar cartão (legado):",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao gerar o cartão."
    });
  }
}

module.exports = {
  listarResidentes,
  obterFotoPerfil,
  obterFotoBI,
  aprovarFotos,
  rejeitarFotos,
  listarPedidosCartao,
  aprovarPedidoCartao,
  rejeitarPedidoCartao,
  marcarCartaoComoGerado,
  consultarPermissoesResidente,
  atualizarPermissoesResidente,
  definirSwipesResidente,
  gerarCartaoLegado
};