const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const residenteModel = require("../models/residenteModel");

/*
 * Compatibilidade temporária com residentes antigos, cujas passwords
 * ainda estão guardadas em texto simples (identificadas pela ausência
 * do prefixo bcrypt $2a$/$2b$/$2y$).
 */
async function verificarPassword(passwordFornecida, passwordGuardada) {
  const valorGuardado = passwordGuardada || "";

  const passwordUsaBcrypt =
    valorGuardado.startsWith("$2a$") ||
    valorGuardado.startsWith("$2b$") ||
    valorGuardado.startsWith("$2y$");

  if (passwordUsaBcrypt) {
    return bcrypt.compare(passwordFornecida, valorGuardado);
  }

  return passwordFornecida === valorGuardado;
}

function assinarTokenResidente(residente) {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET não está configurada no ficheiro .env."
    );
  }

  return jwt.sign(
    {
      id: residente.id,
      username: residente.username
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "8h"
    }
  );
}

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Username e password são obrigatórios."
      });
    }

    const usernameLimpo = username.trim();

    const residente = await residenteModel.procurarPorUsername(
      usernameLimpo
    );

    if (!residente) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Username ou password incorretos."
      });
    }

    const passwordValida = await verificarPassword(
      password,
      residente.password
    );

    if (!passwordValida) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Username ou password incorretos."
      });
    }

    const token = assinarTokenResidente(residente);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Login feito com sucesso",
      token,
      residente: {
        id: residente.id,
        nome: residente.nome,
        username: residente.username,
        dataNascimento: residente.dataNascimento,
        nacionalidade: residente.nacionalidade,
        documento: residente.documento,
        telefone: residente.telefone,
        email: residente.email,
        morada: residente.morada,
        municipio: residente.municipio,

        pacote: residente.pacote,
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        eventos: Boolean(residente.eventos),
        parking: Boolean(residente.parking),

        uid: residente.uid || "",
        cartaoGerado: Boolean(residente.cartaoGerado),

        qrToken: residente.qrToken,
        qrAtivo: Boolean(residente.qrAtivo),

        pedidoCartao: Boolean(residente.pedidoCartao),
        estadoPedidoCartao:
          residente.estadoPedidoCartao || "não solicitado",

        estado: residente.estado || "pendente",
        pagamentoStatus:
          residente.pagamentoStatus || "sem informação",
        ultimos4Cartao: residente.ultimos4Cartao || "",
        valorPago: Number(residente.valorPago || 0),

        fotoPerfilBase64:
          residente.fotoPerfilBase64 || "",
        fotoPerfilTipo:
          residente.fotoPerfilTipo || "",
        fotosAprovadas:
          Boolean(residente.fotosAprovadas)
      }
    });
  } catch (erro) {
    console.error("Erro no login:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao efetuar login."
    });
  }
}

async function obterPerfil(req, res) {
  try {
    const residente = await residenteModel.procurarPorId(
      req.utilizador.id
    );

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: "Perfil carregado com sucesso.",
      residente: {
        ...residente,
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        parking: Boolean(residente.parking),
        eventos: Boolean(residente.eventos),
        pedidoCartao: Boolean(residente.pedidoCartao),
        cartaoGerado: Boolean(residente.cartaoGerado),
        qrAtivo: Boolean(residente.qrAtivo),
        valorPago: Number(residente.valorPago || 0),
        fotosAprovadas: Boolean(residente.fotosAprovadas)
      }
    });
  } catch (erro) {
    console.error("Erro ao carregar perfil:", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao carregar o perfil."
    });
  }
}

async function registar(req, res) {
  try {
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
      pacote
    } = req.body;

    if (
      !nome ||
      !username ||
      !password ||
      !dataNascimento ||
      !nacionalidade ||
      !documento
    ) {
      return res.status(400).json({
        sucesso: false,
        mensagem:
          "Preencha nome, username, password, data de nascimento, nacionalidade e documento."
      });
    }

    const nomeLimpo = nome.trim();
    const usernameLimpo = username.trim();
    const emailLimpo = email
      ? email.trim().toLowerCase()
      : "";

    if (nomeLimpo.length < 2) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "O nome deve ter pelo menos 2 caracteres."
      });
    }

    if (usernameLimpo.length < 3) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "O username deve ter pelo menos 3 caracteres."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "A password deve ter pelo menos 6 caracteres."
      });
    }

    const usernameJaExiste =
      await residenteModel.usernameExiste(usernameLimpo);

    if (usernameJaExiste) {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Este username já está registado."
      });
    }

    if (emailLimpo) {
      const emailJaExiste =
        await residenteModel.emailExiste(emailLimpo);

      if (emailJaExiste) {
        return res.status(409).json({
          sucesso: false,
          mensagem: "Este email já está registado."
        });
      }
    }

    const pacoteFinal = pacote || "inativo";

    /*
     * Mapa dos pacotes/sub-planos definidos em apps/web/lib/pacotes.ts.
     * "Pacote 1/2/3" ficam mantidos por compatibilidade com registos
     * antigos que ainda possam enviar esses valores.
     */
    const CONFIGURACAO_PACOTES = {
      "Pacote 1": { saldo: 0, swipes: 0, eventos: true, parking: false },
      "Pacote 2": { saldo: 20000, swipes: 50, eventos: true, parking: false },
      "Pacote 3": { saldo: 40000, swipes: 80, eventos: true, parking: true },

      "Visitor Básico": { saldo: 0, swipes: 0, eventos: true, parking: false },
      "Visitor Standard": { saldo: 0, swipes: 0, eventos: false, parking: false },
      "Visitor Plus": { saldo: 0, swipes: 0, eventos: true, parking: false },

      "Diaspora Start": { saldo: 2500, swipes: 20, eventos: false, parking: false },
      "Diaspora Completo": { saldo: 5000, swipes: 50, eventos: true, parking: false },
      "Diaspora Premium": { saldo: 10000, swipes: 999999, eventos: true, parking: false },

      "Business Starter": { saldo: 0, swipes: 0, eventos: false, parking: false },
      "Business Growth": { saldo: 0, swipes: 0, eventos: false, parking: false },
      "Business Elite": { saldo: 0, swipes: 0, eventos: false, parking: false },

      "Student Essencial": { saldo: 0, swipes: 0, eventos: false, parking: false },
      "Student Ativo": { saldo: 0, swipes: 0, eventos: false, parking: false },
      "Student Pro": { saldo: 0, swipes: 0, eventos: false, parking: false }
    };

    const {
      saldo,
      swipes,
      eventos,
      parking
    } = CONFIGURACAO_PACOTES[pacoteFinal] || {
      saldo: 0,
      swipes: 0,
      eventos: false,
      parking: false
    };

    const qrToken =
      "QR-" +
      Date.now() +
      "-" +
      Math.floor(Math.random() * 999999);

    const passwordHash = await bcrypt.hash(password, 12);

    await residenteModel.criarResidente({
      nome: nomeLimpo,
      username: usernameLimpo,
      password: passwordHash,
      dataNascimento,
      nacionalidade,
      documento,
      telefone: telefone || "",
      email: emailLimpo,
      morada: morada || "",
      municipio: municipio || "",
      pais: pais || "",
      codigoPostal: codigoPostal || "",
      pacote: pacoteFinal,
      saldo,
      swipes,
      parking,
      eventos,
      qrToken,
      uid: "",
      estado: "pendente",
      pedidoCartao: false,
      estadoPedidoCartao: "não solicitado"
    });

    const residenteCriado =
      await residenteModel.procurarPorUsername(usernameLimpo);

    return res.status(201).json({
      sucesso: true,
      mensagem:
        "Registo bem-sucedido. Já podes fazer login e usar a tua conta.",
      residenteId: residenteCriado?.id || null,
      residente: residenteCriado
        ? {
            id: residenteCriado.id,
            nome: residenteCriado.nome,
            username: residenteCriado.username,
            email: residenteCriado.email,
            pacote: residenteCriado.pacote,
            saldo: Number(residenteCriado.saldo || 0),
            swipes: Number(residenteCriado.swipes || 0),
            eventos: Boolean(residenteCriado.eventos),
            parking: Boolean(residenteCriado.parking),
            qrToken: residenteCriado.qrToken,
            estado: residenteCriado.estado,
            pedidoCartao: Boolean(
              residenteCriado.pedidoCartao
            ),
            estadoPedidoCartao:
              residenteCriado.estadoPedidoCartao
          }
        : null
    });
  } catch (erro) {
    console.error("Erro no registo:", erro.message);

    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Já existe um residente com estes dados."
      });
    }

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao registar o residente."
    });
  }
}

async function loginLegado(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Username ou password em falta."
      });
    }

    const usernameLimpo = String(username).trim();

    const residente = await residenteModel.procurarPorUsername(
      usernameLimpo
    );

    if (!residente) {
      return res.status(401).json({
        sucesso: false,
        mensagem:
          "Login não reconhecido. Tenta novamente ou faz o teu registo."
      });
    }

    const passwordValida = await verificarPassword(
      password,
      residente.password
    );

    if (!passwordValida) {
      return res.status(401).json({
        sucesso: false,
        mensagem:
          "Login não reconhecido. Tenta novamente ou faz o teu registo."
      });
    }

    const token = assinarTokenResidente(residente);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Login feito com sucesso",
      token,
      residente: {
        id: residente.id,
        nome: residente.nome,
        username: residente.username,
        dataNascimento: residente.dataNascimento,
        nacionalidade: residente.nacionalidade,
        documento: residente.documento,
        telefone: residente.telefone,
        email: residente.email,
        morada: residente.morada,
        municipio: residente.municipio,

        pacote: residente.pacote,
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        eventos: Boolean(residente.eventos),
        parking: Boolean(residente.parking),

        uid: "",
        cartaoGerado: Boolean(residente.cartaoGerado),

        qrToken: residente.qrToken,
        qrAtivo: Boolean(residente.qrAtivo),

        pedidoCartao: Boolean(residente.pedidoCartao),
        estadoPedidoCartao:
          residente.estadoPedidoCartao || "não solicitado",

        estado: residente.estado || "pendente",
        pagamentoStatus:
          residente.pagamentoStatus || "sem informação",
        ultimos4Cartao: residente.ultimos4Cartao || "",
        valorPago: Number(residente.valorPago || 0),

        fotoPerfilBase64: residente.fotoPerfilBase64 || "",
        fotoPerfilTipo: residente.fotoPerfilTipo || "",
        fotosAprovadas: residente.fotosAprovadas
      }
    });
  } catch (erro) {
    console.error("Erro no login (legado):", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao efetuar login."
    });
  }
}

async function googleLoginLegado(req, res) {
  try {
    const emailEntrada = req.body?.email;

    const email =
      typeof emailEntrada === "string"
        ? emailEntrada.trim().toLowerCase()
        : "";

    if (!email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Email em falta no pedido Google Login"
      });
    }

    const residenteBase = await residenteModel.procurarPorEmail(email);

    if (!residenteBase) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Conta não registada. Faça o registo normal primeiro."
      });
    }

    const residente = await residenteModel.procurarPorId(
      residenteBase.id
    );

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Conta não registada. Faça o registo normal primeiro."
      });
    }

    const token = assinarTokenResidente(residente);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Login com Google feito com sucesso",
      token,
      residente: {
        id: residente.id,
        nome: residente.nome,
        username: residente.username,
        email: residente.email,
        pacote: residente.pacote,
        saldo: Number(residente.saldo || 0),
        swipes: Number(residente.swipes || 0),
        parking: residente.parking,
        eventos: residente.eventos,
        qrToken: residente.qrToken,
        uid: residente.uid,
        estado: residente.estado
      }
    });
  } catch (erro) {
    console.error("Erro no Google Login (legado):", erro.message);

    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no login com Google."
    });
  }
}

module.exports = {
  login,
  obterPerfil,
  registar,
  loginLegado,
  googleLoginLegado
};