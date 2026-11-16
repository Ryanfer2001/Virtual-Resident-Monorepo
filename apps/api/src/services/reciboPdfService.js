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
| Gerador PDF 1.4 mínimo, sem dependências externas (só zlib do Node):
| texto com as fontes standard Helvetica/Helvetica-Bold em WinAnsiEncoding
| (cobre os acentos portugueses), formas vetoriais e o logótipo PNG
| embebido. Se o logótipo faltar ou não puder ser lido, o recibo é gerado
| na mesma com cabeçalho em texto. Função pura — sem BD, sem rede, nunca
| altera o estado do pagamento.
|--------------------------------------------------------------------------
*/

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CAMINHO_LOGO = path.join(__dirname, "..", "assets", "cvr-logo-recibo.png");

const PAGINA_LARGURA = 595.28;
const PAGINA_ALTURA = 841.89;
const MARGEM = 42;
const LARGURA_UTIL = PAGINA_LARGURA - MARGEM * 2;
const ALTURA_CABECALHO = 96;
const ALTURA_RODAPE = 70;

/* Cores institucionais (as mesmas do site e do email) */
const COR = {
  navy: "#061827",
  ciano: "#00c3e3",
  azul: "#0a6fa8",
  sucesso: "#0ea472",
  texto: "#0f1f2e",
  suave: "#5f7186",
  borda: "#d4dee9",
  fundoCartao: "#f7fafc",
  fundoTotal: "#eaf6fb",
  branco: "#ffffff"
};

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((c) => (c / 255).toFixed(3))
    .join(" ");
}

/*
|--------------------------------------------------------------------------
| Texto: codificação WinAnsi e larguras Helvetica (AFM, 1/1000 em)
|--------------------------------------------------------------------------
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

/* Caracteres 32–126 */
const LARGURAS_NORMAL = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];

const LARGURAS_NEGRITO = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584
];

function normalizarCaractere(caractere) {
  const codigo = caractere.codePointAt(0);

  /* toLocaleString("pt-PT") usa espaços finos como separador de milhares */
  if (codigo === 0x00a0 || codigo === 0x2007 || codigo === 0x202f) {
    return " ";
  }

  return caractere;
}

function textoPdf(valor) {
  let saida = "";

  for (const original of String(valor ?? "")) {
    const caractere = normalizarCaractere(original);
    let codigo = caractere.codePointAt(0);

    if (MAPA_CP1252[caractere]) {
      codigo = MAPA_CP1252[caractere];
    } else if (codigo < 0x20 || (codigo > 0x7e && codigo < 0xa0) || codigo > 0xff) {
      codigo = 0x3f;
    }

    const byte = String.fromCharCode(codigo);
    saida += byte === "(" || byte === ")" || byte === "\\" ? `\\${byte}` : byte;
  }

  return saida;
}

function larguraTexto(valor, tamanho, negrito = false) {
  const tabela = negrito ? LARGURAS_NEGRITO : LARGURAS_NORMAL;
  let total = 0;

  for (const original of String(valor ?? "")) {
    /* Letras acentuadas usam a largura da letra base (á → a) */
    const base = normalizarCaractere(original).normalize("NFD")[0];
    const codigo = base.codePointAt(0);
    total += codigo >= 32 && codigo <= 126 ? tabela[codigo - 32] : 556;
  }

  return (total * tamanho) / 1000;
}

function quebrarTexto(valor, tamanho, larguraMaxima, negrito = false) {
  const linhas = [];
  let atual = "";

  for (const palavra of String(valor ?? "").split(/\s+/).filter(Boolean)) {
    const candidato = atual ? `${atual} ${palavra}` : palavra;

    if (larguraTexto(candidato, tamanho, negrito) <= larguraMaxima) {
      atual = candidato;
      continue;
    }

    if (atual) {
      linhas.push(atual);
    }

    /* Palavra maior que a linha (ex.: email/URL longo): parte por caracteres */
    let resto = palavra;

    while (larguraTexto(resto, tamanho, negrito) > larguraMaxima) {
      let corte = resto.length - 1;

      while (corte > 1 && larguraTexto(resto.slice(0, corte), tamanho, negrito) > larguraMaxima) {
        corte -= 1;
      }

      linhas.push(resto.slice(0, corte));
      resto = resto.slice(corte);
    }

    atual = resto;
  }

  if (atual || !linhas.length) {
    linhas.push(atual);
  }

  return linhas;
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
|--------------------------------------------------------------------------
| Logótipo: PNG RGBA 8-bit → imagem RGB + máscara alfa (SMask)
|--------------------------------------------------------------------------
*/

function lerPngRgba(buffer) {
  let posicao = 8;
  let largura;
  let altura;
  const dados = [];

  while (posicao < buffer.length) {
    const comprimento = buffer.readUInt32BE(posicao);
    const tipo = buffer.toString("latin1", posicao + 4, posicao + 8);
    const corpo = buffer.subarray(posicao + 8, posicao + 8 + comprimento);

    if (tipo === "IHDR") {
      largura = corpo.readUInt32BE(0);
      altura = corpo.readUInt32BE(4);

      if (corpo[8] !== 8 || corpo[9] !== 6 || corpo[12] !== 0) {
        throw new Error("O logótipo tem de ser PNG RGBA 8-bit não entrelaçado.");
      }
    } else if (tipo === "IDAT") {
      dados.push(corpo);
    }

    posicao += 12 + comprimento;
  }

  const bruto = zlib.inflateSync(Buffer.concat(dados));
  const bpp = 4;
  const passo = largura * bpp;
  const pixeis = Buffer.alloc(altura * passo);

  for (let y = 0; y < altura; y += 1) {
    const filtro = bruto[y * (passo + 1)];
    const origem = bruto.subarray(y * (passo + 1) + 1, (y + 1) * (passo + 1));
    const anterior = y ? pixeis.subarray((y - 1) * passo, y * passo) : Buffer.alloc(passo);
    const linha = pixeis.subarray(y * passo, (y + 1) * passo);

    for (let i = 0; i < passo; i += 1) {
      const a = i >= bpp ? linha[i - bpp] : 0;
      const b = anterior[i];
      const c = i >= bpp ? anterior[i - bpp] : 0;
      let valor = origem[i];

      if (filtro === 1) {
        valor += a;
      } else if (filtro === 2) {
        valor += b;
      } else if (filtro === 3) {
        valor += (a + b) >> 1;
      } else if (filtro === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        valor += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }

      linha[i] = valor & 255;
    }
  }

  const cor = Buffer.alloc(largura * altura * 3);
  const alfa = Buffer.alloc(largura * altura);

  for (let i = 0, j = 0; i < pixeis.length; i += 4, j += 1) {
    cor[j * 3] = pixeis[i];
    cor[j * 3 + 1] = pixeis[i + 1];
    cor[j * 3 + 2] = pixeis[i + 2];
    alfa[j] = pixeis[i + 3];
  }

  return {
    largura,
    altura,
    cor: comprimirComPreditor(cor, largura, altura, 3),
    alfa: comprimirComPreditor(alfa, largura, altura, 1)
  };
}

/*
 * Volta a aplicar filtros PNG por linha (o que escolher a menor soma de
 * diferenças) antes do deflate — o PDF desfaz isto com
 * /DecodeParms << /Predictor 15 >>. Reduz bastante o peso do logótipo.
 */
function comprimirComPreditor(pixeis, largura, altura, bpp) {
  const passo = largura * bpp;
  const saida = Buffer.alloc(altura * (passo + 1));
  const candidata = Buffer.alloc(passo);
  let melhor = Buffer.alloc(passo);

  for (let y = 0; y < altura; y += 1) {
    const linha = pixeis.subarray(y * passo, (y + 1) * passo);
    const anterior = y ? pixeis.subarray((y - 1) * passo, y * passo) : Buffer.alloc(passo);
    let melhorSoma = Infinity;
    let melhorFiltro = 0;

    for (let filtro = 0; filtro <= 4; filtro += 1) {
      let soma = 0;

      for (let i = 0; i < passo; i += 1) {
        const a = i >= bpp ? linha[i - bpp] : 0;
        const b = anterior[i];
        const c = i >= bpp ? anterior[i - bpp] : 0;
        let previsao = 0;

        if (filtro === 1) {
          previsao = a;
        } else if (filtro === 2) {
          previsao = b;
        } else if (filtro === 3) {
          previsao = (a + b) >> 1;
        } else if (filtro === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          previsao = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }

        const valor = (linha[i] - previsao) & 255;
        candidata[i] = valor;
        soma += valor < 128 ? valor : 256 - valor;
      }

      if (soma < melhorSoma) {
        melhorSoma = soma;
        melhorFiltro = filtro;
        melhor = Buffer.from(candidata);
      }
    }

    saida[y * (passo + 1)] = melhorFiltro;
    melhor.copy(saida, y * (passo + 1) + 1);
  }

  return zlib.deflateSync(saida, { level: 9 });
}

let logoEmCache;

function obterLogo() {
  if (logoEmCache === undefined) {
    try {
      logoEmCache = lerPngRgba(fs.readFileSync(CAMINHO_LOGO));
    } catch (erro) {
      console.error("Logótipo do recibo indisponível (recibo gerado sem imagem):", erro.message);
      logoEmCache = null;
    }
  }

  return logoEmCache;
}

/*
|--------------------------------------------------------------------------
| Desenho (operadores de conteúdo PDF; y medido a partir do topo)
|--------------------------------------------------------------------------
*/

function criarDesenho() {
  const paginas = [];
  let y = 0;

  const atual = () => paginas[paginas.length - 1];
  const yPdf = (valor) => (PAGINA_ALTURA - valor).toFixed(2);

  function retangulo(x, topo, largura, altura, { preenchimento, contorno, raio = 0 } = {}) {
    const x0 = x;
    const y0 = PAGINA_ALTURA - topo - altura;
    const r = Math.min(raio, altura / 2, largura / 2);
    const k = 0.5523 * r;
    const f = (n) => n.toFixed(2);

    const caminho = r
      ? [
          `${f(x0 + r)} ${f(y0)} m`,
          `${f(x0 + largura - r)} ${f(y0)} l`,
          `${f(x0 + largura - r + k)} ${f(y0)} ${f(x0 + largura)} ${f(y0 + r - k)} ${f(x0 + largura)} ${f(y0 + r)} c`,
          `${f(x0 + largura)} ${f(y0 + altura - r)} l`,
          `${f(x0 + largura)} ${f(y0 + altura - r + k)} ${f(x0 + largura - r + k)} ${f(y0 + altura)} ${f(x0 + largura - r)} ${f(y0 + altura)} c`,
          `${f(x0 + r)} ${f(y0 + altura)} l`,
          `${f(x0 + r - k)} ${f(y0 + altura)} ${f(x0)} ${f(y0 + altura - r + k)} ${f(x0)} ${f(y0 + altura - r)} c`,
          `${f(x0)} ${f(y0 + r)} l`,
          `${f(x0)} ${f(y0 + r - k)} ${f(x0 + r - k)} ${f(y0)} ${f(x0 + r)} ${f(y0)} c`,
          "h"
        ].join(" ")
      : `${f(x0)} ${f(y0)} ${f(largura)} ${f(altura)} re`;

    const pintura = preenchimento && contorno ? "B" : preenchimento ? "f" : "S";

    atual().push(
      `q ${preenchimento ? `${rgb(preenchimento)} rg ` : ""}${contorno ? `${rgb(contorno)} RG 0.8 w ` : ""}${caminho} ${pintura} Q`
    );
  }

  function linha(x1, topo, x2, cor = COR.borda) {
    atual().push(`q ${rgb(cor)} RG 0.8 w ${x1.toFixed(2)} ${yPdf(topo)} m ${x2.toFixed(2)} ${yPdf(topo)} l S Q`);
  }

  /* `linhaBase` = posição (a partir do topo) da linha de base do texto */
  function texto(x, linhaBase, tamanho, conteudo, { negrito = false, cor = COR.texto, alinhar = "esquerda" } = {}) {
    const largura = larguraTexto(conteudo, tamanho, negrito);
    const xFinal = alinhar === "direita" ? x - largura : alinhar === "centro" ? x - largura / 2 : x;

    atual().push(
      `BT /${negrito ? "F2" : "F1"} ${tamanho} Tf ${rgb(cor)} rg 1 0 0 1 ${xFinal.toFixed(2)} ${yPdf(linhaBase)} Tm (${textoPdf(conteudo)}) Tj ET`
    );
  }

  function imagem(nome, x, topo, largura, altura) {
    atual().push(
      `q ${largura.toFixed(2)} 0 0 ${altura.toFixed(2)} ${x.toFixed(2)} ${(PAGINA_ALTURA - topo - altura).toFixed(2)} cm /${nome} Do Q`
    );
  }

  function novaPagina() {
    paginas.push([]);
    y = MARGEM;
  }

  function garantirEspaco(altura) {
    if (y + altura > PAGINA_ALTURA - ALTURA_RODAPE) {
      novaPagina();
    }
  }

  return {
    paginas,
    retangulo,
    linha,
    texto,
    imagem,
    novaPagina,
    garantirEspaco,
    get y() {
      return y;
    },
    set y(valor) {
      y = valor;
    }
  };
}

/*
|--------------------------------------------------------------------------
| Blocos do recibo
|--------------------------------------------------------------------------
*/

const COLUNA_ROTULO = 205;
const PADDING_CARTAO = 16;
const COLUNA_CLIENTE = MARGEM + LARGURA_UTIL / 2 + 10;

function desenharCabecalho(desenho, recibo, logo) {
  desenho.retangulo(0, 0, PAGINA_LARGURA, ALTURA_CABECALHO, { preenchimento: COR.navy });
  desenho.retangulo(0, ALTURA_CABECALHO, PAGINA_LARGURA, 4, { preenchimento: COR.ciano });

  if (logo) {
    const largura = 196;
    const altura = (largura * logo.altura) / logo.largura;
    desenho.imagem("Logo", MARGEM - 4, (ALTURA_CABECALHO - altura) / 2, largura, altura);
  } else {
    desenho.texto(MARGEM, 52, 16, "Cabo Verde Virtual Resident", { negrito: true, cor: COR.branco });
  }

  const direita = PAGINA_LARGURA - MARGEM;
  desenho.texto(direita, 45, 17, "RECIBO DE PAGAMENTO", { negrito: true, cor: COR.branco, alinhar: "direita" });
  desenho.texto(direita, 63, 10, `Referência ${recibo.transacao.merchantRef}`, { cor: COR.ciano, alinhar: "direita" });

  desenho.y = ALTURA_CABECALHO + 4 + 26;
}

/* Duas colunas: emitente (comerciante) à esquerda, cliente à direita */
function desenharPartes(desenho, recibo) {
  const topo = desenho.y;
  const { comerciante, cliente } = recibo;
  const larguraColuna = LARGURA_UTIL / 2 - 10;

  function coluna(x, rotulo, titulo, linhas) {
    desenho.texto(x, topo + 8, 8, rotulo, { negrito: true, cor: COR.suave });

    let base = topo + 25;

    for (const parte of quebrarTexto(titulo, 13, larguraColuna, true)) {
      desenho.texto(x, base, 13, parte, { negrito: true, cor: COR.navy });
      base += 16;
    }

    base += 1;

    for (const linha of linhas.filter(Boolean)) {
      for (const parte of quebrarTexto(linha, 9.5, larguraColuna)) {
        desenho.texto(x, base, 9.5, parte, { cor: COR.suave });
        base += 13.5;
      }
    }

    return base;
  }

  const fimEmitente = coluna(MARGEM, "EMITIDO POR", comerciante.nome, [
    comerciante.telefone ? `Tel: ${comerciante.telefone}` : "",
    comerciante.email ? `Email: ${comerciante.email}` : "",
    comerciante.url ? `Loja: ${comerciante.url}` : ""
  ]);

  const fimCliente = coluna(COLUNA_CLIENTE, "CLIENTE", cliente.nome || "—", [
    cliente.email ? `Email: ${cliente.email}` : ""
  ]);

  desenho.y = Math.max(fimEmitente, fimCliente) + 12;
}

/* Cartão com título e linhas rótulo/valor (altura calculada antes de desenhar) */
function desenharCartao(desenho, titulo, linhas) {
  const tamanho = 10;
  const altLinha = 13.5;
  const espaco = 9;
  const larguraValor = LARGURA_UTIL - PADDING_CARTAO * 2 - COLUNA_ROTULO;

  const preparadas = linhas.map(([rotulo, valor]) => {
    const r = quebrarTexto(rotulo, tamanho, COLUNA_ROTULO - 12);
    const v = quebrarTexto(valor, tamanho, larguraValor, true);
    return { r, v, n: Math.max(r.length, v.length) };
  });

  const alturaLinhas = preparadas.reduce((soma, l) => soma + l.n * altLinha + espaco, 0);
  const altura = 36 + alturaLinhas + 4;

  desenho.garantirEspaco(altura + 12);

  const topo = desenho.y;
  desenho.retangulo(MARGEM, topo, LARGURA_UTIL, altura, { preenchimento: COR.fundoCartao, contorno: COR.borda, raio: 8 });
  desenho.retangulo(MARGEM, topo + 11, 3, 15, { preenchimento: COR.ciano });
  desenho.texto(MARGEM + PADDING_CARTAO, topo + 22, 11, titulo, { negrito: true, cor: COR.navy });

  let cursor = topo + 34;

  preparadas.forEach((l, indice) => {
    for (let i = 0; i < l.n; i += 1) {
      const base = cursor + 10 + i * altLinha;

      if (l.r[i]) {
        desenho.texto(MARGEM + PADDING_CARTAO, base, tamanho, l.r[i], { cor: COR.suave });
      }

      if (l.v[i]) {
        desenho.texto(MARGEM + PADDING_CARTAO + COLUNA_ROTULO, base, tamanho, l.v[i], { negrito: true });
      }
    }

    cursor += l.n * altLinha + espaco;

    if (indice < preparadas.length - 1) {
      desenho.linha(MARGEM + PADDING_CARTAO, cursor - 2, PAGINA_LARGURA - MARGEM - PADDING_CARTAO);
    }
  });

  desenho.y = topo + altura + 12;
}

/* Valor total + selo de estado */
function desenharTotal(desenho, recibo) {
  const altura = 56;
  desenho.garantirEspaco(altura + 12);

  const topo = desenho.y;
  const direita = PAGINA_LARGURA - MARGEM - PADDING_CARTAO;
  const rotuloEstado = String(recibo.transacao.estado || "").toUpperCase();
  const larguraSelo = larguraTexto(rotuloEstado, 11, true) + 32;

  desenho.retangulo(MARGEM, topo, LARGURA_UTIL, altura, { preenchimento: COR.fundoTotal, contorno: "#b9e3f2", raio: 8 });
  desenho.texto(MARGEM + PADDING_CARTAO, topo + 21, 8, "VALOR TOTAL PAGO", { negrito: true, cor: COR.suave });
  desenho.texto(MARGEM + PADDING_CARTAO, topo + 43, 20, formatarCVE(recibo.transacao.valor), { negrito: true, cor: COR.navy });

  desenho.retangulo(direita - larguraSelo, topo + 16, larguraSelo, 24, { preenchimento: COR.sucesso, raio: 12 });
  desenho.texto(direita - larguraSelo / 2, topo + 32, 11, rotuloEstado, { negrito: true, cor: COR.branco, alinhar: "centro" });

  desenho.y = topo + altura + 12;
}

function desenharAvisosDcc(desenho, avisos) {
  const tamanho = 9;
  const linhas = avisos.flatMap((aviso) => quebrarTexto(aviso, tamanho, LARGURA_UTIL - PADDING_CARTAO * 2 - 6));
  const altura = 14 + linhas.length * 13;

  desenho.garantirEspaco(altura + 12);

  const topo = desenho.y;
  desenho.retangulo(MARGEM, topo, LARGURA_UTIL, altura, { preenchimento: "#f3f6f9" });
  desenho.retangulo(MARGEM, topo, 3, altura, { preenchimento: COR.ciano });

  linhas.forEach((texto, i) => {
    desenho.texto(MARGEM + PADDING_CARTAO, topo + 17 + i * 13, tamanho, texto, { cor: COR.suave });
  });

  desenho.y = topo + altura + 12;
}

function desenharRodapes(desenho, recibo) {
  const total = desenho.paginas.length;
  const { comerciante } = recibo;
  const contactos = [
    comerciante.nome,
    comerciante.telefone ? `Tel: ${comerciante.telefone}` : "",
    comerciante.email,
    comerciante.url
  ].filter(Boolean).join("  |  ");

  desenho.paginas.forEach((operadores, indice) => {
    const topo = PAGINA_ALTURA - ALTURA_RODAPE + 18;
    const guardados = desenho.paginas.length;

    /* Desenha na página `indice` reutilizando as mesmas primitivas */
    desenho.paginas.push(operadores);
    desenho.linha(MARGEM, topo, PAGINA_LARGURA - MARGEM);
    desenho.texto(PAGINA_LARGURA / 2, topo + 16, 8, contactos, { cor: COR.suave, alinhar: "centro" });
    desenho.texto(
      PAGINA_LARGURA / 2,
      topo + 29,
      7.5,
      "Documento emitido eletronicamente. Pagamento processado de forma segura pela rede vinti4.",
      { cor: "#8a9bb0", alinhar: "centro" }
    );

    if (total > 1) {
      desenho.texto(PAGINA_LARGURA - MARGEM, topo + 42, 7.5, `Página ${indice + 1} de ${total}`, { cor: "#8a9bb0", alinhar: "direita" });
    }

    desenho.paginas.length = guardados;
  });
}

/*
|--------------------------------------------------------------------------
| Montar o ficheiro PDF (objetos + xref)
|--------------------------------------------------------------------------
*/

function montarPdf(paginasConteudo, titulo, logo) {
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
    `<< /Title (${textoPdf(titulo)}) /Producer (Cabo Verde Virtual Resident) >>`
  );

  let recursoImagem = "";

  if (logo) {
    const idAlfa = adicionar({
      dicionario: `<< /Type /XObject /Subtype /Image /Width ${logo.largura} /Height ${logo.altura} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns ${logo.largura} >> /Length ${logo.alfa.length} >>`,
      dados: logo.alfa
    });

    const idImagem = adicionar({
      dicionario: `<< /Type /XObject /Subtype /Image /Width ${logo.largura} /Height ${logo.altura} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns ${logo.largura} >> /SMask ${idAlfa} 0 R /Length ${logo.cor.length} >>`,
      dados: logo.cor
    });

    recursoImagem = ` /XObject << /Logo ${idImagem} 0 R >>`;
  }

  const idsPagina = paginasConteudo.map((operadores) => {
    const conteudo = Buffer.from(operadores.join("\n"), "latin1");

    const idConteudo = adicionar({
      dicionario: `<< /Length ${conteudo.length} >>`,
      dados: conteudo
    });

    return adicionar(
      `<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${PAGINA_LARGURA} ${PAGINA_ALTURA}] ` +
        `/Resources << /Font << /F1 ${idFonteNormal} 0 R /F2 ${idFonteNegrito} 0 R >>${recursoImagem} >> ` +
        `/Contents ${idConteudo} 0 R >>`
    );
  });

  objetos[idCatalogo - 1] = `<< /Type /Catalog /Pages ${idPaginas} 0 R >>`;
  objetos[idPaginas - 1] =
    `<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(" ")}] /Count ${idsPagina.length} >>`;

  const partes = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  let tamanho = partes[0].length;
  const posicoes = [];

  objetos.forEach((corpo, indice) => {
    posicoes.push(tamanho);

    const bloco =
      typeof corpo === "string"
        ? Buffer.from(`${indice + 1} 0 obj\n${corpo}\nendobj\n`, "latin1")
        : Buffer.concat([
            Buffer.from(`${indice + 1} 0 obj\n${corpo.dicionario}\nstream\n`, "latin1"),
            corpo.dados,
            Buffer.from("\nendstream\nendobj\n", "latin1")
          ]);

    partes.push(bloco);
    tamanho += bloco.length;
  });

  const xref =
    `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` +
    posicoes.map((posicao) => `${String(posicao).padStart(10, "0")} 00000 n \n`).join("") +
    `trailer\n<< /Size ${objetos.length + 1} /Root ${idCatalogo} 0 R /Info ${idInfo} 0 R >>\n` +
    `startxref\n${tamanho}\n%%EOF\n`;

  partes.push(Buffer.from(xref, "latin1"));

  return Buffer.concat(partes);
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

  const logo = obterLogo();
  const desenho = criarDesenho();
  const { transacao, dcc } = recibo;

  desenho.novaPagina();
  desenharCabecalho(desenho, recibo, logo);
  desenharPartes(desenho, recibo);

  desenharCartao(desenho, "Detalhes da transação", [
    ["Serviço", transacao.descricao],
    ["Referência (merchantRef)", transacao.merchantRef],
    ["Data da transação", formatarData(transacao.dataTransacao)],
    ["Data de prestação / ativação do serviço", formatarData(transacao.dataPrestacaoServico)],
    ["Estado", transacao.estado]
  ]);

  desenharTotal(desenho, recibo);

  if (dcc) {
    desenharCartao(desenho, "Dynamic Currency Conversion (DCC)", [
      ["Valor original", formatarCVE(dcc.valorOriginalCVE)],
      ["Taxa de conversão / Currency Conversion Rate", `1 ${dcc.dccCurrency} = ${dcc.dccRate} CVE`],
      ["DCC Markup", `${dcc.dccMarkup} %`],
      ["Moeda / Currency", dcc.dccCurrency],
      ["Valor cobrado / Amount charged", `${dcc.dccAmount} ${dcc.dccCurrency}`]
    ]);

    desenharAvisosDcc(desenho, dcc.avisos);
  }

  desenho.garantirEspaco(34);
  desenho.texto(MARGEM, desenho.y + 10, 10, "Obrigado por utilizar o Cabo Verde Virtual Resident.", { negrito: true, cor: COR.navy });
  desenho.texto(MARGEM, desenho.y + 25, 9.5, "Em caso de dúvida, contacte o nosso serviço de apoio.", { cor: COR.suave });

  desenharRodapes(desenho, recibo);

  return montarPdf(
    desenho.paginas,
    `Recibo ${transacao.merchantRef || ""}`.trim(),
    logo
  );
}

module.exports = {
  gerarReciboPdf
};
