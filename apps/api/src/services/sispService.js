const crypto = require("crypto");

/*
|--------------------------------------------------------------------------
| Configuração SISP/Vinti4 3DSServer 2.2.0
|--------------------------------------------------------------------------
*/

/*
 * Sem tabela de preços por pacote no servidor, o valor da recarga continua
 * a ser escolhido pelo residente — mas nunca sem limite. Um teto razoável
 * evita que um pedido de pagamento com um valor absurdo (erro ou abuso)
 * polua a tabela de pagamentos; quem paga continua a ter de completar o
 * 3DS com o próprio cartão, então isto é defesa em profundidade, não a
 * única proteção.
 */
const VALOR_MAXIMO_PAGAMENTO_CVE = 500000;

function obterConfiguracaoSisp() {
  const configuracao = {
    posID: String(
      process.env.SISP_POS_ID || ""
    ).trim(),

    posAutCode: String(
      process.env.SISP_POS_AUT_CODE || ""
    ).trim(),

    url: String(
      process.env.SISP_URL || ""
    ).trim(),

    transactionCode: String(
      process.env.SISP_TRANSACTION_CODE || "1"
    ).trim(),

    language: String(
      process.env.SISP_LANGUAGE || "pt"
    ).trim(),

    currency: String(
      process.env.SISP_CURRENCY || "132"
    ).trim(),

    countryCode: String(
      process.env.SISP_COUNTRY_CODE || "132"
    ).trim(),

    merchantResponseUrl: String(
      process.env.SISP_MERCHANT_RESPONSE_URL || ""
    ).trim(),

    defaultEmail: String(
      process.env.SISP_DEFAULT_EMAIL ||
      "noszonasmart@gmail.com"
    ).trim(),

    defaultCity: String(
      process.env.SISP_DEFAULT_CITY ||
      "Praia"
    ).trim(),

    defaultAddress: String(
      process.env.SISP_DEFAULT_ADDRESS ||
      "Cabo Verde"
    ).trim(),

    defaultPostalCode: String(
      process.env.SISP_DEFAULT_POSTAL_CODE ||
      "7600"
    ).trim(),

    defaultPhoneCountryCode: String(
      process.env.SISP_DEFAULT_PHONE_COUNTRY_CODE ||
      "238"
    ).trim()
  };

  const camposObrigatorios = [
    "posID",
    "posAutCode",
    "url",
    "merchantResponseUrl"
  ];

  const camposEmFalta = camposObrigatorios.filter(
    (campo) => !configuracao[campo]
  );

  if (camposEmFalta.length > 0) {
    throw new Error(
      `Configuração SISP incompleta: ${camposEmFalta.join(", ")}`
    );
  }

  if (!/^\d{8}$/.test(configuracao.posID)) {
    throw new Error(
      "O SISP_POS_ID deve possuir exatamente 8 números."
    );
  }

  return configuracao;
}

/*
|--------------------------------------------------------------------------
| Funções auxiliares
|--------------------------------------------------------------------------
*/

function limitarTexto(valor, tamanho) {
  return String(valor || "")
    .trim()
    .slice(0, tamanho);
}

function apenasNumeros(valor) {
  return String(valor || "")
    .replace(/\D/g, "");
}

function formatarDataAAAAMMDD(valor) {
  if (!valor) {
    return "";
  }

  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  const ano = data.getFullYear();

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    data.getDate()
  ).padStart(2, "0");

  return `${ano}${mes}${dia}`;
}

function gerarTimeStamp() {
  const agora = new Date();

  const ano = agora.getFullYear();

  const mes = String(
    agora.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    agora.getDate()
  ).padStart(2, "0");

  const hora = String(
    agora.getHours()
  ).padStart(2, "0");

  const minuto = String(
    agora.getMinutes()
  ).padStart(2, "0");

  const segundo = String(
    agora.getSeconds()
  ).padStart(2, "0");

  return (
    `${ano}-${mes}-${dia} ` +
    `${hora}:${minuto}:${segundo}`
  );
}

/*
|--------------------------------------------------------------------------
| Referências SISP
|--------------------------------------------------------------------------
|
| Limite oficial:
| merchantRef     = 15 caracteres
| merchantSession = 15 caracteres
|
| Formato:
| R + yyMMddHHmmss + 2 dígitos = 15 caracteres
|--------------------------------------------------------------------------
*/

function gerarReferencia(prefixo) {
  const agora = new Date();

  const ano = String(
    agora.getFullYear()
  ).slice(-2);

  const mes = String(
    agora.getMonth() + 1
  ).padStart(2, "0");

  const dia = String(
    agora.getDate()
  ).padStart(2, "0");

  const hora = String(
    agora.getHours()
  ).padStart(2, "0");

  const minuto = String(
    agora.getMinutes()
  ).padStart(2, "0");

  const segundo = String(
    agora.getSeconds()
  ).padStart(2, "0");

  const aleatorio = String(
    Math.floor(Math.random() * 100)
  ).padStart(2, "0");

  return (
    `${prefixo}` +
    `${ano}${mes}${dia}` +
    `${hora}${minuto}${segundo}` +
    `${aleatorio}`
  ).slice(0, 15);
}

/*
|--------------------------------------------------------------------------
| SHA-512 em Base64
|--------------------------------------------------------------------------
*/

function gerarSHA512Base64(valor) {
  return crypto
    .createHash("sha512")
    .update(String(valor), "utf8")
    .digest("base64");
}

/*
|--------------------------------------------------------------------------
| Gerar FingerPrint do pedido
|--------------------------------------------------------------------------
|
| Ordem oficial, sem separadores:
|
| SHA512_BASE64(posAutCode)
| + TimeStamp
| + amount multiplicado por 1000
| + merchantRef sem espaços
| + merchantSession sem espaços
| + posID sem espaços
| + currency sem espaços/zeros à esquerda
| + transactionCode sem espaços
|
| Para transactionCode 1 não entram:
| entityCode
| referenceNumber
|--------------------------------------------------------------------------
*/

function gerarFingerPrint({
  posAutCode,
  TimeStamp,
  amount,
  merchantRef,
  merchantSession,
  posID,
  currency,
  transactionCode
}) {
  const amountNumerico = Number(amount);

  if (
    !Number.isFinite(amountNumerico) ||
    amountNumerico <= 0
  ) {
    throw new Error(
      "Montante inválido para gerar o FingerPrint."
    );
  }

  const posAutCodeHash =
    gerarSHA512Base64(posAutCode);

  const amountFingerprint = String(
    Math.trunc(amountNumerico * 1000)
  );

  const merchantRefLimpa = String(
    merchantRef
  ).replace(/\s+/g, "");

  const merchantSessionLimpa = String(
    merchantSession
  ).replace(/\s+/g, "");

  const posIDLimpo = String(
    posID
  ).replace(/\s+/g, "");

  const currencyLimpa =
    String(Number(currency));

  const transactionCodeLimpo = String(
    transactionCode
  ).replace(/\s+/g, "");

  const mensagem =
    posAutCodeHash +
    TimeStamp +
    amountFingerprint +
    merchantRefLimpa +
    merchantSessionLimpa +
    posIDLimpo +
    currencyLimpa +
    transactionCodeLimpo;

  return gerarSHA512Base64(mensagem);
}

/*
|--------------------------------------------------------------------------
| Calcular idade da conta
|--------------------------------------------------------------------------
*/

function calcularIndicadorIdadeConta(criadoEm) {
  if (!criadoEm) {
    return "";
  }

  const dataCriacao = new Date(criadoEm);

  if (Number.isNaN(dataCriacao.getTime())) {
    return "";
  }

  const diferenca =
    Date.now() - dataCriacao.getTime();

  const dias = Math.floor(
    diferenca / (1000 * 60 * 60 * 24)
  );

  if (dias < 0) {
    return "";
  }

  if (dias < 30) {
    return "03";
  }

  if (dias <= 60) {
    return "04";
  }

  return "05";
}

/*
|--------------------------------------------------------------------------
| Criar purchaseRequest 3DSServer
|--------------------------------------------------------------------------
*/

function criarPurchaseRequest({
  residenteId,
  username,
  email,
  telefone,
  cidade,
  morada,
  codigoPostal,
  countryCode,
  phoneCountryCode,
  criadoEm,
  atualizadoEm,
  passwordAlteradaEm
}) {
  const emailLimpo =
    limitarTexto(email, 254);

  const telefoneLimpo =
    limitarTexto(apenasNumeros(telefone), 15);

  if (!emailLimpo) {
    throw new Error(
      "O email do titular do cartão é obrigatório."
    );
  }

  if (!cidade) {
    throw new Error(
      "A cidade de cobrança é obrigatória."
    );
  }

  if (!morada) {
    throw new Error(
      "A morada de cobrança é obrigatória."
    );
  }

  if (!codigoPostal) {
    throw new Error(
      "O código postal de cobrança é obrigatório."
    );
  }

  const dados3DS = {
    acctID: limitarTexto(
      residenteId ||
      username ||
      emailLimpo,
      64
    ),

    email: emailLimpo,

    addrMatch: "Y",

    billAddrCity:
      limitarTexto(cidade, 50),

    billAddrCountry:
      limitarTexto(countryCode, 3),

    billAddrLine1:
      limitarTexto(morada, 50),

    billAddrLine2: "",

    billAddrLine3: "",

    billAddrPostCode:
      limitarTexto(codigoPostal, 16),

    shipAddrCity:
      limitarTexto(cidade, 50),

    shipAddrCountry:
      limitarTexto(countryCode, 3),

    shipAddrLine1:
      limitarTexto(morada, 50),

    shipAddrPostCode:
      limitarTexto(codigoPostal, 16)
  };

  /*
   * acctInfo é recomendado, mas depende de dados
   * reais da conta do residente.
   *
   * Só é incluído quando temos pelo menos
   * a data de criação da conta.
   */
  const dataCriacao =
    formatarDataAAAAMMDD(criadoEm);

  const dataAtualizacao =
    formatarDataAAAAMMDD(
      atualizadoEm || criadoEm
    );

  const dataPassword =
    formatarDataAAAAMMDD(
      passwordAlteradaEm || criadoEm
    );

  const indicadorIdade =
    calcularIndicadorIdadeConta(criadoEm);

  if (dataCriacao && indicadorIdade) {
    dados3DS.acctInfo = {
      chAccAgeInd:
        indicadorIdade,

      chAccChange:
        dataAtualizacao || dataCriacao,

      chAccDate:
        dataCriacao,

      chAccPwChange:
        dataPassword || dataCriacao,

      chAccPwChangeInd:
        indicadorIdade,

      suspiciousAccActivity:
        "01"
    };
  }

  /*
   * Os contactos são opcionais na tabela técnica.
   * Apenas são incluídos quando existe um telefone.
   */
  if (telefoneLimpo) {
    dados3DS.mobilePhone = {
      cc: limitarTexto(
        phoneCountryCode,
        3
      ),

      subscriber:
        telefoneLimpo
    };

    dados3DS.workPhone = {
      cc: limitarTexto(
        phoneCountryCode,
        3
      ),

      subscriber:
        telefoneLimpo
    };
  }

  const json3DS =
    JSON.stringify(dados3DS);

  const purchaseRequest = Buffer
    .from(json3DS, "utf8")
    .toString("base64");

  return {
    purchaseRequest,
    dados3DS
  };
}

/*
|--------------------------------------------------------------------------
| Preparar pedido de pagamento
|--------------------------------------------------------------------------
*/

function prepararPedidoPagamento(dados = {}) {
  const config =
    obterConfiguracaoSisp();

  const residenteId = String(
    dados.residenteId ||
    dados.id ||
    ""
  ).trim();

  const username = String(
    dados.username || ""
  ).trim();

  const pacote = String(
    dados.pacote ||
    "Recarga"
  ).trim();

  const tipo = String(
    dados.tipo ||
    "saldo"
  ).trim();

  const valor = Number(
    dados.valor || 0
  );

  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    throw new Error(
      "O valor do pagamento deve ser superior a zero."
    );
  }

  if (valor > VALOR_MAXIMO_PAGAMENTO_CVE) {
    throw new Error(
      `O valor do pagamento não pode exceder ${VALOR_MAXIMO_PAGAMENTO_CVE} CVE.`
    );
  }

  /*
   * A SISP aceita apenas montantes inteiros em CVE.
   */
  if (!Number.isInteger(valor)) {
    throw new Error(
      "O valor do pagamento deve ser um número inteiro em CVE."
    );
  }

  const amount =
    String(valor);

  /*
   * Moeda efetiva: por defeito CVE (132), vindo de config.currency.
   * Só é substituída quando o pedido indica explicitamente outra
   * moeda (Test Case 06 — Compra 3DS Server-DCC).
   */
  const currency = String(
    dados.currency ||
    dados.moeda ||
    config.currency
  ).trim();

  if (!/^\d{3}$/.test(currency)) {
    throw new Error(
      "A moeda deve ser um código numérico ISO de 3 dígitos."
    );
  }

  const email = String(
    dados.email ||
    config.defaultEmail
  ).trim();

  const telefone = String(
    dados.telefone ||
    dados.mobilePhone ||
    ""
  ).trim();

  const cidade = String(
    dados.cidade ||
    dados.municipio ||
    config.defaultCity
  ).trim();

  const morada = String(
    dados.morada ||
    config.defaultAddress
  ).trim();

  const codigoPostal = String(
    dados.codigoPostal ||
    config.defaultPostalCode
  ).trim();

  const merchantRef =
    gerarReferencia("R");

  const merchantSession =
    gerarReferencia("S");

  const TimeStamp =
    gerarTimeStamp();

  const {
    purchaseRequest,
    dados3DS
  } = criarPurchaseRequest({
    residenteId,
    username,
    email,
    telefone,
    cidade,
    morada,
    codigoPostal,

    countryCode:
      config.countryCode,

    phoneCountryCode:
      config.defaultPhoneCountryCode,

    criadoEm:
      dados.criadoEm,

    atualizadoEm:
      dados.atualizadoEm ||
      dados.dataAtualizacao,

    passwordAlteradaEm:
      dados.passwordAlteradaEm
  });

  const FingerPrint =
    gerarFingerPrint({
      posAutCode:
        config.posAutCode,

      TimeStamp,

      amount,

      merchantRef,

      merchantSession,

      posID:
        config.posID,

      currency,

      transactionCode:
        config.transactionCode
    });

  /*
  |--------------------------------------------------------------------------
  | Pedido oficial de compra 3DSServer
  |--------------------------------------------------------------------------
  */

  const pedido = {
    transactionCode:
      config.transactionCode,

    posID:
      config.posID,

    merchantRef,

    merchantSession,

    amount,

    currency,

    is3DSec: "1",

    urlMerchantResponse:
      config.merchantResponseUrl,

    languageMessages:
      config.language,

    FingerPrint,

    FingerPrintVersion: "1",

    TimeStamp,

    purchaseRequest
  };

  const corpo =
    new URLSearchParams(
      pedido
    ).toString();

  /*
   * Nunca mostrar FingerPrint, posAutCode
   * ou o conteúdo completo do purchaseRequest
   * nos logs.
   */
  const pedidoSeguro = {
    ...pedido,

    FingerPrint:
      "[REMOVIDO]",

    purchaseRequest:
      "[BASE64 REMOVIDO]"
  };

  return {
    url:
      config.url,

    corpo,

    pedidoSeguro,

    pagamento: {
      residenteId,
      username,
      pacote,
      tipo,
      valor,
      amount,
      email,
      telefone,
      cidade,
      morada,
      codigoPostal,
      merchantRef,
      merchantSession,
      TimeStamp
    },

    /*
     * Apenas para testes locais.
     * Não imprimir isto em produção.
     */
    dados3DSeguro: {
      ...dados3DS,
      email:
        dados3DS.email
          ? "[REMOVIDO]"
          : "",

      mobilePhone:
        dados3DS.mobilePhone
          ? "[REMOVIDO]"
          : undefined,

      workPhone:
        dados3DS.workPhone
          ? "[REMOVIDO]"
          : undefined
    }
  };
}
/*
|--------------------------------------------------------------------------
| Preparar números para o FingerPrint da resposta
|--------------------------------------------------------------------------
*/

function removerZerosEsquerda(valor) {
  const texto = String(valor ?? "")
    .replace(/\s+/g, "");

  if (!texto) {
    return "";
  }

  const numero = Number.parseInt(texto, 10);

  if (!Number.isFinite(numero)) {
    return texto;
  }

  return String(numero);
}

/*
|--------------------------------------------------------------------------
| Comparar valores Base64 de forma segura
|--------------------------------------------------------------------------
*/

function compararBase64Seguro(valorA, valorB) {
  try {
    const bufferA = Buffer.from(
      String(valorA || "").trim(),
      "base64"
    );

    const bufferB = Buffer.from(
      String(valorB || "").trim(),
      "base64"
    );

    if (
      bufferA.length === 0 ||
      bufferB.length === 0 ||
      bufferA.length !== bufferB.length
    ) {
      return false;
    }

    return crypto.timingSafeEqual(
      bufferA,
      bufferB
    );
  } catch {
    return false;
  }
}

/*
|--------------------------------------------------------------------------
| Validar FingerPrint de resposta da SISP
|--------------------------------------------------------------------------
|
| Para resposta de sucesso messageType 8:
|
| SHA512_BASE64(posAutCode)
| + messageType
| + merchantRespCP
| + merchantRespTid
| + merchantRespMerchantRef
| + merchantRespMerchantSession
| + merchantRespPurchaseAmount × 1000
| + merchantRespMessageID
| + merchantRespPan
| + merchantResp
| + merchantRespTimeStamp
| + campos opcionais, quando preenchidos
|--------------------------------------------------------------------------
*/

function validarResultFingerPrint(dados = {}) {
  const posAutCode = String(
    process.env.SISP_POS_AUT_CODE || ""
  ).trim();

  if (!posAutCode) {
    throw new Error(
      "SISP_POS_AUT_CODE não está configurado."
    );
  }

  const resultFingerPrint = String(
    dados.resultFingerPrint || ""
  ).trim();

  if (!resultFingerPrint) {
    return {
      valido: false,
      motivo:
        "A resposta não contém resultFingerPrint."
    };
  }

  const versao = String(
    dados.resultFingerPrintVersion || "1"
  ).trim();

  if (versao !== "1") {
    return {
      valido: false,
      motivo:
        `Versão de FingerPrint de resposta não suportada: ${versao}.`
    };
  }

  const messageType = String(
    dados.messageType || ""
  ).trim();

  /*
   * Esta função trata, nesta fase,
   * apenas a resposta de compra aprovada.
   */
  if (messageType !== "8") {
    return {
      valido: false,
      motivo:
        `messageType não suportado nesta validação: ${messageType}.`
    };
  }

  const valor = Number(
    dados.merchantRespPurchaseAmount || 0
  );

  if (
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    return {
      valido: false,
      motivo:
        "Montante de resposta inválido."
    };
  }

  const valorFingerprint = String(
    Math.trunc(valor * 1000)
  );

  const posAutCodeHash =
    gerarSHA512Base64(posAutCode);

  const merchantRespCP =
    removerZerosEsquerda(
      dados.merchantRespCP
    );

  const merchantRespTid =
    removerZerosEsquerda(
      dados.merchantRespTid
    );

  const merchantRef = String(
    dados.merchantRespMerchantRef || ""
  ).trim();

  const merchantSession = String(
    dados.merchantRespMerchantSession || ""
  ).trim();

  const messageID = String(
    dados.merchantRespMessageID || ""
  ).trim();

  const pan = String(
    dados.merchantRespPan || ""
  ).trim();

  const merchantResp = String(
    dados.merchantResp || ""
  ).trim();

  const timeStamp = String(
    dados.merchantRespTimeStamp || ""
  ).trim();

  const entityCode =
    removerZerosEsquerda(
      dados.merchantRespEntityCode
    );

  const referenceNumber =
    removerZerosEsquerda(
      dados.merchantRespReferenceNumber
    );

  const clientReceipt = String(
    dados.merchantRespClientReceipt || ""
  ).trim();

  const additionalErrorMessage = String(
    dados.merchantRespAdditionalErrorMessage || ""
  ).trim();

  const reloadCode = String(
    dados.merchantRespReloadCode || ""
  ).replace(/\s+/g, "");

  const mensagem =
    posAutCodeHash +
    messageType +
    merchantRespCP +
    merchantRespTid +
    merchantRef +
    merchantSession +
    valorFingerprint +
    messageID +
    pan +
    merchantResp +
    timeStamp +
    entityCode +
    referenceNumber +
    clientReceipt +
    additionalErrorMessage +
    reloadCode;

  const fingerprintCalculado =
    gerarSHA512Base64(mensagem);

  const valido =
    compararBase64Seguro(
      fingerprintCalculado,
      resultFingerPrint
    );

  return {
    valido,

    motivo: valido
      ? "FingerPrint de resposta válido."
      : "FingerPrint de resposta inválido.",

    versao
  };

}
/*
|--------------------------------------------------------------------------
| Consultar estado de uma transação (Test Cases 39, 40, 41)
|--------------------------------------------------------------------------
|
| "API Consultar Estado Transação.pdf" (Pacote de Desenvolvimento 4.7,
| SISP) confirma URL de teste/produção, HTTP Basic, Content-Type
| application/json e o corpo/resposta abaixo — mas NÃO declara
| explicitamente o método HTTP do endpoint.
|
| Decisão técnica (não é uma citação do PDF): usa-se POST porque o
| endpoint exige um corpo JSON, e um corpo não é semanticamente válido
| num GET/HEAD (a própria Fetch API rejeita corpo nesses métodos). Se a
| certificação SISP vier a confirmar um método diferente, esta função é
| o único ponto a ajustar.
|--------------------------------------------------------------------------
*/

function obterUrlConsultaEstadoSisp() {
  /*
   * Deliberadamente independente de NODE_ENV: o backend Hostinger corre
   * sempre em produção, mas a certificação SISP deve continuar a usar o
   * ambiente de teste até ser explicitamente ligado à produção. Por
   * segurança, qualquer valor que não seja exatamente "production"
   * (incluindo ausente/vazio) mantém-se em teste.
   */
  const producao =
    String(process.env.SISP_TRANSACTION_STATUS_ENV || "")
      .trim()
      .toLowerCase() === "production";

  const urlProducao = String(
    process.env.SISP_TRANSACTION_STATUS_PROD_URL ||
    "https://comerciante.vinti4.cv/pos/transaction-status"
  ).trim();

  const urlTeste = String(
    process.env.SISP_TRANSACTION_STATUS_TEST_URL ||
    "https://comerciante.teste.sisp.cv/pos/transaction-status"
  ).trim();

  return producao ? urlProducao : urlTeste;
}

async function consultarEstadoTransacao(merchantRef) {
  const merchantRefLimpo = String(merchantRef || "").trim();

  if (!merchantRefLimpo) {
    throw new Error(
      "merchantRef é obrigatório para consultar o estado da transação."
    );
  }

  const posID = String(
    process.env.SISP_POS_ID || ""
  ).trim();

  const posAuthCode = String(
    process.env.SISP_POS_AUT_CODE || ""
  ).trim();

  const portalId = String(
    process.env.SISP_PORTAL_ID || ""
  ).trim();

  const portalPassword = String(
    process.env.SISP_PORTAL_PASSWORD || ""
  ).trim();

  const camposEmFalta = [];

  if (!posID) {
    camposEmFalta.push("SISP_POS_ID");
  }

  if (!posAuthCode) {
    camposEmFalta.push("SISP_POS_AUT_CODE");
  }

  if (!portalId) {
    camposEmFalta.push("SISP_PORTAL_ID");
  }

  if (!portalPassword) {
    camposEmFalta.push("SISP_PORTAL_PASSWORD");
  }

  if (camposEmFalta.length > 0) {
    throw new Error(
      `Configuração da consulta de estado SISP incompleta: ${camposEmFalta.join(", ")}`
    );
  }

  const url = obterUrlConsultaEstadoSisp();

  const autorizacao = Buffer
    .from(`${portalId}:${portalPassword}`, "utf8")
    .toString("base64");

  let resposta;

  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${autorizacao}`
      },
      body: JSON.stringify({
        posID,
        posAuthCode,
        merchantRef: merchantRefLimpo
      })
    });
  } catch (erro) {
    console.error(
      "Erro de rede ao consultar estado da transação SISP:",
      {
        merchantRef: merchantRefLimpo,
        mensagem: erro.message
      }
    );

    throw new Error(
      "Não foi possível contactar o serviço de consulta de estado da SISP."
    );
  }

  const status = resposta.status;
  const texto = await resposta.text();

  if (status === 401 || status === 403) {
    console.error(
      "Falha de autenticação na consulta de estado SISP:",
      {
        merchantRef: merchantRefLimpo,
        status
      }
    );

    throw new Error(
      "Autenticação rejeitada pela SISP na consulta de estado."
    );
  }

  if (status === 404 || status === 405) {
    console.error(
      "Endpoint/método de consulta de estado SISP não reconhecido:",
      {
        merchantRef: merchantRefLimpo,
        status
      }
    );

    throw new Error(
      `A SISP respondeu ${status} — o endpoint ou o método HTTP da consulta de estado não foi reconhecido.`
    );
  }

  let dados;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    console.error(
      "Resposta não-JSON da consulta de estado SISP:",
      {
        merchantRef: merchantRefLimpo,
        status
      }
    );

    throw new Error(
      "A SISP devolveu uma resposta inválida para a consulta de estado."
    );
  }

  if (!dados) {
    throw new Error(
      "A SISP devolveu uma resposta vazia para a consulta de estado."
    );
  }

  if (
    dados.result === undefined &&
    dados.transactionSuccess === undefined
  ) {
    console.error(
      "Resposta da consulta de estado SISP sem os campos esperados:",
      {
        merchantRef: merchantRefLimpo,
        status
      }
    );

    throw new Error(
      "A resposta da SISP não contém os campos esperados da consulta de estado."
    );
  }

  return {
    status,

    result: Boolean(dados.result),

    msg: String(dados.msg || ""),

    transactionSuccess: Boolean(dados.transactionSuccess),

    transactionStatusDescription: String(
      dados.transactionStatusDescription || ""
    )
  };
}

module.exports = {
  prepararPedidoPagamento,
  validarResultFingerPrint,
  consultarEstadoTransacao
};