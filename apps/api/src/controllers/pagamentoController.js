const sispService = require("../services/sispService");
const pagamentoModel = require("../models/pagamentoModel");
const catalogoPacotes = require("../config/catalogoPacotes");
const residenteModel = require("../models/residenteModel");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const emailService = require("../services/emailService");
const reciboService = require("../services/reciboService");
const reciboPdfService = require("../services/reciboPdfService");

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

/*
|--------------------------------------------------------------------------
| Recibo na página de retorno (mesmo design do recibo.pdf e do email)
|--------------------------------------------------------------------------
|
| O CSP da API só aceita imagens 'self' ou data:, por isso o logótipo
| (o mesmo ficheiro embebido no recibo.pdf) entra como data: URI — lido
| uma vez e guardado em memória. Sem o ficheiro, o cabeçalho cai para
| texto. Os estilos ficam em ESTILOS_RECIBO (style-src permite inline).
|--------------------------------------------------------------------------
*/

const imagensDataUri = new Map();

/* Lê uma imagem de src/assets como data: URI (uma vez; "" se faltar) */
function obterImagemDataUri(relativo, tipo) {
  if (!imagensDataUri.has(relativo)) {
    try {
      imagensDataUri.set(
        relativo,
        `data:${tipo};base64,${fs
          .readFileSync(path.join(__dirname, "..", "assets", relativo))
          .toString("base64")}`
      );
    } catch (erro) {
      console.error("Imagem do recibo indisponível na página de retorno:", relativo, erro.message);
      imagensDataUri.set(relativo, "");
    }
  }

  return imagensDataUri.get(relativo);
}

function obterLogoReciboDataUri() {
  return obterImagemDataUri("cvr-logo-recibo.png", "image/png");
}

/*
 * Marcas aceites — ficheiros oficiais do Pacote desenvolvimento_4.7 da
 * SISP ("g. Logo das marcas aceites"), sem edição. O Mastercard ID Check
 * é a variante "rev" (texto branco), por isso fica sobre fundo escuro.
 */
const LOGOS_PAGAMENTO_RECIBO = [
  { nome: "American Express SafeKey", ficheiro: "pagamento/amex_SK_logo_full.png", tipo: "image/png", classe: "amex-sk" },
  { nome: "Mastercard ID Check", ficheiro: "pagamento/mc_idcheck_hrz_rgb_rev.png", tipo: "image/png", classe: "mastercard", fundoEscuro: true },
  { nome: "rede vinti4", ficheiro: "pagamento/vinti4.png", tipo: "image/png", classe: "vinti4" },
  { nome: "Visa Secure", ficheiro: "pagamento/visa-secure_blu_2021_dkbg.png", tipo: "image/png", classe: "visa" },
  { nome: "American Express", ficheiro: "pagamento/AXP_MagBlueBoxLogo.jpg", tipo: "image/jpeg", classe: "amex" }
];

function faixaLogosPagamento() {
  const logos = LOGOS_PAGAMENTO_RECIBO
    .map((logo) => ({ ...logo, src: obterImagemDataUri(logo.ficheiro, logo.tipo) }))
    .filter((logo) => logo.src);

  if (!logos.length) {
    return "";
  }

  return `
      <div class="recibo-pagamentos" aria-label="Meios de pagamento aceites">
        ${logos
          .map(
            (logo) =>
              `<span class="recibo-logo${logo.fundoEscuro ? " recibo-logo-escuro" : ""}"><img class="${logo.classe}" src="${logo.src}" alt="${escaparHtml(logo.nome)}"></span>`
          )
          .join('<span class="recibo-sep" aria-hidden="true"></span>')}
      </div>`;
}

function formatarDataRecibo(data) {
  return data
    ? new Date(data).toLocaleString("pt-PT", { timeZone: "Atlantic/Cape_Verde" })
    : "";
}

function formatarCVERecibo(valor) {
  return `${Number(valor || 0).toLocaleString("pt-PT")} CVE`;
}

const ESTILOS_RECIBO = `
    .recibo { margin-top: 28px; text-align: left; border: 1px solid #d4dee9; border-radius: 14px; overflow: hidden; color: #0f1f2e; }
    .recibo-topo { background: #061827; border-bottom: 4px solid #00c3e3; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .recibo-topo img { display: block; width: 200px; max-width: 100%; height: auto; }
    .recibo-marca { color: #ffffff; font-weight: bold; font-size: 16px; }
    .recibo-titulo { text-align: right; }
    .recibo-titulo strong { display: block; color: #ffffff; font-size: 17px; letter-spacing: 0.3px; }
    .recibo-titulo span { color: #00c3e3; font-size: 13px; }
    .recibo-corpo { padding: 22px; }
    .recibo-partes { display: flex; gap: 20px; margin-bottom: 18px; }
    .recibo-partes > div { flex: 1; min-width: 0; }
    .recibo-rotulo { margin: 0 0 4px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; color: #5f7186; }
    .recibo-nome { margin: 0 0 4px; font-size: 16px; font-weight: bold; color: #061827; overflow-wrap: anywhere; }
    .recibo-contacto { margin: 2px 0; font-size: 13px; color: #5f7186; overflow-wrap: anywhere; }
    .recibo-cartao { background: #f7fafc; border: 1px solid #d4dee9; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
    .recibo-cartao h3 { margin: 0 0 6px; padding-left: 10px; border-left: 3px solid #00c3e3; font-size: 14px; color: #061827; }
    .recibo-cartao table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .recibo-cartao td { padding: 8px 0; border-bottom: 1px solid #d4dee9; vertical-align: top; }
    .recibo-cartao tr:last-child td { border-bottom: none; }
    .recibo-cartao td:first-child { color: #5f7186; width: 46%; padding-right: 12px; }
    .recibo-cartao td:last-child { font-weight: bold; overflow-wrap: anywhere; }
    .recibo-total { display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #eaf6fb; border: 1px solid #b9e3f2; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; }
    .recibo-total p { margin: 0; }
    .recibo-total .valor { font-size: 24px; font-weight: bold; color: #061827; }
    .recibo-selo { background: #0ea472; color: #ffffff; font-weight: bold; font-size: 13px; padding: 6px 16px; border-radius: 999px; letter-spacing: 0.5px; }
    .recibo-avisos { background: #f3f6f9; border-left: 3px solid #00c3e3; padding: 10px 14px; margin: 0 0 14px; font-size: 12px; line-height: 1.6; color: #5f7186; }
    .recibo-rodape { border-top: 1px solid #d4dee9; padding: 14px 22px 18px; text-align: center; font-size: 12px; color: #5f7186; }
    .recibo-rodape p { margin: 2px 0; overflow-wrap: anywhere; }
    .recibo-rodape .nota { font-size: 11px; color: #8a9bb0; }
    .recibo-imprimir { display: block; margin: 18px auto 0; width: calc(100% - 44px); background: #eef2f7; color: #0f1f2e; border: 1px solid #d7dee8; padding: 11px 16px; border-radius: 8px; font-weight: bold; font-size: 14px; cursor: pointer; }
    .recibo-imprimir:hover { background: #e2e9f2; }
    .recibo-pagamentos { border-top: 1px solid #d4dee9; padding: 14px 16px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px 14px; }
    .recibo-logo { display: flex; align-items: center; }
    .recibo-logo img { display: block; width: auto; max-width: 100%; }
    .recibo-logo-escuro { background: #141414; border-radius: 6px; padding: 4px 8px; }
    .recibo-pagamentos .amex-sk { height: 30px; }
    .recibo-pagamentos .mastercard { height: 28px; }
    .recibo-pagamentos .vinti4 { height: 42px; }
    .recibo-pagamentos .visa { height: 46px; }
    .recibo-pagamentos .amex { height: 46px; }
    .recibo-sep { width: 1px; height: 30px; background: #d4dee9; }
    @media (max-width: 560px) {
      .recibo-partes { flex-direction: column; gap: 12px; }
      .recibo-titulo { text-align: left; }
      .recibo-total .valor { font-size: 20px; }
      .recibo-sep { display: none; }
      .recibo-pagamentos { gap: 10px 16px; }
    }
`;

function cartaoRecibo(recibo) {
  if (!recibo) {
    return "";
  }

  const { comerciante, cliente, transacao, dcc } = recibo;
  const logo = obterLogoReciboDataUri();

  const linha = ([rotulo, valor]) =>
    `<tr><td>${escaparHtml(rotulo)}</td><td>${escaparHtml(valor)}</td></tr>`;

  const blocoDcc = dcc
    ? `
        <div class="recibo-cartao">
          <h3>Dynamic Currency Conversion (DCC)</h3>
          <table>
            ${[
              ["Valor original", formatarCVERecibo(dcc.valorOriginalCVE)],
              ["Taxa de conversão / Currency Conversion Rate", `1 ${dcc.dccCurrency} = ${dcc.dccRate} CVE`],
              ["DCC Markup", `${dcc.dccMarkup} %`],
              ["Moeda / Currency", dcc.dccCurrency],
              ["Valor cobrado / Amount charged", `${dcc.dccAmount} ${dcc.dccCurrency}`]
            ].map(linha).join("")}
          </table>
        </div>
        <p class="recibo-avisos">${dcc.avisos.map(escaparHtml).join("<br>")}</p>`
    : "";

  const contactosRodape = [
    comerciante.nome,
    comerciante.telefone ? `Tel: ${comerciante.telefone}` : "",
    comerciante.email,
    comerciante.url
  ].filter(Boolean).map(escaparHtml).join("&nbsp;&nbsp;|&nbsp;&nbsp;");

  return `
    <div id="recibo" class="recibo">
      <div class="recibo-topo">
        ${logo
          ? `<img src="${logo}" alt="Cabo Verde Virtual Resident" width="200">`
          : `<span class="recibo-marca">Cabo Verde Virtual Resident</span>`}
        <div class="recibo-titulo">
          <strong>RECIBO DE PAGAMENTO</strong>
          <span>Referência ${escaparHtml(transacao.merchantRef)}</span>
        </div>
      </div>

      <div class="recibo-corpo">
        <div class="recibo-partes">
          <div>
            <p class="recibo-rotulo">Emitido por</p>
            <p class="recibo-nome">${escaparHtml(comerciante.nome)}</p>
            ${comerciante.telefone ? `<p class="recibo-contacto">Tel: ${escaparHtml(comerciante.telefone)}</p>` : ""}
            ${comerciante.email ? `<p class="recibo-contacto">Email: ${escaparHtml(comerciante.email)}</p>` : ""}
            ${comerciante.url ? `<p class="recibo-contacto">Loja: ${escaparHtml(comerciante.url)}</p>` : ""}
          </div>
          <div>
            <p class="recibo-rotulo">Cliente</p>
            <p class="recibo-nome">${escaparHtml(cliente.nome || "—")}</p>
            ${cliente.email ? `<p class="recibo-contacto">Email: ${escaparHtml(cliente.email)}</p>` : ""}
          </div>
        </div>

        <div class="recibo-cartao">
          <h3>Detalhes da transação</h3>
          <table>
            ${[
              ["Serviço", transacao.descricao],
              ["Referência (merchantRef)", transacao.merchantRef],
              ["Data da transação", formatarDataRecibo(transacao.dataTransacao)],
              ["Data de prestação / ativação do serviço", formatarDataRecibo(transacao.dataPrestacaoServico)],
              ["Estado", transacao.estado]
            ].map(linha).join("")}
          </table>
        </div>

        <div class="recibo-total">
          <div>
            <p class="recibo-rotulo">Valor total pago</p>
            <p class="valor">${escaparHtml(formatarCVERecibo(transacao.valor))}</p>
          </div>
          <span class="recibo-selo">${escaparHtml(String(transacao.estado || "").toUpperCase())}</span>
        </div>
        ${blocoDcc}
      </div>

      <div class="recibo-rodape">
        <p>${contactosRodape}</p>
        <p class="nota">Documento emitido eletronicamente. Pagamento processado de forma segura pela rede vinti4.</p>
      </div>
      ${faixaLogosPagamento()}
    </div>

    <button type="button" id="botaoImprimirRecibo" class="no-print recibo-imprimir">
      Imprimir / Guardar recibo
    </button>
  `;
}

/*
|--------------------------------------------------------------------------
| Scripts da página de retorno e CSP
|--------------------------------------------------------------------------
|
| O helmet() global (app.js) aplica um CSP com script-src 'self' e
| script-src-attr 'none': o browser bloqueava o antigo
| onclick="window.print()" inline (e o <script> de redirecionamento), por
| isso o botão "Imprimir / Guardar recibo" não fazia nada. Em vez de
| enfraquecer o CSP com 'unsafe-inline', só estes dois scripts fixos são
| autorizados, pelo hash SHA-256, e apenas na rota /retorno
| (permitirScriptsPaginaRetorno). O texto entre <script> e </script> tem
| de ser exatamente o devolvido por estas funções, senão o hash deixa de
| corresponder.
|--------------------------------------------------------------------------
*/

const SCRIPT_IMPRIMIR_RECIBO =
  'document.getElementById("botaoImprimirRecibo").addEventListener("click",function(){window.print();});';

function obterDashboardUrl() {
  return (
    process.env.FRONTEND_DASHBOARD_URL ||
    "https://noszona-monorepo-web.vercel.app/dashboard"
  );
}

function scriptRedirecionarDashboard(dashboardUrl) {
  return `setTimeout(function(){window.location.href=${JSON.stringify(dashboardUrl)};},3000);`;
}

function hashScriptCsp(script) {
  return `'sha256-${crypto
    .createHash("sha256")
    .update(script, "utf8")
    .digest("base64")}'`;
}

function permitirScriptsPaginaRetorno(req, res, next) {
  const politica = res.getHeader("Content-Security-Policy");

  if (politica) {
    const hashes = [
      SCRIPT_IMPRIMIR_RECIBO,
      scriptRedirecionarDashboard(obterDashboardUrl())
    ]
      .map(hashScriptCsp)
      .join(" ");

    res.setHeader(
      "Content-Security-Policy",
      String(politica)
        .split(";")
        .map((diretiva) => diretiva.trim())
        .map((diretiva) =>
          /^script-src(\s|$)/.test(diretiva)
            ? `${diretiva} ${hashes}`
            : diretiva
        )
        .join(";")
    );
  }

  next();
}

function paginaRetornoPagamento({
  titulo,
  mensagem,
  sucesso,
  recibo
}) {
  const dashboardUrl = obterDashboardUrl();

  /*
   * Com recibo, a impressão mostra só o cartão do recibo — título,
   * mensagem e botões ficam escondidos (@media print / .no-print).
   */
  const classeCabecalho = recibo ? ' class="no-print"' : "";

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
    ${recibo ? ESTILOS_RECIBO : ""}

    @media print {
      @page {
        margin: 12mm;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html,
      body {
        background: #ffffff !important;
        color: #000000 !important;
      }

      body {
        display: block !important;
        min-height: 0 !important;
      }

      .no-print {
        display: none !important;
      }

      .cartao-retorno {
        max-width: none !important;
        width: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }

      #recibo {
        margin-top: 0 !important;
        break-inside: avoid;
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
    class="cartao-retorno"
    style="
      background: white;
      color: #0f1f2e;
      padding: ${recibo ? "32px 28px" : "40px"};
      border-radius: 20px;
      max-width: ${recibo ? "680px" : "520px"};
      width: ${recibo ? "100%" : "auto"};
      box-sizing: border-box;
      margin: 16px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    "
  >
    <h1${classeCabecalho}>${escaparHtml(titulo)}</h1>

    <p${classeCabecalho} style="color: #607080;">
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
      ? `<script>${SCRIPT_IMPRIMIR_RECIBO}</script>`
      : `<script>${scriptRedirecionarDashboard(dashboardUrl)}</script>`
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
| escrito depois de sendMail terminar com sucesso e com recibo.pdf
| anexado.
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
      const envio = await emailService.enviarEmailRecibo({
        destinatario: residente.email,
        nome: residente.nome,
        recibo
      });

      /*
       * reciboEmailEnviadoEm só regista a entrega do documento recibo
       * (exigência SISP): um email que saiu sem recibo.pdf não conta
       * como entregue — fica NULL e a falha fica nos logs. O recibo
       * continua sempre disponível para download na conta do residente.
       */
      if (envio.pdfAnexado) {
        await pagamentoModel.marcarReciboEmailEnviado(
          merchantRef
        );
      } else {
        console.error(
          "Email do recibo enviado SEM recibo.pdf — entrega do documento NÃO concluída (pagamento já confirmado, não revertido):",
          { merchantRef }
        );
      }
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

/*
 * Validação comum aos dois endpoints de recibo (JSON e PDF): sessão,
 * propriedade do pagamento e estado "concluido". Devolve { recibo } ou
 * { status, mensagem } — nunca escreve na BD.
 */
async function carregarReciboDoResidente(req) {
  const residenteId = req.utilizador?.id;

  if (!residenteId) {
    return { status: 401, mensagem: "Sessão inválida." };
  }

  const merchantRef = String(
    req.params?.merchantRef || ""
  ).trim();

  if (!merchantRef) {
    return { status: 400, mensagem: "merchantRef é obrigatório." };
  }

  const pagamento =
    await pagamentoModel.procurarPorMerchantRef(
      merchantRef
    );

  if (!pagamento) {
    return { status: 404, mensagem: "Pagamento não encontrado." };
  }

  if (Number(pagamento.residenteId) !== Number(residenteId)) {
    return { status: 403, mensagem: "Não autorizado." };
  }

  if (pagamento.estado !== "concluido") {
    return {
      status: 409,
      mensagem: "Este pagamento ainda não tem recibo disponível."
    };
  }

  const residente =
    await residenteModel.procurarPorId(residenteId);

  return {
    recibo: reciboService.construirRecibo({
      pagamento,
      residente
    })
  };
}

async function obterRecibo(req, res) {
  try {
    const resultado = await carregarReciboDoResidente(req);

    if (!resultado.recibo) {
      return res.status(resultado.status).json({
        sucesso: false,
        mensagem: resultado.mensagem
      });
    }

    return res.status(200).json({
      sucesso: true,
      recibo: resultado.recibo
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

/*
|--------------------------------------------------------------------------
| Descarregar recibo.pdf (área autenticada)
|--------------------------------------------------------------------------
|
| Mesmas regras de obterRecibo. O PDF é gerado a pedido pelo mesmo
| reciboPdfService do email — não é guardado na BD.
|--------------------------------------------------------------------------
*/

async function obterReciboPdf(req, res) {
  try {
    const resultado = await carregarReciboDoResidente(req);

    if (!resultado.recibo) {
      return res.status(resultado.status).json({
        sucesso: false,
        mensagem: resultado.mensagem
      });
    }

    const pdf = reciboPdfService.gerarReciboPdf(resultado.recibo);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="recibo.pdf"',
      "Content-Length": String(pdf.length),
      "Cache-Control": "private, no-store"
    });

    return res.status(200).send(pdf);
  } catch (erro) {
    console.error(
      "Erro ao gerar recibo.pdf para download:",
      {
        merchantRef: req.params?.merchantRef || "",
        mensagem: erro.message
      }
    );

    return res.status(500).json({
      sucesso: false,
      mensagem: "Não foi possível gerar o recibo."
    });
  }
}

/*
|--------------------------------------------------------------------------
| Histórico de pagamentos do residente autenticado
|--------------------------------------------------------------------------
|
| Só pagamentos concluídos do próprio residente (req.utilizador.id do
| JWT — nunca um residenteId vindo do pedido), paginado. Só campos de
| exibição: sem merchantSession, códigos SISP, FingerPrint ou PAN.
|--------------------------------------------------------------------------
*/

const HISTORICO_LIMITE_PADRAO = 10;
const HISTORICO_LIMITE_MAXIMO = 50;

async function listarHistorico(req, res) {
  try {
    const residenteId = req.utilizador?.id;

    if (!residenteId) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Sessão inválida."
      });
    }

    const pagina = Math.max(
      1,
      Math.trunc(Number(req.query?.pagina)) || 1
    );

    const limite = Math.min(
      HISTORICO_LIMITE_MAXIMO,
      Math.max(
        1,
        Math.trunc(Number(req.query?.limite)) ||
          HISTORICO_LIMITE_PADRAO
      )
    );

    const { pagamentos, total } =
      await pagamentoModel.listarConcluidosPorResidente(
        residenteId,
        { limite, offset: (pagina - 1) * limite }
      );

    return res.status(200).json({
      sucesso: true,
      pagina,
      limite,
      total,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
      pagamentos: pagamentos.map((pagamento) => ({
        merchantRef: pagamento.merchantRef,
        tipo: pagamento.tipo === "pacote" ? "pacote" : "recarga",
        descricao:
          pagamento.tipo === "pacote"
            ? (pagamento.pacote || "Pacote")
            : "Recarga de saldo",
        valor: Number(pagamento.valor || 0),
        moeda: "CVE",
        estado: "Pago",
        dataTransacao: pagamento.criadoEm,
        dataConfirmacao: pagamento.confirmadoEm
      }))
    });
  } catch (erro) {
    console.error(
      "Erro ao listar histórico de pagamentos:",
      erro.message
    );

    return res.status(500).json({
      sucesso: false,
      mensagem: "Não foi possível obter o histórico de pagamentos."
    });
  }
}

module.exports = {
  iniciarPagamento,
  iniciarPagamentoPacote,
  consultarEstadoTransacao,
  obterRecibo,
  obterReciboPdf,
  listarHistorico,
  permitirScriptsPaginaRetorno,
  processarRetorno
};
