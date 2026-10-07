const sispService = require("../services/sispService");
const pagamentoModel = require("../models/pagamentoModel");
const catalogoPacotes = require("../config/catalogoPacotes");
const residenteModel = require("../models/residenteModel");
const crypto = require("crypto");
const emailService = require("../services/emailService");
const reciboService = require("../services/reciboService");

/*
|--------------------------------------------------------------------------
| Escapar valores antes de os inserir no HTML
|--------------------------------------------------------------------------
*/

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
|--------------------------------------------------------------------------
| Página de erro
|--------------------------------------------------------------------------
*/

function paginaErroPagamento(mensagem) {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    "https://noszona-monorepo-web.vercel.app";

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>Erro no pagamento</title>
</head>

<body
  style="
    font-family: Arial, sans-serif;
    background: #061827;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
  "
>
  <div
    style="
      background: white;
      color: #0f1f2e;
      padding: 40px;
      border-radius: 20px;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    "
  >
    <h1>Erro no pagamento</h1>

    <p style="color: #607080;">
      ${escaparHtml(mensagem)}
    </p>

    <a
      href="${escaparHtml(frontendUrl)}"
      style="
        display: inline-block;
        margin-top: 20px;
        background: #00c3e3;
        color: #061827;
        padding: 12px 22px;
        border-radius: 10px;
        text-decoration: none;
        font-weight: bold;
      "
    >
      Voltar à NOSZONA
    </a>
  </div>
</body>
</html>
  `;
}

/*
|--------------------------------------------------------------------------
| Página apresentada depois do retorno da SISP
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Cartão de recibo (HTML), incluído na página de retorno
|--------------------------------------------------------------------------
|
| `recibo` vem sempre de reciboService.construirRecibo — nunca contém
| PAN, FingerPrint, posAutCode ou qualquer segredo SISP. O bloco DCC só
| é desenhado quando `recibo.dcc` existir (ou seja, dcc === "Y" na
| resposta da SISP); caso contrário não aparece nada relacionado com
| DCC.
|--------------------------------------------------------------------------
*/

function cartaoRecibo(recibo) {
  if (!recibo) {
    return "";
  }

  const dataTransacaoFormatada = recibo.transacao.dataTransacao
    ? new Date(recibo.transacao.dataTransacao).toLocaleString(
        "pt-PT",
        { timeZone: "Atlantic/Cape_Verde" }
      )
    : "";

  const dataPrestacaoFormatada = recibo.transacao.dataPrestacaoServico
    ? new Date(recibo.transacao.dataPrestacaoServico).toLocaleString(
        "pt-PT",
        { timeZone: "Atlantic/Cape_Verde" }
      )
    : "";

  const blocoDcc = recibo.dcc
    ? `
      <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 10px;">
        <tr>
          <td style="padding: 4px 0; color: #607080;">Valor original</td>
          <td style="padding: 4px 0; text-align: right;">${escaparHtml(String(recibo.dcc.valorOriginalCVE))} CVE</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #607080;">Taxa de conversão / Currency Conversion Rate</td>
          <td style="padding: 4px 0; text-align: right;">1 ${escaparHtml(recibo.dcc.dccCurrency)} = ${escaparHtml(recibo.dcc.dccRate)} CVE</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #607080;">DCC Markup</td>
          <td style="padding: 4px 0; text-align: right;">${escaparHtml(recibo.dcc.dccMarkup)} %</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #607080;">Valor cobrado</td>
          <td style="padding: 4px 0; text-align: right;">${escaparHtml(recibo.dcc.dccAmount)} ${escaparHtml(recibo.dcc.dccCurrency)}</td>
        </tr>
      </table>

      <p style="font-size: 12px; color: #607080; margin-top: 10px;">
        ${recibo.dcc.avisos.map(escaparHtml).join("<br>")}
      </p>
    `
    : "";

  return `
    <div
      id="recibo"
      style="
        margin-top: 24px;
        text-align: left;
        border-top: 1px solid #e5e7eb;
        padding-top: 20px;
      "
    >
      <h3 style="margin: 0 0 12px; color: #0f1f2e;">Recibo</h3>

      <p style="margin: 2px 0;"><strong>${escaparHtml(recibo.comerciante.nome)}</strong></p>
      ${recibo.comerciante.telefone ? `<p style="margin: 2px 0; font-size: 13px; color: #607080;">Tel: ${escaparHtml(recibo.comerciante.telefone)}</p>` : ""}
      ${recibo.comerciante.email ? `<p style="margin: 2px 0; font-size: 13px; color: #607080;">${escaparHtml(recibo.comerciante.email)}</p>` : ""}
      ${recibo.comerciante.url ? `<p style="margin: 2px 0 14px; font-size: 13px; color: #607080;">${escaparHtml(recibo.comerciante.url)}</p>` : ""}

      <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
        <tr><td style="padding: 4px 0; color: #607080;">Cliente</td><td style="padding: 4px 0; text-align: right;">${escaparHtml(recibo.cliente.nome)}</td></tr>
        <tr><td style="padding: 4px 0; color: #607080;">Email</td><td style="padding: 4px 0; text-align: right;">${escaparHtml(recibo.cliente.email)}</td></tr>
        <tr><td style="padding: 4px 0; color: #607080;">Serviço</td><td style="padding: 4px 0; text-align: right;">${escaparHtml(recibo.transacao.descricao)}</td></tr>
        <tr><td style="padding: 4px 0; color: #607080;">Referência</td><td style="padding: 4px 0; text-align: right;">${escaparHtml(recibo.transacao.merchantRef)}</td></tr>
        <tr><td style="padding: 4px 0; color: #607080;">Data da transação</td><td style="padding: 4px 0; text-align: right;">${escaparHtml(dataTransacaoFormatada)}</td></tr>
        <tr><td style="padding: 4px 0; color: #607080;">Data de prestação do serviço</td><td style="padding: 4px 0; text-align: right;">${escaparHtml(dataPrestacaoFormatada)}</td></tr>
        <tr><td style="padding: 4px 0; color: #607080;">Valor</td><td style="padding: 4px 0; text-align: right;">${escaparHtml(String(recibo.transacao.valor))} CVE</td></tr>
        <tr><td style="padding: 4px 0; color: #607080;">Estado</td><td style="padding: 4px 0; text-align: right;"><strong>${escaparHtml(recibo.transacao.estado)}</strong></td></tr>
      </table>

      ${blocoDcc}

      <button
        type="button"
        class="no-print"
        onclick="window.print()"
        style="
          margin-top: 18px;
          width: 100%;
          background: #eef2f7;
          color: #0f1f2e;
          border: 1px solid #d7dee8;
          padding: 10px 16px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        "
      >
        Imprimir / Guardar recibo
      </button>
    </div>
  `;
}

function paginaRetornoPagamento({
  titulo,
  mensagem,
  sucesso,
  recibo
}) {
  const dashboardUrl =
    process.env.FRONTEND_DASHBOARD_URL ||
    "https://noszona-monorepo-web.vercel.app/dashboard";

  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>${escaparHtml(titulo)}</title>

  <style>
    @media print {
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>

<body
  style="
    font-family: Arial, sans-serif;
    background: #061827;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
  "
>
  <div
    style="
      background: white;
      color: #0f1f2e;
      padding: 40px;
      border-radius: 20px;
      max-width: 520px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    "
  >
    <h1>${escaparHtml(titulo)}</h1>

    <p style="color: #607080;">
      ${escaparHtml(mensagem)}
    </p>

    <a
      class="no-print"
      href="${escaparHtml(dashboardUrl)}"
      style="
        display: inline-block;
        margin-top: 20px;
        background: ${sucesso ? "#00c3e3" : "#f0b429"};
        color: #061827;
        padding: 12px 22px;
        border-radius: 10px;
        text-decoration: none;
        font-weight: bold;
      "
    >
      Voltar à NOSZONA
    </a>

    ${cartaoRecibo(recibo)}
  </div>

  ${
    recibo
      ? ""
      : `<script>
    setTimeout(
      function () {
        window.location.href = ${JSON.stringify(dashboardUrl)};
      },
      3000
    );
  </script>`
  }
</body>
</html>
  `;
}

/*
|--------------------------------------------------------------------------
| Iniciar pagamento
|--------------------------------------------------------------------------
*/

async function iniciarPagamento(req, res) {
  try {
    const residenteId = req.utilizador?.id;

    if (!residenteId) {
      return res
        .status(401)
        .type("html")
        .send(
          paginaErroPagamento(
            "Sessão inválida. Inicia sessão novamente."
          )
        );
    }

    const preparacao =
      sispService.prepararPedidoPagamento({
        ...(req.body || {}),
        residenteId
      });

    /*
     * Guarda a tentativa antes de enviar
     * o utilizador para a Vinti4.
     */
    await pagamentoModel.criarPagamentoPendente({
      residenteId:
        preparacao.pagamento.residenteId,

      merchantRef:
        preparacao.pagamento.merchantRef,

      merchantSession:
        preparacao.pagamento.merchantSession,

      tipo:
        preparacao.pagamento.tipo,

      pacote:
        preparacao.pagamento.pacote,

      valor:
        preparacao.pagamento.valor
    });

    console.log(
      "Pedido SISP preparado:",
      preparacao.pedidoSeguro
    );

    const camposFormulario =
      new URLSearchParams(
        preparacao.corpo
      );

    let inputsHtml = "";

    for (
      const [nome, valor]
      of camposFormulario.entries()
    ) {
      inputsHtml += `
        <input
          type="hidden"
          name="${escaparHtml(nome)}"
          value="${escaparHtml(valor)}"
        >
      `;
    }

    const paginaRedirecionamento = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>A processar pagamento</title>
</head>

<body
  style="
    font-family: Arial, sans-serif;
    background: #061827;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0;
  "
>
  <div
    style="
      text-align: center;
      max-width: 520px;
      padding: 40px;
    "
  >
    <h1>A preparar o pagamento</h1>

    <p>
      Aguarda enquanto és encaminhado
      para a página segura da Vinti4.
    </p>

    <form
      id="formularioSisp"
      action="${escaparHtml(preparacao.url)}"
      method="POST"
      accept-charset="UTF-8"
    >
      ${inputsHtml}

      <button
        id="botaoContinuar"
        type="submit"
        style="
          display: none;
          margin-top: 20px;
          background: #00c3e3;
          color: #061827;
          border: none;
          padding: 12px 22px;
          border-radius: 10px;
          font-weight: bold;
          cursor: pointer;
        "
      >
        Continuar para o pagamento
      </button>
    </form>

    <noscript>
      <style>
        #botaoContinuar {
          display: inline-block !important;
        }
      </style>

      <p>
        O JavaScript está desativado.
        Carrega no botão para continuar.
      </p>
    </noscript>
  </div>

  <script>
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        const formulario =
          document.getElementById(
            "formularioSisp"
          );

        if (formulario) {
          formulario.submit();
        }
      }
    );
  </script>
</body>
</html>
    `;

    return res
      .status(200)
      .type("html")
      .send(paginaRedirecionamento);
  } catch (erro) {
    console.error(
      "Erro ao iniciar pagamento SISP:",
      {
        mensagem: erro.message,
        codigo: erro.code || null
      }
    );

    const mensagemErro =
      String(erro.message || "");

    const erroValor =
      mensagemErro ===
      "O valor do pagamento deve ser superior a zero." ||
      mensagemErro ===
      "O valor do pagamento deve ser um número inteiro em CVE.";

    const erroConfiguracao =
      mensagemErro.startsWith(
        "Configuração SISP incompleta:"
      );

    const erroDados =
      mensagemErro.includes("obrigatório") ||
      mensagemErro.includes("obrigatória") ||
      mensagemErro.includes("deve possuir") ||
      mensagemErro.includes("deve ser");

    if (erroValor || erroDados) {
      return res
        .status(400)
        .type("html")
        .send(
          paginaErroPagamento(
            mensagemErro
          )
        );
    }

    if (erroConfiguracao) {
      return res
        .status(500)
        .type("html")
        .send(
          paginaErroPagamento(
            "O serviço de pagamento não está configurado corretamente."
          )
        );
    }

    return res
      .status(500)
      .type("html")
      .send(
        paginaErroPagamento(
          "Não foi possível iniciar o pagamento."
        )
      );
  }
}

/*
|--------------------------------------------------------------------------
| Iniciar pagamento de pacote — TC10 (Pagamento de Serviço)
|--------------------------------------------------------------------------
|
| residenteId vem sempre do token (nunca do body). O preço vem sempre do
| catálogo oficial, a partir do pacote já gravado no residente — nunca
| de valor/precoCVE/benefícios enviados pelo cliente. entityCode e
| referenceNumber vêm de variáveis de ambiente (valores de
| teste/certificação, nunca fixos no código). Só é permitido um
| pagamento de pacote "pendente" de cada vez por residente
| (pagamentoModel.criarPagamentoPacotePendenteUnico).
|--------------------------------------------------------------------------
*/

async function iniciarPagamentoPacote(req, res) {
  try {
    const residenteId = req.utilizador?.id;

    if (!residenteId) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Sessão inválida. Regista-te novamente."
      });
    }

    const residente =
      await residenteModel.procurarPorId(residenteId);

    if (!residente) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    if (residente.estadoPacote !== "pendente_pagamento") {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Este pacote já não está pendente de pagamento."
      });
    }

    const pacoteCatalogo =
      catalogoPacotes.obterPorNome(residente.pacote);

    if (!pacoteCatalogo) {
      console.error(
        "Pacote do residente não encontrado no catálogo ao iniciar pagamento:",
        {
          residenteId,
          pacote: residente.pacote
        }
      );

      return res.status(500).json({
        sucesso: false,
        mensagem: "Configuração inválida do pacote."
      });
    }

    const entityCode = String(
      process.env.SISP_SERVICO_ENTITY_CODE || ""
    ).trim();

    const referenceNumber = String(
      process.env.SISP_SERVICO_REFERENCE_NUMBER || ""
    ).trim();

    let preparacao;

    try {
      preparacao =
        sispService.prepararPedidoPagamentoServico({
          valor: pacoteCatalogo.precoCVE,
          entityCode,
          referenceNumber
        });
    } catch (erroPreparacao) {
      console.error(
        "Erro ao preparar pedido SISP de pacote:",
        erroPreparacao.message
      );

      return res.status(500).json({
        sucesso: false,
        mensagem: "O serviço de pagamento não está configurado corretamente."
      });
    }

    const criado =
      await pagamentoModel.criarPagamentoPacotePendenteUnico({
        residenteId,

        merchantRef:
          preparacao.pagamento.merchantRef,

        merchantSession:
          preparacao.pagamento.merchantSession,

        pacote: residente.pacote,
        valor: pacoteCatalogo.precoCVE
      });

    if (!criado.sucesso) {
      if (criado.motivo === "pagamento_pendente_existente") {
        return res.status(409).json({
          sucesso: false,
          mensagem: "Já existe um pagamento de pacote pendente."
        });
      }

      if (criado.motivo === "pacote_nao_pendente") {
        return res.status(409).json({
          sucesso: false,
          mensagem: "Este pacote já não está pendente de pagamento."
        });
      }

      return res.status(404).json({
        sucesso: false,
        mensagem: "Residente não encontrado."
      });
    }

    /*
     * Nunca logar o FingerPrint, o posAutCode ou o payload completo do
     * pedido — só o suficiente para investigar (merchantRef,
     * residenteId, pacote, valor). preparacao.pedidoSeguro (que ainda
     * inclui o corpo inteiro do pedido) não é usado aqui.
     */
    console.log(
      "Pedido SISP de pacote preparado:",
      {
        merchantRef:
          preparacao.pagamento.merchantRef,
        residenteId,
        pacote: residente.pacote,
        valor: pacoteCatalogo.precoCVE
      }
    );

    /*
     * Devolve só o necessário para o frontend construir e submeter o
     * próprio formulário para a SISP — nunca HTML pronto a injetar.
     * Os campos vêm exclusivamente de preparacao.corpo, montado no
     * backend a partir do catálogo; nada disto é reenviado pelo
     * browser.
     */
    const campos = Object.fromEntries(
      new URLSearchParams(
        preparacao.corpo
      )
    );

    return res.status(200).json({
      sucesso: true,
      url: preparacao.url,
      campos
    });
  } catch (erro) {
    console.error(
      "Erro ao iniciar pagamento de pacote SISP:",
      {
        mensagem: erro.message,
        codigo: erro.code || null
      }
    );

    const mensagemErro =
      String(erro.message || "");

    const erroValor =
      mensagemErro ===
      "O valor do pagamento deve ser superior a zero." ||
      mensagemErro ===
      "O valor do pagamento deve ser um número inteiro em CVE.";

    const erroConfiguracao =
      mensagemErro.startsWith(
        "Configuração SISP incompleta:"
      );

    const erroDados =
      mensagemErro.includes("obrigatório") ||
      mensagemErro.includes("obrigatória") ||
      mensagemErro.includes("deve possuir") ||
      mensagemErro.includes("deve ser");

    if (erroValor || erroDados) {
      return res.status(400).json({
        sucesso: false,
        mensagem: mensagemErro
      });
    }

    if (erroConfiguracao) {
      return res.status(500).json({
        sucesso: false,
        mensagem: "O serviço de pagamento não está configurado corretamente."
      });
    }

    return res.status(500).json({
      sucesso: false,
      mensagem: "Não foi possível iniciar o pagamento."
    });
  }
}

/*
|--------------------------------------------------------------------------
| Construir o recibo e enviar o email — só depois de o pagamento já
| estar confirmado na BD
|--------------------------------------------------------------------------
|
| Só deve ser chamada depois de concluirPagamentoEAplicarRecarga /
| concluirPagamentoEAtivarPacote terem terminado com sucesso
| (resultado.jaProcessado === false) — relê o pagamento já concluído
| (estado='concluido', com os campos DCC já gravados) em vez de montar
| o recibo a partir de valores assumidos. O envio do email usa await
| dentro de try/catch: uma falha é só registada (console.error), nunca
| altera/reverte o pagamento, saldo ou pacote. reciboEmailEnviadoEm só é
| escrito depois de sendMail terminar com sucesso.
|--------------------------------------------------------------------------
*/

async function construirReciboEEnviarEmail(merchantRef) {
  const pagamentoConfirmado =
    await pagamentoModel.procurarPorMerchantRef(
      merchantRef
    );

  const residente =
    await residenteModel.procurarPorId(
      pagamentoConfirmado.residenteId
    );

  const recibo = reciboService.construirRecibo({
    pagamento: pagamentoConfirmado,
    residente
  });

  if (residente?.email) {
    try {
      await emailService.enviarEmailRecibo({
        destinatario: residente.email,
        nome: residente.nome,
        recibo
      });

      await pagamentoModel.marcarReciboEmailEnviado(
        merchantRef
      );
    } catch (erroEmail) {
      console.error(
        "Erro ao enviar email do recibo (pagamento já confirmado, não revertido):",
        {
          merchantRef,
          mensagem: erroEmail.message
        }
      );
    }
  }

  return recibo;
}

/*
|--------------------------------------------------------------------------
| Processar retorno da SISP
|--------------------------------------------------------------------------
*/

async function processarRetorno(req, res) {
  try {
    const dados = {
      ...(req.query || {}),
      ...(req.body || {})
    };

    /*
     * Remove dados sensíveis dos logs.
     */
    const dadosSeguros = {
      ...dados
    };

    if (dadosSeguros.FingerPrint) {
      dadosSeguros.FingerPrint =
        "[REMOVIDO]";
    }

    if (dadosSeguros.fingerprint) {
      dadosSeguros.fingerprint =
        "[REMOVIDO]";
    }

    if (dadosSeguros.resultFingerPrint) {
      dadosSeguros.resultFingerPrint =
        "[REMOVIDO]";
    }

    if (dadosSeguros.merchantRespPan) {
      dadosSeguros.merchantRespPan =
        "[REMOVIDO]";
    }

    console.log(
      "Retorno recebido da SISP:",
      dadosSeguros
    );

    const merchantRef = String(
      dados.merchantRespMerchantRef ||
      dados.merchantRef ||
      dados.MerchantRef ||
      ""
    ).trim();

    const merchantSession = String(
      dados.merchantRespMerchantSession ||
      dados.merchantSession ||
      ""
    ).trim();

    const messageType = String(
      dados.messageType ||
      dados.MessageType ||
      ""
    ).trim();

    const merchantResp = String(
      dados.merchantResp ||
      dados.MerchantResp ||
      ""
    ).trim();

    const valorDevolvido = Number(
      dados.merchantRespPurchaseAmount ||
      dados.amount ||
      0
    );

    const codigoErro = String(
      dados.merchantRespErrorCode ||
      ""
    ).trim();

    const temCodigoErro =
      Boolean(codigoErro) &&
      codigoErro !== "00";

    const detalheErro = String(
      dados.merchantRespErrorDetail ||
      ""
    ).trim();

    const descricaoErro = String(
      dados.merchantRespErrorDescription ||
      ""
    ).trim();

    const mensagemAdicional = String(
      dados.merchantRespAdditionalErrorMessage ||
      ""
    ).trim();

    /*
     * Campos DCC — só para guardar/exibir no recibo, nunca influenciam
     * a classificação aprovado/falhado nem a validação de FingerPrint.
     */
    const dcc = String(
      dados.dcc || ""
    ).trim();

    const dccAmount = String(
      dados.dccAmount || ""
    ).trim();

    const dccCurrency = String(
      dados.dccCurrency || ""
    ).trim();

    const dccMarkup = String(
      dados.dccMarkup || ""
    ).trim();

    const dccRate = String(
      dados.dccRate || ""
    ).trim();

    /*
     * Retorno aprovado observado no ambiente de teste:
     *
     * messageType = "8"
     * merchantResp = "C"
     * campos de erro vazios
     *
     * pagamentoFalhado é calculado aqui, a partir só dos campos já
     * parseados de "dados" — antes de qualquer validação obrigatória de
     * valor. Numa resposta recusada/falhada (ex.: messageType "6",
     * "TRANSACAO RECUSADA") a SISP não envia
     * merchantRespPurchaseAmount nem amount; exigir esse valor antes de
     * sequer reconhecer que a transação falhou mascarava o erro real da
     * SISP com "o valor devolvido não corresponde ao pagamento
     * iniciado".
     */
    const tiposSucesso = [
      "8",
      "A",
      "B",
      "C",
      "M",
      "P"
    ];

    const semErros =
      !temCodigoErro &&
      !descricaoErro &&
      !detalheErro;

    const pagamentoAprovado =
      tiposSucesso.includes(messageType) &&
      (
        merchantResp === "C" ||
        merchantResp === "0"
      ) &&
      semErros;

    const pagamentoFalhado =
      messageType === "6" ||
      temCodigoErro ||
      Boolean(descricaoErro) ||
      Boolean(detalheErro);

    if (!merchantRef) {
      return res
        .status(400)
        .type("html")
        .send(
          paginaErroPagamento(
            "A resposta da SISP não contém a referência do pagamento."
          )
        );
    }

    const pagamento =
      await pagamentoModel.procurarPorMerchantRef(
        merchantRef
      );

    if (!pagamento) {
      return res
        .status(404)
        .type("html")
        .send(
          paginaErroPagamento(
            "O pagamento devolvido pela SISP não foi encontrado."
          )
        );
    }

    /*
     * Impede que a mesma transação
     * seja processada duas vezes.
     */
    if (pagamento.estado !== "pendente") {
      return res
        .status(200)
        .type("html")
        .send(
          paginaRetornoPagamento({
            titulo:
              "Pagamento já processado",

            mensagem:
              "Esta transação já tinha sido processada anteriormente.",

            sucesso:
              pagamento.estado === "concluido"
          })
        );
    }

    /*
     * Confirma a merchantSession.
     */
    if (
      merchantSession &&
      pagamento.merchantSession &&
      merchantSession !== pagamento.merchantSession
    ) {
      console.error(
        "MerchantSession diferente:",
        {
          merchantRef,
          sessaoGuardada:
            pagamento.merchantSession,
          sessaoRecebida:
            merchantSession
        }
      );

      return res
        .status(400)
        .type("html")
        .send(
          paginaErroPagamento(
            "A sessão devolvida pela SISP não corresponde ao pagamento iniciado."
          )
        );
    }

    /*
     * Confirma o valor devolvido — só obrigatório fora do caminho de
     * falha: uma resposta recusada/com erro não traz
     * merchantRespPurchaseAmount, e não deve ser rejeitada por isso
     * antes de chegar ao tratamento de pagamentoFalhado abaixo. Para um
     * pagamento aprovado, esta validação continua obrigatória e
     * inalterada (pagamentoAprovado implica sempre !pagamentoFalhado).
     */
    const valorGuardado = Number(
      pagamento.valor || 0
    );

    if (!pagamentoFalhado) {
      if (
        !Number.isFinite(valorDevolvido) ||
        valorDevolvido <= 0 ||
        valorDevolvido !== valorGuardado
      ) {
        console.error(
          "Valor do pagamento diferente:",
          {
            merchantRef,
            valorGuardado,
            valorDevolvido
          }
        );

        return res
          .status(400)
          .type("html")
          .send(
            paginaErroPagamento(
              "O valor devolvido pela SISP não corresponde ao pagamento iniciado."
            )
          );
      }
    }

    /*
     * Pagamento aprovado.
     */
    if (pagamentoAprovado) {
      /*
       * Valida a assinatura da resposta antes
       * de atualizar a base de dados.
       */
      const validacaoFingerprint =
        sispService.validarResultFingerPrint(
          dados
        );

      if (!validacaoFingerprint.valido) {
        console.error(
          "FingerPrint de resposta inválido:",
          {
            merchantRef,

            motivo:
              validacaoFingerprint.motivo
          }
        );

        return res
          .status(400)
          .type("html")
          .send(
            paginaErroPagamento(
              "Não foi possível validar a autenticidade da resposta da SISP."
            )
          );
      }

      console.log(
        "FingerPrint da resposta validado:",
        {
          merchantRef,
          versao:
            validacaoFingerprint.versao
        }
      );

      /*
       * Despacho explícito por tipo de pagamento. Um tipo desconhecido
       * nunca pode cair automaticamente no fluxo de recarga (TC1).
       */
      let resultado;

      if (pagamento.tipo === "pacote") {
        resultado =
          await pagamentoModel.concluirPagamentoEAtivarPacote({
            merchantRef,

            codigoResposta:
              merchantResp ||
              messageType,

            descricaoResposta:
              "Pagamento aprovado pela SISP.",

            dcc,
            dccAmount,
            dccCurrency,
            dccMarkup,
            dccRate
          });
      } else if (pagamento.tipo === "saldo") {
        resultado =
          await pagamentoModel.concluirPagamentoEAplicarRecarga({
            merchantRef,

            codigoResposta:
              merchantResp ||
              messageType,

            descricaoResposta:
              "Pagamento aprovado pela SISP.",

            dcc,
            dccAmount,
            dccCurrency,
            dccMarkup,
            dccRate
          });
      } else {
        console.error(
          "Tipo de pagamento desconhecido no callback SISP:",
          {
            merchantRef,
            tipo: pagamento.tipo
          }
        );

        return res
          .status(500)
          .type("html")
          .send(
            paginaErroPagamento(
              "Tipo de pagamento não reconhecido."
            )
          );
      }

      if (resultado.jaProcessado) {
        return res
          .status(200)
          .type("html")
          .send(
            paginaRetornoPagamento({
              titulo:
                "Pagamento já processado",

              mensagem:
                "Esta transação já tinha sido processada anteriormente.",

              sucesso:
                true
            })
          );
      }

      if (pagamento.tipo === "pacote") {
        console.log(
          "Pacote ativado para o residente:",
          {
            merchantRef,
            residenteId:
              resultado.residenteId,
            pacote:
              resultado.pacote
          }
        );

        const reciboPacote =
          await construirReciboEEnviarEmail(
            merchantRef
          );

        return res
          .status(200)
          .type("html")
          .send(
            paginaRetornoPagamento({
              titulo:
                "Pagamento aprovado",

              mensagem:
                "O pagamento foi confirmado com sucesso. O pacote foi ativado.",

              sucesso:
                true,

              recibo:
                reciboPacote
            })
          );
      }

      console.log(
        "Recarga aplicada ao residente:",
        {
          merchantRef,
          residenteId:
            resultado.residenteId,
          valorAplicado:
            resultado.valorAplicado,
          saldoAnterior:
            resultado.saldoAnterior,
          saldoAtual:
            resultado.saldoAtual
        }
      );

      const reciboRecarga =
        await construirReciboEEnviarEmail(
          merchantRef
        );

      return res
        .status(200)
        .type("html")
        .send(
          paginaRetornoPagamento({
            titulo:
              "Pagamento aprovado",

            mensagem:
              "O pagamento foi confirmado com sucesso. A recarga será aplicada à conta.",

            sucesso:
              true,

            recibo:
              reciboRecarga
          })
        );
    }

    /*
     * Pagamento recusado, cancelado
     * ou com erro técnico.
     */
    if (pagamentoFalhado) {
      /*
       * A especificação SISP ("Pagamento Web - Especificação do
       * Protocolo de Segurança v2.0") define FingerPrint também para
       * respostas de erro — tem de ser validado antes de qualquer
       * alteração de estado, tal como já acontece para respostas
       * aprovadas. Sem isto, uma resposta de erro forjada podia marcar
       * um pagamento legítimo como falhado.
       */
      const validacaoFingerprintErro =
        sispService.validarResultFingerPrint(
          dados
        );

      if (!validacaoFingerprintErro.valido) {
        console.error(
          "FingerPrint de resposta de erro inválido:",
          {
            merchantRef,

            motivo:
              validacaoFingerprintErro.motivo
          }
        );

        return res
          .status(400)
          .type("html")
          .send(
            paginaErroPagamento(
              "Não foi possível validar a autenticidade da resposta da SISP."
            )
          );
      }

      const mensagemErro =
        mensagemAdicional ||
        descricaoErro ||
        detalheErro ||
        codigoErro ||
        "O pagamento não foi concluído.";

      await pagamentoModel.marcarComoFalhado({
        merchantRef,

        codigoResposta:
          codigoErro ||
          merchantResp ||
          messageType,

        descricaoResposta:
          mensagemErro
      });

      return res
        .status(200)
        .type("html")
        .send(
          paginaRetornoPagamento({
            titulo:
              "Pagamento não concluído",

            mensagem:
              mensagemErro,

            sucesso:
              false
          })
        );
    }

    return res
      .status(200)
      .type("html")
      .send(
        paginaRetornoPagamento({
          titulo:
            "Pagamento em confirmação",

          mensagem:
            "A resposta foi recebida, mas o estado final da transação ainda precisa de ser confirmado.",

          sucesso:
            false
        })
      );
  } catch (erro) {
    console.error(
      "Erro ao processar retorno SISP:",
      {
        mensagem:
          erro.message,

        codigo:
          erro.code || null
      }
    );

    return res
      .status(500)
      .type("html")
      .send(
        paginaErroPagamento(
          "Erro interno ao processar o retorno do pagamento."
        )
      );
  }
}

/*
|--------------------------------------------------------------------------
| Comparar a chave da API de consulta de estado, em tempo constante
|--------------------------------------------------------------------------
|
| Mesmo padrão já usado no projeto (ex.: comparação de passwords em
| authController.js) — evita expor, pelo tempo de resposta, quantos
| caracteres da chave estão corretos.
|--------------------------------------------------------------------------
*/

function apiKeyEstadoValida(chaveRecebida, chaveConfigurada) {
  const bufferRecebido = Buffer.from(String(chaveRecebida || ""));
  const bufferConfigurado = Buffer.from(chaveConfigurada);

  if (bufferRecebido.length !== bufferConfigurado.length) {
    crypto.timingSafeEqual(bufferConfigurado, bufferConfigurado);
    return false;
  }

  return crypto.timingSafeEqual(bufferRecebido, bufferConfigurado);
}

/*
|--------------------------------------------------------------------------
| Consultar estado de uma transação SISP (Test Cases 39, 40, 41)
|--------------------------------------------------------------------------
|
| Protegida por X-API-Key (SISP_STATUS_API_KEY) — não há sessão de
| residente/admin aqui. Só consulta — nunca aplica saldo, nunca muda o
| estado do pagamento na BD, nunca marca como concluído/falhado.
| Devolve exatamente o que sispService.consultarEstadoTransacao
| devolver.
|--------------------------------------------------------------------------
*/

async function consultarEstadoTransacao(req, res) {
  try {
    const chaveConfigurada = String(
      process.env.SISP_STATUS_API_KEY || ""
    ).trim();

    if (!chaveConfigurada) {
      console.error(
        "SISP_STATUS_API_KEY não está configurada."
      );

      return res.status(500).json({
        sucesso: false,
        mensagem: "Configuração inválida do serviço."
      });
    }

    const chaveRecebida = req.headers["x-api-key"];

    if (
      !apiKeyEstadoValida(
        chaveRecebida,
        chaveConfigurada
      )
    ) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Não autorizado."
      });
    }

    const merchantRef = String(
      req.params?.merchantRef || ""
    ).trim();

    if (!merchantRef) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "merchantRef é obrigatório."
      });
    }

    const resultado =
      await sispService.consultarEstadoTransacao(
        merchantRef
      );

    return res.status(200).json(resultado);
  } catch (erro) {
    console.error(
      "Erro ao consultar estado da transação SISP:",
      {
        merchantRef: req.params?.merchantRef || "",
        mensagem: erro.message
      }
    );

    return res.status(500).json({
      sucesso: false,
      mensagem:
        erro.message ||
        "Não foi possível consultar o estado da transação."
    });
  }
}

/*
|--------------------------------------------------------------------------
| Obter recibo de um pagamento concluído (área autenticada)
|--------------------------------------------------------------------------
|
| Só leitura — nunca chama concluirPagamentoEAplicarRecarga/
| concluirPagamentoEAtivarPacote, nunca altera saldo, estadoPacote ou o
| estado do pagamento. Exige que o pagamento pertença ao residente
| autenticado (req.utilizador.id, o mesmo campo já usado em
| iniciarPagamento/iniciarPagamentoPacote) — merchantRef sozinho nunca
| é suficiente.
|--------------------------------------------------------------------------
*/

async function obterRecibo(req, res) {
  try {
    const residenteId = req.utilizador?.id;

    if (!residenteId) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Sessão inválida."
      });
    }

    const merchantRef = String(
      req.params?.merchantRef || ""
    ).trim();

    if (!merchantRef) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "merchantRef é obrigatório."
      });
    }

    const pagamento =
      await pagamentoModel.procurarPorMerchantRef(
        merchantRef
      );

    if (!pagamento) {
      return res.status(404).json({
        sucesso: false,
        mensagem: "Pagamento não encontrado."
      });
    }

    if (pagamento.residenteId !== residenteId) {
      return res.status(403).json({
        sucesso: false,
        mensagem: "Não autorizado."
      });
    }

    if (pagamento.estado !== "concluido") {
      return res.status(409).json({
        sucesso: false,
        mensagem: "Este pagamento ainda não tem recibo disponível."
      });
    }

    const residente =
      await residenteModel.procurarPorId(residenteId);

    const recibo = reciboService.construirRecibo({
      pagamento,
      residente
    });

    return res.status(200).json({
      sucesso: true,
      recibo
    });
  } catch (erro) {
    console.error(
      "Erro ao obter recibo:",
      {
        merchantRef: req.params?.merchantRef || "",
        mensagem: erro.message
      }
    );

    return res.status(500).json({
      sucesso: false,
      mensagem: "Não foi possível obter o recibo."
    });
  }
}

module.exports = {
  iniciarPagamento,
  iniciarPagamentoPacote,
  consultarEstadoTransacao,
  obterRecibo,
  processarRetorno
};