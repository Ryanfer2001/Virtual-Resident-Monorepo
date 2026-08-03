const sispService = require("../services/sispService");
const pagamentoModel = require("../models/pagamentoModel");

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
    "http://127.0.0.1:5500";

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

function paginaRetornoPagamento({
  titulo,
  mensagem,
  sucesso
}) {
  const dashboardUrl =
    process.env.FRONTEND_DASHBOARD_URL ||
    "http://127.0.0.1:5500/#dashboard";

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
  </div>
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
    const preparacao =
      sispService.prepararPedidoPagamento(
        req.body || {}
      );

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
     * Confirma o valor devolvido.
     */
    const valorGuardado = Number(
      pagamento.valor || 0
    );

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

    /*
     * Retorno aprovado observado no ambiente de teste:
     *
     * messageType = "8"
     * merchantResp = "C"
     * campos de erro vazios
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
      !codigoErro &&
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
      Boolean(codigoErro) ||
      Boolean(descricaoErro) ||
      Boolean(detalheErro);

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
      const resultado =
        await pagamentoModel.concluirPagamentoEAplicarRecarga({
          merchantRef,

          codigoResposta:
            merchantResp ||
            messageType,

          descricaoResposta:
            "Pagamento aprovado pela SISP."
        });

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
              true
          })
        );
    }

    /*
     * Pagamento recusado, cancelado
     * ou com erro técnico.
     */
    if (pagamentoFalhado) {
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

module.exports = {
  iniciarPagamento,
  processarRetorno
};