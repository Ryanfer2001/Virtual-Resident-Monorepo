/*
|--------------------------------------------------------------------------
| Gerar recibo.pdf a partir do objeto recibo
|--------------------------------------------------------------------------
|
| `recibo` vem sempre de reciboService.construirRecibo — o mesmo objeto
| usado pela página de retorno e pelo email, para os três nunca
| divergirem. Nunca contém PAN, CVV, FingerPrint, posAutCode, passwords
| ou qualquer segredo SISP.
|
| Gerador PDF 1.4 mínimo, sem dependências: só texto e linhas, com as
| fontes standard Helvetica/Helvetica-Bold em WinAnsiEncoding (cobre os
| acentos portugueses). Função pura — sem BD, sem rede, nunca altera o
| estado do pagamento.
|--------------------------------------------------------------------------
*/

const PAGINA_LARGURA = 595.28;
const PAGINA_ALTURA = 841.89;
const MARGEM = 50;
const MARGEM_INFERIOR = 60;
const COLUNA_VALOR = 235;

const COR_TITULO = "0 0.494 0.655";
const COR_ROTULO = "0.376 0.439 0.502";
const COR_TEXTO = "0.122 0.161 0.216";
const COR_LINHA = "0.898 0.906 0.922";

/*
 * Caracteres Unicode que existem em WinAnsi (cp1252) fora do intervalo
 * Latin-1. Tudo o resto fora de cp1252 é substituído por "?".
 */
const MAPA_CP1252 = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84,
  "…": 0x85, "†": 0x86, "‡": 0x87, "ˆ": 0x88,
  "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c,
  "Ž": 0x8e, "‘": 0x91, "’": 0x92, "“": 0x93,
  "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97,
  "˜": 0x98, "™": 0x99, "š": 0x9a, "›": 0x9b,
  "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f
};

function textoPdf(valor) {
  let saida = "";

  for (const caractere of String(valor ?? "")) {
    let codigo = caractere.codePointAt(0);

    if (
      codigo === 0x00a0 ||
      codigo === 0x2007 ||
      codigo === 0x202f
    ) {
      /*
       * toLocaleString("pt-PT") usa espaços finos/não separáveis como
       * separador de milhares.
       */
      codigo = 0x20;
    } else if (MAPA_CP1252[caractere]) {
      codigo = MAPA_CP1252[caractere];
    } else if (
      codigo < 0x20 ||
      (codigo > 0x7e && codigo < 0xa0) ||
      codigo > 0xff
    ) {
      codigo = 0x3f;
    }

    const byte = String.fromCharCode(codigo);

    saida +=
      byte === "(" || byte === ")" || byte === "\\"
        ? `\\${byte}`
        : byte;
  }

  return saida;
}

/*
 * Quebra de linha aproximada (largura média de um caractere Helvetica
 * ≈ 0,55 em) — suficiente para os campos curtos do recibo.
 */
function quebrarTexto(texto, tamanho, larguraDisponivel) {
  const maxCaracteres = Math.max(
    10,
    Math.floor(larguraDisponivel / (tamanho * 0.55))
  );

  const linhas = [];
  let atual = "";

  for (const palavra of String(texto ?? "").split(/\s+/)) {
    if (!palavra) {
      continue;
    }

    let resto = palavra;

    while (resto.length > maxCaracteres) {
      if (atual) {
        linhas.push(atual);
        atual = "";
      }

      linhas.push(resto.slice(0, maxCaracteres));
      resto = resto.slice(maxCaracteres);
    }

    const candidato = atual ? `${atual} ${resto}` : resto;

    if (candidato.length > maxCaracteres) {
      linhas.push(atual);
      atual = resto;
    } else {
      atual = candidato;
    }
  }

  if (atual || !linhas.length) {
    linhas.push(atual);
  }

  return linhas;
}

function formatarData(data) {
  return data
    ? new Date(data).toLocaleString("pt-PT", {
        timeZone: "Atlantic/Cape_Verde"
      })
    : "";
}

function formatarCVE(valor) {
  return `${Number(valor || 0).toLocaleString("pt-PT")} CVE`;
}

/*
|--------------------------------------------------------------------------
| Desenho das páginas (operadores de conteúdo PDF)
|--------------------------------------------------------------------------
*/

function criarDesenho() {
  const paginas = [[]];
  let y = PAGINA_ALTURA - MARGEM;

  function atual() {
    return paginas[paginas.length - 1];
  }

  function garantirEspaco(altura) {
    if (y - altura < MARGEM_INFERIOR) {
      paginas.push([]);
      y = PAGINA_ALTURA - MARGEM;
    }
  }

  function texto(x, tamanho, conteudo, { negrito = false, cor = COR_TEXTO } = {}) {
    atual().push(
      `BT /${negrito ? "F2" : "F1"} ${tamanho} Tf ${cor} rg ${x} ${y.toFixed(2)} Td (${textoPdf(conteudo)}) Tj ET`
    );
  }

  function avancar(altura) {
    y -= altura;
  }

  function linhaHorizontal() {
    garantirEspaco(14);
    avancar(8);
    atual().push(
      `${COR_LINHA} RG 0.8 w ${MARGEM} ${y.toFixed(2)} m ${(PAGINA_LARGURA - MARGEM).toFixed(2)} ${y.toFixed(2)} l S`
    );
    avancar(16);
  }

  function paragrafo(conteudo, tamanho, opcoes = {}) {
    for (const linha of quebrarTexto(
      conteudo,
      tamanho,
      PAGINA_LARGURA - MARGEM * 2
    )) {
      garantirEspaco(tamanho + 4);
      texto(MARGEM, tamanho, linha, opcoes);
      avancar(tamanho + 4);
    }
  }

  function linhaTabela(rotulo, valor) {
    const tamanho = 10;

    const linhasRotulo = quebrarTexto(
      rotulo,
      tamanho,
      COLUNA_VALOR - MARGEM - 10
    );

    const linhasValor = quebrarTexto(
      valor,
      tamanho,
      PAGINA_LARGURA - MARGEM - COLUNA_VALOR
    );

    const total = Math.max(linhasRotulo.length, linhasValor.length);

    garantirEspaco(total * (tamanho + 4) + 6);

    for (let i = 0; i < total; i += 1) {
      if (linhasRotulo[i]) {
        texto(MARGEM, tamanho, linhasRotulo[i], { cor: COR_ROTULO });
      }

      if (linhasValor[i]) {
        texto(COLUNA_VALOR, tamanho, linhasValor[i], { negrito: true });
      }

      avancar(tamanho + 4);
    }

    avancar(4);
  }

  function seccao(titulo) {
    garantirEspaco(36);
    avancar(10);
    texto(MARGEM, 12, titulo, { negrito: true, cor: COR_TITULO });
    avancar(20);
  }

  return {
    paginas,
    texto,
    avancar,
    linhaHorizontal,
    paragrafo,
    linhaTabela,
    seccao,
    garantirEspaco
  };
}

/*
|--------------------------------------------------------------------------
| Montar o ficheiro PDF (objetos + xref)
|--------------------------------------------------------------------------
*/

function montarPdf(paginasConteudo, titulo) {
  const objetos = [];

  const adicionar = (corpo) => {
    objetos.push(corpo);
    return objetos.length;
  };

  const idCatalogo = adicionar(null);
  const idPaginas = adicionar(null);

  const idFonteNormal = adicionar(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  );

  const idFonteNegrito = adicionar(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  );

  const idInfo = adicionar(
    `<< /Title (${textoPdf(titulo)}) /Producer (NOSZONA Smart) >>`
  );

  const idsPagina = paginasConteudo.map((operadores) => {
    const conteudo = operadores.join("\n");

    const idConteudo = adicionar(
      `<< /Length ${Buffer.byteLength(conteudo, "latin1")} >>\nstream\n${conteudo}\nendstream`
    );

    return adicionar(
      `<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${PAGINA_LARGURA} ${PAGINA_ALTURA}] ` +
        `/Resources << /Font << /F1 ${idFonteNormal} 0 R /F2 ${idFonteNegrito} 0 R >> >> ` +
        `/Contents ${idConteudo} 0 R >>`
    );
  });

  objetos[idCatalogo - 1] =
    `<< /Type /Catalog /Pages ${idPaginas} 0 R >>`;

  objetos[idPaginas - 1] =
    `<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(" ")}] /Count ${idsPagina.length} >>`;

  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const posicoes = [];

  objetos.forEach((corpo, indice) => {
    posicoes.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${indice + 1} 0 obj\n${corpo}\nendobj\n`;
  });

  const inicioXref = Buffer.byteLength(pdf, "latin1");

  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  pdf += posicoes
    .map((posicao) => `${String(posicao).padStart(10, "0")} 00000 n \n`)
    .join("");

  pdf +=
    `trailer\n<< /Size ${objetos.length + 1} /Root ${idCatalogo} 0 R /Info ${idInfo} 0 R >>\n` +
    `startxref\n${inicioXref}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

/*
|--------------------------------------------------------------------------
| API pública
|--------------------------------------------------------------------------
*/

function gerarReciboPdf(recibo) {
  if (!recibo?.transacao) {
    throw new Error("Dados do recibo não foram fornecidos.");
  }

  const desenho = criarDesenho();

  desenho.texto(MARGEM, 20, "Recibo de Pagamento", {
    negrito: true,
    cor: COR_TITULO
  });
  desenho.avancar(30);

  desenho.texto(MARGEM, 13, recibo.comerciante.nome, { negrito: true });
  desenho.avancar(18);

  for (const linha of [
    recibo.comerciante.telefone ? `Tel: ${recibo.comerciante.telefone}` : "",
    recibo.comerciante.email ? `Email: ${recibo.comerciante.email}` : "",
    recibo.comerciante.url ? `Loja: ${recibo.comerciante.url}` : ""
  ]) {
    if (linha) {
      desenho.paragrafo(linha, 10, { cor: COR_ROTULO });
    }
  }

  desenho.linhaHorizontal();

  desenho.seccao("Cliente");
  desenho.linhaTabela("Cliente", recibo.cliente.nome);
  desenho.linhaTabela("Email do cliente", recibo.cliente.email);

  desenho.seccao("Transação");
  desenho.linhaTabela("Serviço", recibo.transacao.descricao);
  desenho.linhaTabela("Referência (merchantRef)", recibo.transacao.merchantRef);
  desenho.linhaTabela("Data da transação", formatarData(recibo.transacao.dataTransacao));
  desenho.linhaTabela(
    "Data de prestação / ativação do serviço",
    formatarData(recibo.transacao.dataPrestacaoServico)
  );
  desenho.linhaTabela("Valor", formatarCVE(recibo.transacao.valor));
  desenho.linhaTabela("Estado", recibo.transacao.estado);

  if (recibo.dcc) {
    desenho.linhaHorizontal();
    desenho.seccao("Dynamic Currency Conversion (DCC)");
    desenho.linhaTabela("Valor original", formatarCVE(recibo.dcc.valorOriginalCVE));
    desenho.linhaTabela(
      "Taxa de conversão / Currency Conversion Rate",
      `1 ${recibo.dcc.dccCurrency} = ${recibo.dcc.dccRate} CVE`
    );
    desenho.linhaTabela("DCC Markup", `${recibo.dcc.dccMarkup} %`);
    desenho.linhaTabela("Moeda / Currency", recibo.dcc.dccCurrency);
    desenho.linhaTabela(
      "Valor cobrado",
      `${recibo.dcc.dccAmount} ${recibo.dcc.dccCurrency}`
    );

    desenho.avancar(4);

    for (const aviso of recibo.dcc.avisos) {
      desenho.paragrafo(aviso, 9, { cor: COR_ROTULO });
    }
  }

  desenho.linhaHorizontal();
  desenho.paragrafo(
    "Obrigado por utilizar o Cabo Verde Virtual Resident.",
    10
  );
  desenho.paragrafo(
    "Em caso de dúvida, contacte o nosso serviço de apoio.",
    10,
    { cor: COR_ROTULO }
  );

  return montarPdf(
    desenho.paginas,
    `Recibo ${recibo.transacao.merchantRef || ""}`.trim()
  );
}

module.exports = {
  gerarReciboPdf
};
