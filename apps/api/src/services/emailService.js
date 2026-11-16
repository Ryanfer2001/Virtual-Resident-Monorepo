const nodemailer = require("nodemailer");
const reciboPdfService = require("./reciboPdfService");
const emailReciboTemplate = require("./emailReciboTemplate");

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

  /*
   * recibo.pdf é gerado a partir do mesmo objeto `recibo` do HTML/texto
   * abaixo, e validado (Buffer não vazio a começar por "%PDF-") antes de
   * ser anexado. Se a geração falhar, o email continua a ser enviado sem
   * o anexo — nunca bloqueia o envio nem toca no pagamento — mas a falha
   * fica registada e é devolvida em `pdfAnexado: false`, para quem chama
   * nunca a tratar como entrega do PDF concluída.
   */
  let pdfRecibo = null;

  try {
    const pdf = reciboPdfService.gerarReciboPdf(recibo);

    if (
      !Buffer.isBuffer(pdf) ||
      pdf.length === 0 ||
      pdf.subarray(0, 5).toString("latin1") !== "%PDF-"
    ) {
      throw new Error("O gerador não devolveu um PDF válido.");
    }

    pdfRecibo = pdf;
  } catch (erroPdf) {
    console.error(
      "RECIBO PDF NÃO GERADO — o email do recibo vai ser enviado SEM recibo.pdf:",
      {
        merchantRef: recibo.transacao?.merchantRef,
        mensagem: erroPdf.message
      }
    );
  }

  /*
   * HTML e texto vêm do template institucional, montado a partir do
   * mesmo objeto `recibo` do PDF.
   */
  const { html, texto } = emailReciboTemplate.montarEmailRecibo({
    recibo,
    nome: nomeResidente,
    pdfAnexado: Boolean(pdfRecibo)
  });

  const anexos = pdfRecibo
    ? [
        {
          filename: "recibo.pdf",
          content: pdfRecibo,
          contentType: "application/pdf"
        }
      ]
    : [];

  const resultado = await transporter.sendMail({
    from: `"NOSZONA Smart" <${process.env.SMTP_USER.trim()}>`,
    to: emailDestino,
    subject: assunto,
    text: texto,
    html,
    attachments: anexos
  });

  /*
   * Registo verificável da entrega (sem email nem dados do cliente):
   * permite confirmar nos logs da Hostinger que o SMTP aceitou a
   * mensagem e se levava o anexo.
   */
  console.log("Email do recibo aceite pelo SMTP:", {
    merchantRef: recibo.transacao?.merchantRef,
    messageId: resultado?.messageId,
    aceites: resultado?.accepted?.length ?? null,
    rejeitados: resultado?.rejected?.length ?? null,
    pdfAnexado: Boolean(pdfRecibo),
    pdfBytes: pdfRecibo ? pdfRecibo.length : 0
  });

  return {
    ...resultado,
    pdfAnexado: Boolean(pdfRecibo)
  };
}

module.exports = {
  enviarEmailRecuperacao,
  enviarEmailRecibo
};