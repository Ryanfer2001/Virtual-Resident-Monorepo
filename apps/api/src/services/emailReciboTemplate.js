/*
|--------------------------------------------------------------------------
| Template do email "Confirmação de Pagamento" (HTML + texto)
|--------------------------------------------------------------------------
|
| Construído só a partir do objeto `recibo` (reciboService.construirRecibo)
| — o mesmo que alimenta o recibo.pdf. HTML em tabelas com estilos
| inline (Gmail/Outlook), largura máxima 600px, media query para
| telemóvel. As imagens (logótipo e vinti4) são servidas pelo frontend
| público (recibo.comerciante.url); sem URL, o cabeçalho cai para texto.
|--------------------------------------------------------------------------
*/

const COR = {
  navy: "#061827",
  navyMid: "#0b2e4a",
  azul: "#0a6fa8",
  ciano: "#00c3e3",
  sucesso: "#0ea472",
  sucessoFundo: "#e7f7f0",
  fundo: "#eef3f8",
  borda: "#d4dee9",
  texto: "#0f1f2e",
  suave: "#5f7186"
};

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatarData(data) {
  return data
    ? new Date(data).toLocaleString("pt-PT", { timeZone: "Atlantic/Cape_Verde" })
    : "";
}

function formatarCVE(valor) {
  return `${Number(valor || 0).toLocaleString("pt-PT")} CVE`;
}

/*
 * URL oficial da loja normalizado: origem para as imagens, e o endereço
 * curto (sem protocolo nem "/" final) como texto visível da ligação.
 */
function urlLoja(url) {
  try {
    const u = new URL(String(url || "").trim());
    const href = `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
    return { origem: u.origin, href, texto: href.replace(/^https?:\/\//, "") };
  } catch {
    return null;
  }
}

function montarEmailRecibo({ recibo, nome, pdfAnexado, imagens = {} }) {
  const { comerciante, cliente, transacao, dcc } = recibo;
  const loja = urlLoja(comerciante.url);
  const logoSrc = imagens.logo || (loja ? `${loja.origem}/img/email/cvr-logo-email.png` : "");
  const vinti4Src = imagens.vinti4 || (loja ? `${loja.origem}/img/payment/oficial-sisp/vinti4.png` : "");
  const nomeCliente = String(nome || cliente.nome || "").trim();

  const linhas = [
    ["Referência", transacao.merchantRef],
    ["Serviço", transacao.descricao],
    ["Cliente", cliente.nome],
    ["Email do cliente", cliente.email],
    ["Data da transação", formatarData(transacao.dataTransacao)],
    ["Data de prestação / ativação", formatarData(transacao.dataPrestacaoServico)]
  ].filter(([, valor]) => valor);

  const linhasDcc = dcc
    ? [
        ["Valor original", formatarCVE(dcc.valorOriginalCVE)],
        ["Taxa de conversão / Conversion rate", `1 ${dcc.dccCurrency} = ${dcc.dccRate} CVE`],
        ["DCC Markup", `${dcc.dccMarkup} %`],
        ["Moeda / Currency", dcc.dccCurrency],
        ["Valor cobrado / Amount charged", `${dcc.dccAmount} ${dcc.dccCurrency}`]
      ]
    : [];

  const notaAnexo = pdfAnexado
    ? "O seu recibo segue em anexo a este email, no ficheiro recibo.pdf."
    : "Pode descarregar o recibo em PDF na sua conta.";

  const linhaTabela = ([rotulo, valor], ultima) => `
              <tr>
                <td class="rotulo" width="44%" style="padding:11px 0;${ultima ? "" : `border-bottom:1px solid ${COR.borda};`}font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COR.suave};vertical-align:top;">${escapar(rotulo)}</td>
                <td class="valor" style="padding:11px 0;${ultima ? "" : `border-bottom:1px solid ${COR.borda};`}font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COR.texto};font-weight:bold;text-align:right;vertical-align:top;word-break:break-word;">${escapar(valor)}</td>
              </tr>`;

  const contactos = [
    comerciante.telefone
      ? `Tel: <a href="tel:${escapar(String(comerciante.telefone).replace(/[^\d+]/g, ""))}" style="color:${COR.azul};text-decoration:none;">${escapar(comerciante.telefone)}</a>`
      : "",
    comerciante.email
      ? `<a href="mailto:${escapar(comerciante.email)}" style="color:${COR.azul};text-decoration:none;">${escapar(comerciante.email)}</a>`
      : "",
    loja
      ? `<a href="${escapar(loja.href)}" style="color:${COR.azul};text-decoration:none;">${escapar(loja.texto)}</a>`
      : ""
  ].filter(Boolean).join(`&nbsp;&nbsp;|&nbsp;&nbsp;`);

  const html = `<!DOCTYPE html>
<html lang="pt" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Confirmação de Pagamento</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body { margin:0; padding:0; }
  a { color:${COR.azul}; }
  @media only screen and (max-width:620px) {
    .moldura { padding:16px 10px !important; }
    .conteudo { padding:24px 20px !important; }
    .rodape { padding:20px 20px 24px !important; }
    .cabecalho { padding:22px 20px !important; }
    .logo { width:220px !important; height:auto !important; }
    .titulo { font-size:21px !important; }
    .valor-total { font-size:22px !important; }
    .rotulo, .valor { font-size:13px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${COR.navyMid};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${COR.navyMid};">
    Pagamento confirmado — referência ${escapar(transacao.merchantRef)}. ${escapar(notaAnexo)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COR.navyMid}" style="background-color:${COR.navyMid};">
    <tr>
      <td class="moldura" align="center" style="padding:36px 16px;">
        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:14px;">

          <!-- Cabeçalho -->
          <tr>
            <td class="cabecalho" align="center" bgcolor="${COR.navy}" style="background-color:${COR.navy};padding:26px 32px;border-radius:14px 14px 0 0;">
              ${logoSrc
                ? `<img class="logo" src="${escapar(logoSrc)}" width="280" height="72" alt="Cabo Verde Virtual Resident" style="display:block;width:280px;height:auto;max-width:100%;border:0;outline:none;text-decoration:none;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;">`
                : `<span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#ffffff;">Cabo Verde Virtual Resident</span>`}
            </td>
          </tr>
          <tr>
            <td height="4" bgcolor="${COR.ciano}" style="background-color:${COR.ciano};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td class="conteudo" style="padding:32px 36px 8px;">
              <h1 class="titulo" style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;color:${COR.navy};">Confirmação de Pagamento</h1>
              <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COR.suave};">Referência ${escapar(transacao.merchantRef)}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COR.sucessoFundo}" style="background-color:${COR.sucessoFundo};border-radius:10px;">
                <tr>
                  <td width="52" valign="middle" style="padding:16px 0 16px 18px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td width="34" height="34" align="center" valign="middle" bgcolor="${COR.sucesso}" style="background-color:${COR.sucesso};border-radius:17px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">&#10003;</td>
                    </tr></table>
                  </td>
                  <td valign="middle" style="padding:16px 18px 16px 12px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0;font-size:16px;font-weight:bold;color:#0b6b4b;">Pagamento confirmado</p>
                    <p style="margin:3px 0 0;font-size:13px;color:#2f5d4d;">A sua transação foi concluída com sucesso.</p>
                  </td>
                </tr>
              </table>

              <p style="margin:26px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${COR.texto};">Olá${nomeCliente ? `, ${escapar(nomeCliente)}` : ""},</p>
              <p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COR.texto};">Recebemos o seu pagamento. Seguem os detalhes da transação:</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhas.map((l, i) => linhaTabela(l, i === linhas.length - 1)).join("")}
              </table>

              <!-- Valor e estado -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f8fc" style="background-color:#f2f8fc;border:1px solid ${COR.borda};border-radius:10px;margin-top:18px;">
                <tr>
                  <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0;font-size:12px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:${COR.suave};">Valor pago</p>
                    <p class="valor-total" style="margin:4px 0 0;font-size:26px;font-weight:bold;color:${COR.navy};">${escapar(formatarCVE(transacao.valor))}</p>
                  </td>
                  <td align="right" valign="middle" style="padding:16px 18px;">
                    <span style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:${COR.sucesso};font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;color:#ffffff;">${escapar(transacao.estado)}</span>
                  </td>
                </tr>
              </table>

              ${dcc ? `
              <!-- DCC -->
              <p style="margin:26px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:${COR.azul};">Dynamic Currency Conversion (DCC)</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${linhasDcc.map((l, i) => linhaTabela(l, i === linhasDcc.length - 1)).join("")}
              </table>
              <p style="margin:12px 0 0;padding:12px 14px;background-color:#f7f9fb;border-left:3px solid ${COR.ciano};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${COR.suave};">${dcc.avisos.map(escapar).join("<br>")}</p>` : ""}

              <!-- Anexo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border:1px dashed #9fb3c8;border-radius:10px;">
                <tr>
                  <td width="58" valign="middle" style="padding:14px 0 14px 16px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                      <td width="40" height="46" align="center" valign="middle" bgcolor="#d64545" style="background-color:#d64545;border-radius:6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#ffffff;">PDF</td>
                    </tr></table>
                  </td>
                  <td valign="middle" style="padding:14px 16px 14px 12px;font-family:Arial,Helvetica,sans-serif;">
                    <p style="margin:0;font-size:14px;font-weight:bold;color:${COR.texto};">${pdfAnexado ? "recibo.pdf em anexo" : "Recibo em PDF"}</p>
                    <p style="margin:3px 0 0;font-size:13px;line-height:1.5;color:${COR.suave};">${escapar(notaAnexo)} Também o pode descarregar a qualquer momento na sua conta, em <strong>Histórico de Pagamentos</strong>.</p>
                  </td>
                </tr>
              </table>

              <p style="margin:26px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COR.texto};">Obrigado por utilizar o Cabo Verde Virtual Resident.<br><span style="color:${COR.suave};">Em caso de dúvida, contacte o nosso serviço de apoio.</span></p>
            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td class="rodape" style="padding:24px 36px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COR.borda};">
                <tr>
                  <td style="padding-top:18px;font-family:Arial,Helvetica,sans-serif;">
                    ${vinti4Src ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;"><tr>
                      <td valign="middle"><img src="${escapar(vinti4Src)}" width="38" height="36" alt="rede vinti4" style="display:block;width:38px;height:auto;border:0;"></td>
                      <td valign="middle" style="padding-left:10px;font-size:12px;color:${COR.suave};">Pagamento processado de forma segura pela rede vinti4.</td>
                    </tr></table>` : ""}
                    <p style="margin:0;font-size:13px;font-weight:bold;color:${COR.navy};">${escapar(comerciante.nome)}</p>
                    ${contactos ? `<p style="margin:5px 0 0;font-size:12px;line-height:1.6;color:${COR.suave};">${contactos}</p>` : ""}
                    <p style="margin:12px 0 0;font-size:11px;line-height:1.5;color:#8a9bb0;">Este email foi enviado automaticamente na sequência do seu pagamento. Por favor, não responda diretamente a esta mensagem.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;

  const texto = [
    "CONFIRMAÇÃO DE PAGAMENTO",
    "",
    "Pagamento confirmado — a sua transação foi concluída com sucesso.",
    "",
    `Olá${nomeCliente ? `, ${nomeCliente}` : ""},`,
    "",
    ...linhas.map(([r, v]) => `${r}: ${v}`),
    `Valor pago: ${formatarCVE(transacao.valor)}`,
    `Estado: ${transacao.estado}`,
    ...(dcc ? ["", "Dynamic Currency Conversion (DCC)", ...linhasDcc.map(([r, v]) => `${r}: ${v}`), "", ...dcc.avisos] : []),
    "",
    notaAnexo,
    "Também o pode descarregar na sua conta, em Histórico de Pagamentos.",
    "",
    "Obrigado por utilizar o Cabo Verde Virtual Resident.",
    "",
    "--",
    comerciante.nome,
    ...[comerciante.telefone ? `Tel: ${comerciante.telefone}` : "", comerciante.email, loja ? loja.href : ""].filter(Boolean)
  ].join("\n");

  return { html, texto };
}

module.exports = { montarEmailRecibo };
