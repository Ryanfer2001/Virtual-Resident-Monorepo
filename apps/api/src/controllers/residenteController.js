const residenteModel = require("../models/residenteModel");
const crypto = require("crypto");

function limparBase64(valor) {
  if (!valor || typeof valor !== "string") {
    return "";
  }

  if (valor.includes(",")) {
    return valor.split(",").pop();
  }

  return valor;
}

function converterParaBuffer(valor) {
  const base64Limpo = limparBase64(valor);

  if (!base64Limpo) {
    return null;
  }

  return Buffer.from(base64Limpo, "base64");
}

/*
 * Só aceita JPEG/PNG/WebP — nunca SVG (pode conter <script>/markup ativo).
 * O MIME type declarado pelo cliente nunca é confiado sozinho: a
 * assinatura binária (magic bytes) tem de bater certo com o tipo pedido,
 * para impedir um ficheiro disfarçado de imagem com um Content-Type falso.
 */
const TIPOS_MIME_PERMITIDOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

function assinaturaBinariaValida(buffer, tipoMime) {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  if (tipoMime === "image/jpeg") {
    return (
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
    );
  }

  if (tipoMime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  if (tipoMime === "image/webp") {
    return (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return false;
}

function validarImagem(buffer, tipoMime) {
  if (!buffer) {
    return null;
  }

  if (!TIPOS_MIME_PERMITIDOS.has(tipoMime)) {
    return "Tipo de imagem não suportado. Usa JPEG, PNG ou WebP.";
  }

  if (!assinaturaBinariaValida(buffer, tipoMime)) {
    return "O ficheiro enviado não corresponde a uma imagem válida.";
  }

  return null;
}

function obterResidenteId(req) {
  return (
    req.usuario?.id ||
    req.user?.id ||
    req.utilizador?.id ||
    req.body?.id ||
    req.body?.residenteId ||
    req.params?.id ||
    req.query?.id ||
    req.query?.residenteId ||
    ""
  );
}

async function atualizarFotos(req, res) {
  try {
    const dados = req.body || {};

    const id =
      dados.id ||
      dados.residenteId ||
      dados.residente_id;

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const fotoPerfilEntrada =
      dados.fotoPerfilBase64 ||
      dados.fotoPerfil ||
      dados.foto_perfil ||
      "";

    const fotoBIEntrada =
      dados.fotoBIBase64 ||
      dados.fotoBiBase64 ||
      dados.fotoBI ||
      dados.fotoBi ||
      dados.foto_bi ||
      "";

    const fotoCartaoEntrada =
      dados.fotoCartaoBase64 ||
      dados.foto_cartao ||
      "";

    const fotoPerfilTipo =
      dados.fotoPerfilTipo ||
      dados.foto_perfil_tipo ||
      "image/jpeg";

    const fotoBITipo =
      dados.fotoBITipo ||
      dados.fotoBiTipo ||
      dados.foto_bi_tipo ||
      "image/jpeg";

    const fotoCartaoTipo =
      dados.fotoCartaoTipo ||
      dados.foto_cartao_tipo ||
      "image/jpeg";

    const removerFotoPerfil =
      dados.removerFotoPerfil === true ||
      dados.removerFotoPerfil === 1 ||
      dados.removerFotoPerfil === "1";

    let fotoPerfilBuffer = null;
    let fotoBIBuffer = null;
    let fotoCartaoBuffer = null;

    try {
      fotoPerfilBuffer =
        converterParaBuffer(fotoPerfilEntrada);

      fotoBIBuffer =
        converterParaBuffer(fotoBIEntrada);

      fotoCartaoBuffer =
        converterParaBuffer(fotoCartaoEntrada);
    } catch (erro) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Imagem inválida. Envia a foto em Base64."
      });
    }

    if (
      !fotoPerfilBuffer &&
      !fotoBIBuffer &&
      !fotoCartaoBuffer &&
      !removerFotoPerfil
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nenhuma foto foi enviada."
      });
    }

    const limiteBytes = 2 * 1024 * 1024;

    for (const [buffer, nomeAmigavel] of [
      [fotoPerfilBuffer, "de perfil"],
      [fotoBIBuffer, "do BI"],
      [fotoCartaoBuffer, "do cartão"]
    ]) {
      if (buffer && buffer.length > limiteBytes) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `A foto ${nomeAmigavel} é muito pesada. Usa menos de 2 MB.`
        });
      }
    }

    for (const [buffer, tipoMime, nomeAmigavel] of [
      [fotoPerfilBuffer, fotoPerfilTipo, "de perfil"],
      [fotoBIBuffer, fotoBITipo, "do BI"],
      [fotoCartaoBuffer, fotoCartaoTipo, "do cartão"]
    ]) {
      const erroValidacao = validarImagem(buffer, tipoMime);

      if (erroValidacao) {
        return res.status(400).json({
          sucesso: false,
          mensagem: `Foto ${nomeAmigavel}: ${erroValidacao}`
        });
      }
    }

    const resultado =
      await residenteModel.atualizarFotos({
        id,
        fotoPerfilBuffer,
        fotoPerfilTipo,
        fotoBIBuffer,
        fotoBITipo,
        fotoCartaoBuffer,
        fotoCartaoTipo,
        removerFotoPerfil
      });

    if (resultado.nenhumaAlteracao) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nenhuma alteração foi feita."
      });
    }

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    let mensagem =
      "Foto atualizada com sucesso.";

    if (fotoCartaoBuffer) {
      mensagem =
        "Foto do cartão atualizada com sucesso. Fica pendente de confirmação do administrador.";
    }

    if (fotoBIBuffer) {
      mensagem =
        "Foto do BI enviada com sucesso. Agora aguarda confirmação do administrador.";
    }

    if (
      (fotoPerfilBuffer || removerFotoPerfil) &&
      !fotoBIBuffer &&
      !fotoCartaoBuffer
    ) {
      mensagem =
        "Foto de perfil atualizada com sucesso.";
    }

    return res.status(200).json({
      sucesso: true,
      mensagem,
      residenteId: id,
      alterouBI: Boolean(fotoBIBuffer),
      alterouCartao: Boolean(fotoCartaoBuffer),
      alterouPerfil: Boolean(
        fotoPerfilBuffer || removerFotoPerfil
      )
    });
  } catch (erro) {
    console.error(
      "Erro ao atualizar fotos:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        "Erro interno ao atualizar as fotos."
    });
  }
}

async function solicitarCartao(req, res) {
  try {
    const id =
      req.usuario?.id ||
      req.user?.id ||
      req.body?.id ||
      req.body?.residenteId ||
      req.params?.id;

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

    const pedidoPendente =
      Number(pedido.pedidoCartao) === 1 &&
      pedido.estadoPedidoCartao === "pendente";

    if (pedidoPendente) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Já existe um pedido de cartão pendente."
      });
    }

    const aprovadoOuGerado =
      pedido.estadoPedidoCartao === "aprovado" ||
      Number(pedido.cartaoGerado) === 1;

    if (aprovadoOuGerado) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "O cartão deste residente já foi aprovado ou gerado."
      });
    }

    const resultado = await residenteModel.solicitarCartao(id);

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Não foi possível criar o pedido de cartão."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "Pedido de cartão enviado com sucesso.",
      residenteId: id,
      estadoPedidoCartao: "pendente"
    });
  } catch (erro) {
    console.error("Erro ao solicitar cartão:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao solicitar o cartão."
    });
  }
}

async function consultarPedidoCartao(req, res) {
  try {
    const id =
      req.usuario?.id ||
      req.user?.id ||
      req.params?.id ||
      req.query?.id ||
      req.query?.residenteId;

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

    return res.status(200).json({
      sucesso: true,
      pedido: {
        residenteId: pedido.id,
        nome: pedido.nome,
        username: pedido.username,
        pedidoCartao: Boolean(pedido.pedidoCartao),
        estadoPedidoCartao: pedido.estadoPedidoCartao || "",
        cartaoGerado: Boolean(pedido.cartaoGerado),
        uid: pedido.uid || ""
      }
    });
  } catch (erro) {
    console.error("Erro ao consultar pedido de cartão:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao consultar o pedido de cartão."
    });
  }
}

async function cancelarPedidoCartao(req, res) {
  try {
    const id =
      req.usuario?.id ||
      req.user?.id ||
      req.body?.id ||
      req.body?.residenteId ||
      req.params?.id;

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

    const pedidoPendente =
      Number(pedido.pedidoCartao) === 1 &&
      pedido.estadoPedidoCartao === "pendente";

    if (!pedidoPendente) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Não existe um pedido de cartão pendente para cancelar."
      });
    }

    const resultado = await residenteModel.cancelarPedidoCartao(id);

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Não foi possível cancelar o pedido de cartão."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "Pedido de cartão cancelado com sucesso.",
      residenteId: id,
      estadoPedidoCartao: "cancelado"
    });
  } catch (erro) {
    console.error("Erro ao cancelar pedido de cartão:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao cancelar o pedido de cartão."
    });
  }
}

async function consultarQR(req, res) {
  try {
    const id = obterResidenteId(req);

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const residente = await residenteModel.consultarQRPorResidente(id);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    return res.status(200).json({
      sucesso: true,
      qr: {
        residenteId: residente.id,
        nome: residente.nome,
        username: residente.username,
        qrToken: residente.qrToken || "",
        qrAtivo: Boolean(residente.qrAtivo)
      }
    });
  } catch (erro) {
    console.error("Erro ao consultar QR Code:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao consultar o QR Code."
    });
  }
}

async function gerarQR(req, res) {
  try {
    const id = obterResidenteId(req);

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const residente = await residenteModel.consultarQRPorResidente(id);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const qrToken = crypto.randomBytes(32).toString("hex");

    const resultado = await residenteModel.guardarQRToken(id, qrToken);

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Não foi possível gerar o QR Code."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "QR Code gerado e ativado com sucesso.",
      residenteId: id,
      qrToken,
      qrAtivo: true
    });
  } catch (erro) {
    console.error("Erro ao gerar QR Code:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao gerar o QR Code."
    });
  }
}

async function desativarQR(req, res) {
  try {
    const id = obterResidenteId(req);

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const residente = await residenteModel.consultarQRPorResidente(id);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    if (!residente.qrAtivo) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "O QR Code deste residente já está desativado."
      });
    }

    const resultado = await residenteModel.desativarQR(id);

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Não foi possível desativar o QR Code."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "QR Code desativado com sucesso.",
      residenteId: id,
      qrAtivo: false
    });
  } catch (erro) {
    console.error("Erro ao desativar QR Code:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao desativar o QR Code."
    });
  }
}

async function validarQR(req, res) {
  try {
    const qrToken =
      req.body?.qrToken ||
      req.body?.token ||
      req.params?.qrToken ||
      req.query?.qrToken ||
      req.query?.token ||
      "";

    const tokenNormalizado =
      typeof qrToken === "string"
        ? qrToken.trim()
        : "";

    if (!tokenNormalizado) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Token do QR Code é obrigatório."
      });
    }

    const residente = await residenteModel.validarQRToken(tokenNormalizado);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        valido: false,
        mensagem: "QR Code inválido ou desativado."
      });
    }

    return res.status(200).json({
      sucesso: true,
      valido: true,
      mensagem: "QR Code válido.",
      residente: {
        id: residente.id,
        nome: residente.nome,
        username: residente.username,
        pacote: residente.pacote || "",
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        parking: Boolean(residente.parking),
        eventos: Boolean(residente.eventos),
        estado: residente.estado || "",
        qrAtivo: Boolean(residente.qrAtivo)
      }
    });
  } catch (erro) {
    console.error("Erro ao validar QR Code:", erro.message);

    return res.status(500).json({
      sucesso: false,
      valido: false,
      mensagem: "Erro interno ao validar o QR Code."
    });
  }
}

async function consultarPermissoes(req, res) {
  try {
    const id = obterResidenteId(req);

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const residente = await residenteModel.consultarPermissoes(id);

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
    console.error("Erro ao consultar permissões:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao consultar as permissões."
    });
  }
}

async function consumirSwipe(req, res) {
  try {
    const id = obterResidenteId(req);

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente é obrigatório."
      });
    }

    const resultado = await residenteModel.consumirSwipe(id);

    if (!resultado.sucesso) {
      if (resultado.motivo === "residente_nao_encontrado") {
        return res.status(404).json({
          sucesso: false,
          mensagem: "Residente não encontrado."
        });
      }

      if (resultado.motivo === "residente_inativo") {
        return res.status(403).json({
          sucesso: false,
          mensagem: "O residente não está ativo.",
          swipes: Number(resultado.swipes || 0)
        });
      }

      if (resultado.motivo === "sem_swipes") {
        return res.status(409).json({
          sucesso: false,
          mensagem: "O residente não tem swipes disponíveis.",
          swipes: 0
        });
      }

      return res.status(409).json({
        sucesso: false,
        mensagem: "Não foi possível consumir o swipe."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "Swipe consumido com sucesso.",
      residenteId: id,
      swipesAnteriores: Number(resultado.swipesAnteriores || 0),
      swipesRestantes: Number(resultado.swipesRestantes || 0)
    });
  } catch (erro) {
    console.error("Erro ao consumir swipe:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao consumir o swipe."
    });
  }
}

async function validarCartaoResidenteLegado(req, res) {
  try {
    const uidEntrada = req.body?.uid;

    const uid =
      typeof uidEntrada === "string" || typeof uidEntrada === "number"
        ? String(uidEntrada).trim().toUpperCase()
        : "";

    if (!uid) {
      return res.status(400).json({
        permitido: false,
        mensagem: "UID em falta"
      });
    }

    const residente = await residenteModel.procurarPorUid(uid);

    if (!residente) {
      return res.status(404).json({
        permitido: false,
        mensagem: "Cartão não encontrado"
      });
    }

    if (String(residente.estado || "").toLowerCase() !== "ativo") {
      return res.status(200).json({
        permitido: false,
        mensagem: "Cartão não ativo",
        residente: residente.nome,
        pacote: residente.pacote,
        estado: residente.estado
      });
    }

    return res.status(200).json({
      permitido: true,
      mensagem: "Entrada no evento autorizada",
      residente: residente.nome,
      pacote: residente.pacote,
      saldo: Number(residente.saldo || 0),
      swipes: Number(residente.swipes || 0),
      uid: residente.uid,
      estado: residente.estado
    });
  } catch (erro) {
    console.error(
      "Erro ao validar cartão do residente (legado):",
      erro.message
    );

    return res.status(500).json({
      permitido: false,
      mensagem: "Erro interno ao validar o cartão."
    });
  }
}

async function validarQRResidenteLegado(req, res) {
  try {
    const qrTokenEntrada = req.body?.qrToken;

    const qrToken =
      typeof qrTokenEntrada === "string" ? qrTokenEntrada.trim() : "";

    if (!qrToken) {
      return res.status(400).json({
        permitido: false,
        mensagem: "QR Token em falta"
      });
    }

    const residente = await residenteModel.procurarPorQRTokenLegado(
      qrToken
    );

    if (!residente) {
      return res.status(404).json({
        permitido: false,
        mensagem: "QR não encontrado"
      });
    }

    const uidResidente = residente.uid || "Sem cartão";

    if (!residente.qrAtivo) {
      return res.status(200).json({
        permitido: false,
        mensagem: "QR inativo",
        residente: residente.nome,
        pacote: residente.pacote,
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        estado: residente.estado,
        uid: uidResidente
      });
    }

    const eventosPermitidos = Boolean(residente.eventos);

    return res.status(200).json({
      permitido: eventosPermitidos,
      mensagem: eventosPermitidos
        ? "Entrada por QR autorizada"
        : "Sem acesso a eventos",
      residente: residente.nome,
      pacote: residente.pacote,
      saldo: Number(residente.saldo || 0),
      swipes: Number(residente.swipes || 0),
      estado: residente.estado,
      uid: uidResidente,
      documento: residente.documento,
      telefone: residente.telefone,
      email: residente.email,
      nacionalidade: residente.nacionalidade,
      municipio: residente.municipio,
      pedidoCartao: Boolean(residente.pedidoCartao),
      estadoPedidoCartao: residente.estadoPedidoCartao
    });
  } catch (erro) {
    console.error(
      "Erro ao validar QR do residente (legado):",
      erro.message
    );

    return res.status(500).json({
      permitido: false,
      mensagem: "Erro interno ao validar o QR do residente."
    });
  }
}

async function solicitarCartaoLegado(req, res) {
  try {
    const id = req.body?.id;

    if (!id) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "ID do residente em falta."
      });
    }

    const resultado = await residenteModel.solicitarCartaoLegado(id);

    if (!resultado || resultado.affectedRows === 0) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    const residente = await residenteModel.procurarPorId(id);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "Pedido de cartão enviado com sucesso.",
      residente
    });
  } catch (erro) {
    console.error(
      "Erro ao solicitar cartão (legado):",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao solicitar o cartão."
    });
  }
}

module.exports = {
  atualizarFotos,
  solicitarCartao,
  consultarPedidoCartao,
  cancelarPedidoCartao,
  consultarQR,
  gerarQR,
  desativarQR,
  validarQR,
  consultarPermissoes,
  consumirSwipe,
  validarCartaoResidenteLegado,
  validarQRResidenteLegado,
  solicitarCartaoLegado
};