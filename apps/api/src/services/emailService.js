const nodemailer = require("nodemailer");

/*
|--------------------------------------------------------------------------
| Escapar valores antes de os inserir no HTML do email
|--------------------------------------------------------------------------
|
| Mesmo tratamento já usado nas páginas HTML de retorno do pagamento
| (apps/api/src/controllers/pagamentoController.js) — todo o conteúdo
| dinâmico do email de recibo (nome, dados do comerciante/cliente,
| valores, campos DCC) passa por aqui antes de entrar na string HTML.
|--------------------------------------------------------------------------
*/

function escaparHtmlEmail(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function criarTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS
  } = process.env;

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS
  ) {
    throw new Error(
      "Configuração SMTP incompleta no ficheiro .env."
    );
  }

  return nodemailer.createTransport({
    host: SMTP_HOST.trim(),
    port: Number(SMTP_PORT),
    secure:
      String(SMTP_SECURE).toLowerCase() === "true",

    auth: {
      user: SMTP_USER.trim(),
      pass: SMTP_PASS.trim()
    },

    /*
     * "rejectUnauthorized: false" só se aplica fora de produção, porque a
     * rede local apresentou um certificado autoassinado na ligação SMTP.
     * Em produção a verificação do certificado fica sempre ativa — sem
     * isto, a ligação ficava vulnerável a man-in-the-middle no envio do
     * link de recuperação de password.
     */
    tls: {
      servername: SMTP_HOST.trim(),
      rejectUnauthorized: process.env.NODE_ENV === "production"
    }
  });
}

async function enviarEmailRecuperacao({
  destinatario,
  nome,
  linkRecuperacao
}) {
  if (!destinatario) {
    throw new Error(
      "Destinatário do email não foi fornecido."
    );
  }

  if (!linkRecuperacao) {
    throw new Error(
      "Link de recuperação não foi fornecido."
    );
  }

  const transporter = criarTransporter();

  const emailDestino = String(destinatario).trim();
  const nomeResidente = String(nome || "").trim();

  const assunto =
    "Recuperação de password - NOSZONA Smart";

  const texto = `
Olá ${nomeResidente},

Recebemos um pedido para recuperar a tua password.

Clica no link abaixo para criar uma nova password:

${linkRecuperacao}

Este link é válido durante 1 hora.

Se não foste tu que fizeste este pedido, ignora este email.

Equipa NOSZONA Smart
Smart City Cabo Verde
  `.trim();

  const html = `
    <div
      style="
        font-family: Arial, Helvetica, sans-serif;
        color: #1f2937;
        line-height: 1.6;
        max-width: 620px;
        margin: 0 auto;
        padding: 24px;
      "
    >
      <div
        style="
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 28px;
          background: #ffffff;
        "
      >
        <h2
          style="
            color: #007ea7;
            margin-top: 0;
            margin-bottom: 20px;
          "
        >
          Recuperação de password
        </h2>

        <p>Olá ${nomeResidente},</p>

        <p>
          Recebemos um pedido para recuperar a tua password.
        </p>

        <p>
          Clica no botão abaixo para criar uma nova password:
        </p>

        <p style="margin: 30px 0;">
          <a
            href="${linkRecuperacao}"
            style="
              display: inline-block;
              background: #00a8c8;
              color: #ffffff;
              padding: 12px 22px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: bold;
            "
          >
            Redefinir password
          </a>
        </p>

        <p>
          Este link é válido durante 1 hora.
        </p>

        <p>
          Se não foste tu que fizeste este pedido,
          ignora este email.
        </p>

        <hr
          style="
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 28px 0;
          "
        >

        <p style="margin-bottom: 0;">
          Equipa NOSZONA Smart<br>
          Smart City Cabo Verde
        </p>
      </div>
    </div>
  `;

  const resultado = await transporter.sendMail({
    from: `"NOSZONA Smart" <${process.env.SMTP_USER.trim()}>`,
    to: emailDestino,
    subject: assunto,
    text: texto,
    html
  });

  return resultado;
}

/*
|--------------------------------------------------------------------------
| Email de recibo de pagamento
|--------------------------------------------------------------------------
|
| `recibo` vem sempre de reciboService.construirRecibo — nunca contém
| PAN, FingerPrint, posAutCode ou qualquer segredo SISP, só dados já
| pensados para exibição. Esta função nunca é chamada antes do
| pagamento estar confirmado na BD; uma falha aqui é só registada pelo
| chamador, nunca reverte o pagamento.
|--------------------------------------------------------------------------
*/

async function enviarEmailRecibo({
  destinatario,
  nome,
  recibo
}) {
  if (!destinatario) {
    throw new Error(
      "Destinatário do email não foi fornecido."
    );
  }

  if (!recibo) {
    throw new Error(
      "Dados do recibo não foram fornecidos."
    );
  }

  const transporter = criarTransporter();

  const emailDestino = String(destinatario).trim();
  const nomeResidente = String(nome || "").trim();

  const assunto =
    "Recibo de Pagamento - Cabo Verde Virtual Resident";

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

  const valorFormatado =
    `${Number(recibo.transacao.valor || 0).toLocaleString("pt-PT")} CVE`;

  const linhasResumo = [
    ["Serviço", recibo.transacao.descricao],
    ["Referência", recibo.transacao.merchantRef],
    ["Data da transação", dataTransacaoFormatada],
    ["Data de prestação do serviço", dataPrestacaoFormatada],
    ["Valor", valorFormatado],
    ["Estado", recibo.transacao.estado]
  ];

  const linhasDcc = recibo.dcc
    ? [
        ["Valor original", `${Number(recibo.dcc.valorOriginalCVE || 0).toLocaleString("pt-PT")} CVE`],
        ["Taxa de conversão / Currency Conversion Rate", `1 ${recibo.dcc.dccCurrency} = ${recibo.dcc.dccRate} CVE`],
        ["DCC Markup", `${recibo.dcc.dccMarkup} %`],
        ["Valor cobrado", `${recibo.dcc.dccAmount} ${recibo.dcc.dccCurrency}`]
      ]
    : [];

  const texto = `
Pagamento confirmado

Olá, ${nomeResidente},

Recebemos o seu pagamento com sucesso.

${recibo.comerciante.nome}
${recibo.comerciante.telefone ? `Tel: ${recibo.comerciante.telefone}\n` : ""}${recibo.comerciante.email ? `${recibo.comerciante.email}\n` : ""}${recibo.comerciante.url ? `${recibo.comerciante.url}\n` : ""}
${linhasResumo.map(([rotulo, valor]) => `${rotulo}: ${valor}`).join("\n")}
${linhasDcc.length ? "\n" + linhasDcc.map(([rotulo, valor]) => `${rotulo}: ${valor}`).join("\n") + "\n\n" + recibo.dcc.avisos.join("\n") : ""}

Obrigado por utilizar o Cabo Verde Virtual Resident.
Em caso de dúvida, contacte o nosso serviço de apoio.
  `.trim();

  const linhaHtml = ([rotulo, valor]) => `
    <tr>
      <td style="padding: 6px 0; color: #607080;">${escaparHtmlEmail(rotulo)}</td>
      <td style="padding: 6px 0; text-align: right;"><strong>${escaparHtmlEmail(valor)}</strong></td>
    </tr>
  `;

  const linhasResumoHtml = linhasResumo.map(linhaHtml).join("");

  const blocoDccHtml = recibo.dcc
    ? `
      <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-top: 10px;">
        ${linhasDcc.map(linhaHtml).join("")}
      </table>

      <p style="font-size: 12px; color: #607080; margin-top: 10px;">
        ${recibo.dcc.avisos.map(escaparHtmlEmail).join("<br>")}
      </p>
    `
    : "";

  const html = `
    <div
      style="
        font-family: Arial, Helvetica, sans-serif;
        color: #1f2937;
        line-height: 1.6;
        max-width: 620px;
        margin: 0 auto;
        padding: 24px;
      "
    >
      <div
        style="
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 28px;
          background: #ffffff;
        "
      >
        <h2
          style="
            color: #007ea7;
            margin-top: 0;
            margin-bottom: 20px;
          "
        >
          Pagamento confirmado
        </h2>

        <p>Olá, ${escaparHtmlEmail(nomeResidente)},</p>

        <p>
          Recebemos o seu pagamento com sucesso.
        </p>

        <p style="margin: 2px 0;"><strong>${escaparHtmlEmail(recibo.comerciante.nome)}</strong></p>
        ${recibo.comerciante.telefone ? `<p style="margin: 2px 0; font-size: 13px; color: #607080;">Tel: ${escaparHtmlEmail(recibo.comerciante.telefone)}</p>` : ""}
        ${recibo.comerciante.email ? `<p style="margin: 2px 0; font-size: 13px; color: #607080;">${escaparHtmlEmail(recibo.comerciante.email)}</p>` : ""}
        ${recibo.comerciante.url ? `<p style="margin: 2px 0 14px; font-size: 13px; color: #607080;">${escaparHtmlEmail(recibo.comerciante.url)}</p>` : ""}

        <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-top: 16px;">
          ${linhasResumoHtml}
        </table>

        ${blocoDccHtml}

        <hr
          style="
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 28px 0;
          "
        >

        <p>
          Obrigado por utilizar o Cabo Verde Virtual Resident.
        </p>

        <p style="margin-bottom: 0;">
          Em caso de dúvida, contacte o nosso serviço de apoio.
        </p>
      </div>
    </div>
  `;

  const resultado = await transporter.sendMail({
    from: `"NOSZONA Smart" <${process.env.SMTP_USER.trim()}>`,
    to: emailDestino,
    subject: assunto,
    text: texto,
    html
  });

  return resultado;
}

module.exports = {
  enviarEmailRecuperacao,
  enviarEmailRecibo
};