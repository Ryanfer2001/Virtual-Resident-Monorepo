const nodemailer = require("nodemailer");

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
     * Necessário apenas no teu ambiente local,
     * porque a rede apresentou um certificado
     * autoassinado na ligação SMTP.
     *
     * Em produção, esta opção deve voltar para true
     * ou deve ser removida depois de corrigir a cadeia
     * de certificados do servidor/rede.
     */
    tls: {
      servername: SMTP_HOST.trim(),
      rejectUnauthorized: false
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

module.exports = {
  enviarEmailRecuperacao
};