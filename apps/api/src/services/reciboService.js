/*
|--------------------------------------------------------------------------
| Dados do comerciante — nunca hardcoded, sempre de env vars
|--------------------------------------------------------------------------
|
| FRONTEND_URL já existe no projeto (usada no CORS, apps/api/src/app.js)
| — reaproveitada aqui para a URL da loja, em vez de duplicar o
| conceito. Pode conter várias origens separadas por vírgula; para
| exibição no recibo só a primeira é usada. MERCHANT_NAME/SUPPORT_PHONE/
| SUPPORT_EMAIL são novas, sem equivalente existente no projeto.
|--------------------------------------------------------------------------
*/

const COMERCIANTE_NOME =
  process.env.MERCHANT_NAME || "NOS ZONA SMART";

const COMERCIANTE_TELEFONE =
  process.env.SUPPORT_PHONE || "";

const COMERCIANTE_EMAIL =
  process.env.SUPPORT_EMAIL || "";

const COMERCIANTE_URL = String(
  process.env.FRONTEND_URL || ""
)
  .split(",")[0]
  .trim();

/*
|--------------------------------------------------------------------------
| Construir os dados do recibo
|--------------------------------------------------------------------------
|
| Função pura — sem BD, sem rede. Nunca lê posAutCode, FingerPrint, PAN,
| Portal Password ou qualquer segredo SISP; só campos já pensados para
| exibição em `pagamentos`/`residentes`.
|--------------------------------------------------------------------------
*/

function construirRecibo({ pagamento, residente }) {
  const descricaoServico =
    pagamento.tipo === "pacote"
      ? (pagamento.pacote || "Pacote")
      : "Recarga de saldo";

  const valor = Number(pagamento.valor || 0);

  const dccAtivo =
    String(pagamento.dcc || "")
      .trim()
      .toUpperCase() === "Y";

  return {
    comerciante: {
      nome: COMERCIANTE_NOME,
      telefone: COMERCIANTE_TELEFONE,
      email: COMERCIANTE_EMAIL,
      url: COMERCIANTE_URL
    },

    cliente: {
      nome: residente?.nome || "",
      email: residente?.email || ""
    },

    transacao: {
      merchantRef: pagamento.merchantRef,
      estado: "Pago",
      tipo: pagamento.tipo,
      descricao: descricaoServico,
      valor,
      moeda: "CVE",

      /*
       * Datas distintas: dataTransacao é quando o pagamento foi
       * iniciado; dataPrestacaoServico é quando o serviço foi
       * efetivamente prestado/ativado — para os nossos serviços
       * digitais (recarga/pacote), é o mesmo momento em que o
       * pagamento foi confirmado (confirmadoEm).
       */
      dataTransacao: pagamento.criadoEm,
      dataPrestacaoServico:
        pagamento.confirmadoEm || pagamento.criadoEm
    },

    dcc: dccAtivo
      ? {
          valorOriginalCVE: valor,
          dccRate: pagamento.dccRate || "",
          dccMarkup: pagamento.dccMarkup || "",
          dccCurrency: pagamento.dccCurrency || "",
          dccAmount: pagamento.dccAmount || "",
          avisos: [
            `I have been offered choice of currencies and agreed to pay in ${pagamento.dccCurrency || ""}.`,
            "Dynamic Currency Conversion (DCC) offered by rede vinti4.",
            "Exchange rate provided by Banco de Cabo Verde."
          ]
        }
      : null
  };
}

module.exports = {
  construirRecibo
};
