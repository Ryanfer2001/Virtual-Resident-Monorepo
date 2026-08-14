"use client";

import { useEffect, useRef, useState } from "react";
import { animate, createScope, stagger, utils, type Scope } from "animejs";

import { PACOTES, type PacoteId } from "@/lib/pacotes";
import type { ResumoDashboard } from "@/types/admin";

interface ResumoCardsProps {
  resumo: ResumoDashboard;
}

type Tom = "neutro" | "sucesso" | "aviso" | "perigo";

const ICONE_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconeRelogio() {
  return (
    <svg {...ICONE_PROPS}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function IconeRaio() {
  return (
    <svg {...ICONE_PROPS}>
      <path d="M12.5 3L5 13.5h5.5L11 21l7.5-10.5H13z" strokeLinejoin="round" />
    </svg>
  );
}

function IconeImagem() {
  return (
    <svg {...ICONE_PROPS}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.4" />
      <circle cx="8.3" cy="9.7" r="1.5" />
      <path d="M21 15.5l-5.2-5.2-3.8 3.8-2.3-2.3L3 17.5" />
    </svg>
  );
}

function IconeCartao() {
  return (
    <svg {...ICONE_PROPS}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.4" />
      <path d="M2.5 9.5h19" />
      <path d="M6 14.5h4" />
    </svg>
  );
}

const NOMES_MES = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

function rotuloMes(mes: string) {
  const partes = mes.split("-");
  const indice = Number(partes[1] || "1") - 1;
  return NOMES_MES[indice] || mes;
}

function SparklineChart({ pontos }: { pontos: Array<{ rotulo: string; valor: number }> }) {
  if (pontos.length < 2) {
    return null;
  }

  const largura = 100;
  const altura = 100;
  const valores = pontos.map((ponto) => ponto.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const amplitude = max - min || 1;
  const passo = largura / (pontos.length - 1);

  const coordenadas = pontos.map((ponto, indice) => {
    const x = indice * passo;
    const y = altura - ((ponto.valor - min) / amplitude) * (altura - 16) - 8;
    return { x, y };
  });

  const linha = coordenadas
    .map((coordenada, indice) => `${indice === 0 ? "M" : "L"}${coordenada.x},${coordenada.y}`)
    .join(" ");

  const area = `${linha} L${largura},${altura} L0,${altura} Z`;

  return (
    <svg className="admin-hero-grafico" viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="admHeroGradiente" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--adm-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--adm-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#admHeroGradiente)" stroke="none" />
      <path d={linha} fill="none" stroke="var(--adm-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* =====================================================
   LARANJA DE TIPOS DE RESIDENTE (gomos, não é um donut)
===================================================== */

type TipoResidenteId = PacoteId | "outros";

interface GomoDados {
  id: TipoResidenteId;
  nome: string;
  total: number;
  cor: string;
  corTexto: string;
  Icone: () => React.JSX.Element;
}

function IconeVisitor() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-7.2 7-12a7 7 0 10-14 0c0 4.8 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.3" />
    </svg>
  );
}

function IconeDiaspora() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.8 2.6 2.8 14.4 0 17c-2.8-2.6-2.8-14.4 0-17z" />
    </svg>
  );
}

function IconeBusiness() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="11" rx="2" />
      <path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

function IconeStudent() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8.5L12 4l10 4.5-10 4.5-10-4.5z" />
      <path d="M6.5 10.7v4.2c0 1.6 2.7 3.1 5.5 3.1s5.5-1.5 5.5-3.1v-4.2" />
    </svg>
  );
}

function IconeOutros() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

const META_TIPO: Record<TipoResidenteId, { cor: string; corTexto: string; Icone: () => React.JSX.Element }> = {
  visitor: { cor: "#22d3ee", corTexto: "#06222b", Icone: IconeVisitor },
  diaspora: { cor: "#1e3a8a", corTexto: "#ffffff", Icone: IconeDiaspora },
  business: { cor: "#eab308", corTexto: "#2a1d00", Icone: IconeBusiness },
  student: { cor: "var(--adm-accent)", corTexto: "#06301a", Icone: IconeStudent },
  outros: { cor: "#e5e7eb", corTexto: "#1f2430", Icone: IconeOutros },
};

function tipoResidenteDoPacote(pacote: string): TipoResidenteId {
  const pacoteMinusculo = pacote.toLowerCase();
  const categoria = PACOTES.find((item) => pacoteMinusculo.startsWith(item.id));

  return categoria ? categoria.id : "outros";
}

function construirGomos(distribuicaoPacotes: Array<{ pacote: string; total: number }>): GomoDados[] {
  if (!distribuicaoPacotes || distribuicaoPacotes.length === 0) {
    return [];
  }

  const totaisPorTipo = new Map<TipoResidenteId, number>();

  for (const item of distribuicaoPacotes) {
    const tipo = tipoResidenteDoPacote(item.pacote);
    totaisPorTipo.set(tipo, (totaisPorTipo.get(tipo) || 0) + item.total);
  }

  const gomos: GomoDados[] = PACOTES.filter((categoria) => (totaisPorTipo.get(categoria.id) || 0) > 0).map(
    (categoria) => ({
      id: categoria.id,
      nome: categoria.titulo,
      total: totaisPorTipo.get(categoria.id) || 0,
      ...META_TIPO[categoria.id],
    }),
  );

  if ((totaisPorTipo.get("outros") || 0) > 0) {
    gomos.push({
      id: "outros",
      nome: "Outros",
      total: totaisPorTipo.get("outros") || 0,
      ...META_TIPO.outros,
    });
  }

  return gomos;
}

const LARANJA_VIEWBOX = 400;
const LARANJA_CENTRO = 200;
const LARANJA_RAIO_EXTERNO = 150;
const LARANJA_RAIO_INTERNO = 16;
const LARANJA_GAP_GRAUS = 3;
const LARANJA_DESLOCAMENTO_HOVER = 14;

function pontoPolar(raio: number, anguloGraus: number) {
  const rad = ((anguloGraus - 90) * Math.PI) / 180;
  return {
    x: LARANJA_CENTRO + raio * Math.cos(rad),
    y: LARANJA_CENTRO + raio * Math.sin(rad),
  };
}

/** Vetor unitário que aponta para fora, no ângulo dado (para o hover/foco). */
function direcaoAngulo(anguloGraus: number) {
  const rad = ((anguloGraus - 90) * Math.PI) / 180;
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

function direcaoTangencial(anguloGraus: number) {
  const rad = ((anguloGraus - 90) * Math.PI) / 180;
  return { x: -Math.sin(rad), y: Math.cos(rad) };
}

/**
 * Pétala individual (não é um gomo de donut): tampa estreita e
 * arredondada junto ao centro, laterais curvas em Bézier quadrática
 * que se abrem progressivamente, tampa larga e arredondada na
 * extremidade exterior. Calculada diretamente no ângulo absoluto da
 * pétala — sem transform="rotate()" no <g>, para deixar o transform
 * livre para as animações do Anime.js (translate/scale no hover e na
 * entrada).
 */
function caminhoPetala(anguloCentro: number, meiaAberturaExterna: number) {
  const meiaAberturaInterna = meiaAberturaExterna * 0.2;
  const dxExterno = LARANJA_RAIO_EXTERNO * Math.sin((meiaAberturaExterna * Math.PI) / 180);

  const anguloForaEsquerda = anguloCentro - meiaAberturaExterna;
  const anguloForaDireita = anguloCentro + meiaAberturaExterna;

  const pontaEsquerda = pontoPolar(LARANJA_RAIO_INTERNO, anguloCentro - meiaAberturaInterna);
  const pontaDireita = pontoPolar(LARANJA_RAIO_INTERNO, anguloCentro + meiaAberturaInterna);
  const foraEsquerda = pontoPolar(LARANJA_RAIO_EXTERNO, anguloForaEsquerda);
  const foraDireita = pontoPolar(LARANJA_RAIO_EXTERNO, anguloForaDireita);

  const tEsquerda = direcaoTangencial(anguloForaEsquerda);
  const tDireita = direcaoTangencial(anguloForaDireita);
  const empurrao = dxExterno * 0.42;

  const controloEsquerda = {
    x: (pontaEsquerda.x + foraEsquerda.x) / 2 - tEsquerda.x * empurrao,
    y: (pontaEsquerda.y + foraEsquerda.y) / 2 - tEsquerda.y * empurrao,
  };
  const controloDireita = {
    x: (pontaDireita.x + foraDireita.x) / 2 + tDireita.x * empurrao,
    y: (pontaDireita.y + foraDireita.y) / 2 + tDireita.y * empurrao,
  };

  return [
    `M ${pontaEsquerda.x} ${pontaEsquerda.y}`,
    `A ${LARANJA_RAIO_INTERNO} ${LARANJA_RAIO_INTERNO} 0 0 1 ${pontaDireita.x} ${pontaDireita.y}`,
    `Q ${controloDireita.x} ${controloDireita.y} ${foraDireita.x} ${foraDireita.y}`,
    `A ${LARANJA_RAIO_EXTERNO} ${LARANJA_RAIO_EXTERNO} 0 0 0 ${foraEsquerda.x} ${foraEsquerda.y}`,
    `Q ${controloEsquerda.x} ${controloEsquerda.y} ${pontaEsquerda.x} ${pontaEsquerda.y}`,
    "Z",
  ].join(" ");
}

function LaranjaResidentes({ gomos }: { gomos: GomoDados[] }) {
  const [selecionado, setSelecionado] = useState<TipoResidenteId | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const petalasRef = useRef<Map<TipoResidenteId, SVGGElement>>(new Map());
  const semMovimentoRef = useRef(false);
  const primeiraExecucaoRef = useRef(true);

  const passo = gomos.length > 0 ? 360 / gomos.length : 0;
  const meiaAberturaExterna = gomos.length > 0 ? Math.max(5, (passo - LARANJA_GAP_GRAUS) / 2) : 0;

  // Anime.js: animação de entrada, isolada à raiz deste componente.
  useEffect(() => {
    if (!raizRef.current || gomos.length === 0) return;

    const scope: Scope = createScope({
      root: raizRef,
      mediaQueries: { semMovimento: "(prefers-reduced-motion: reduce)" },
    }).add((self) => {
      const reduzido = Boolean(self?.matches.semMovimento);
      semMovimentoRef.current = reduzido;

      if (reduzido) {
        utils.set(".resident-petal", { scale: 1, opacity: 1 });
      } else {
        animate(".resident-petal", {
          scale: [0.65, 1],
          opacity: [0, 1],
          duration: 780,
          delay: stagger(70, { from: "center" }),
          ease: "outCubic",
        });
      }
    });

    return () => scope.revert();
  }, [gomos.length]);

  // Anime.js: destaque da pétala selecionada / esbatimento das restantes.
  useEffect(() => {
    if (primeiraExecucaoRef.current) {
      primeiraExecucaoRef.current = false;
      return;
    }

    petalasRef.current.forEach((elemento, id) => {
      const alvo = { opacity: !selecionado || selecionado === id ? 1 : 0.45 };

      if (semMovimentoRef.current) {
        utils.set(elemento, alvo);
      } else {
        animate(elemento, { ...alvo, duration: 220, ease: "outQuad" });
      }
    });
  }, [selecionado]);

  function animarHover(elemento: SVGGElement, ativo: boolean, anguloCentro: number) {
    const direcao = direcaoAngulo(anguloCentro);
    const alvo = ativo
      ? {
          translateX: direcao.x * LARANJA_DESLOCAMENTO_HOVER,
          translateY: direcao.y * LARANJA_DESLOCAMENTO_HOVER,
          scale: 1.04,
        }
      : { translateX: 0, translateY: 0, scale: 1 };

    if (semMovimentoRef.current) {
      utils.set(elemento, alvo);
    } else {
      animate(elemento, { ...alvo, duration: 260, ease: "outQuad" });
    }
  }

  if (gomos.length === 0) {
    return <p className="admin-donut-vazio">Sem dados de tipos de residente.</p>;
  }

  const raioRotulo = LARANJA_RAIO_EXTERNO * 0.62;
  const tamanhoRotulo = Math.min(130, LARANJA_RAIO_EXTERNO * 0.66);

  function alternarSelecao(id: TipoResidenteId) {
    setSelecionado((atual) => (atual === id ? null : id));
  }

  return (
    <div className="admin-laranja-wrap" ref={raizRef}>
      <svg className="admin-laranja" viewBox={`0 0 ${LARANJA_VIEWBOX} ${LARANJA_VIEWBOX}`}>
        {gomos.map((gomo, indice) => {
          const anguloCentro = indice * passo;
          const caminho = caminhoPetala(anguloCentro, meiaAberturaExterna);
          const posicaoRotulo = pontoPolar(raioRotulo, anguloCentro);

          return (
            <g
              key={gomo.id}
              ref={(elemento) => {
                if (elemento) {
                  petalasRef.current.set(gomo.id, elemento);
                } else {
                  petalasRef.current.delete(gomo.id);
                }
              }}
              className={`resident-petal${selecionado === gomo.id ? " admin-gomo-selecionado" : ""}`}
              tabIndex={0}
              role="button"
              aria-pressed={selecionado === gomo.id}
              aria-label={`${gomo.nome}: ${gomo.total} residentes`}
              onMouseEnter={(evento) => animarHover(evento.currentTarget, true, anguloCentro)}
              onMouseLeave={(evento) => animarHover(evento.currentTarget, false, anguloCentro)}
              onFocus={(evento) => animarHover(evento.currentTarget, true, anguloCentro)}
              onBlur={(evento) => animarHover(evento.currentTarget, false, anguloCentro)}
              onClick={() => alternarSelecao(gomo.id)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") {
                  evento.preventDefault();
                  alternarSelecao(gomo.id);
                }
              }}
            >
              <title>{`${gomo.nome}: ${gomo.total} residentes`}</title>
              <path d={caminho} fill={gomo.cor} vectorEffect="non-scaling-stroke" />
              <foreignObject
                x={posicaoRotulo.x - tamanhoRotulo / 2}
                y={posicaoRotulo.y - tamanhoRotulo / 2}
                width={tamanhoRotulo}
                height={tamanhoRotulo}
              >
                <div className="admin-gomo-conteudo" style={{ color: gomo.corTexto }}>
                  <gomo.Icone />
                  <span className="admin-gomo-nome">{gomo.nome}</span>
                  <span className="admin-gomo-total">{gomo.total}</span>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ResumoCards({ resumo }: ResumoCardsProps) {
  const statsSecundarias: Array<{
    titulo: string;
    valor: string;
    descricao: string;
    tom: Tom;
    Icone: () => React.JSX.Element;
  }> = [
    {
      titulo: "Swipes totais",
      valor: String(resumo.somaSwipes),
      descricao: "Disponíveis em todas as contas",
      tom: "neutro",
      Icone: IconeRaio,
    },
    {
      titulo: "Fotografias pendentes",
      valor: String(resumo.fotosPendentes),
      descricao: "Rosto, BI ou cartão a aguardar revisão",
      tom: "aviso",
      Icone: IconeImagem,
    },
    {
      titulo: "Pedidos de cartão pendentes",
      valor: String(resumo.pedidosCartaoPendentes),
      descricao: "Aguardam aprovação",
      tom: "aviso",
      Icone: IconeCartao,
    },
  ];

  const pontosReceita =
    resumo.receitaMensal && resumo.receitaMensal.length > 0
      ? resumo.receitaMensal.map((item) => ({ rotulo: rotuloMes(item.mes), valor: item.total }))
      : NOMES_MES.map((rotulo) => ({ rotulo, valor: 0 }));

  const gomos = construirGomos(resumo.distribuicaoPacotes);

  return (
    <>
      <section className="admin-visao-grid">
        <article className="admin-hero-card">
          <SparklineChart pontos={pontosReceita} />

          <div className="admin-hero-conteudo">
            <span className="admin-resumo-card-titulo">Saldo total</span>
            <strong className="admin-hero-valor">
              {resumo.somaSaldo.toLocaleString("pt-PT")} CVE
            </strong>
            <small>Receita mensal recebida ao longo do ano</small>
          </div>

          <div className="admin-hero-eixo">
            {pontosReceita.map((ponto, indice) => (
              <span key={`${ponto.rotulo}-${indice}`}>{ponto.rotulo}</span>
            ))}
          </div>
        </article>

        <article className="admin-resumo-card admin-resumo-card-destaque">
          <span className="admin-resumo-card-icone admin-resumo-card-icone-aviso">
            <IconeRelogio />
          </span>
          <span className="admin-resumo-card-titulo">Contas pendentes</span>
          <strong>{resumo.contasPendentes}</strong>
          <small>Aguardam ativação</small>
        </article>

        <div className="admin-stats-row">
          {statsSecundarias.map((cartao) => (
            <article className="admin-resumo-card" key={cartao.titulo}>
              <span className={`admin-resumo-card-icone admin-resumo-card-icone-${cartao.tom}`}>
                <cartao.Icone />
              </span>
              <span className="admin-resumo-card-titulo">{cartao.titulo}</span>
              <strong>{cartao.valor}</strong>
              <small>{cartao.descricao}</small>
            </article>
          ))}
        </div>

        <article className="admin-donut-card">
          <h2>Virtual Residents</h2>

          <LaranjaResidentes gomos={gomos} />
        </article>
      </section>

      <section className="admin-painel">
        <h2>Registos recentes</h2>

        <div className="admin-tabela-scroll">
          <table className="admin-tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Utilizador</th>
                <th>Plano</th>
                <th>Estado</th>
                <th>Criado em</th>
              </tr>
            </thead>
            <tbody>
              {resumo.registosRecentes.map((residente) => (
                <tr key={residente.id}>
                  <td>{residente.nome}</td>
                  <td>{residente.username}</td>
                  <td>{residente.pacote}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${residente.estado}`}>
                      {residente.estado}
                    </span>
                  </td>
                  <td>{new Date(residente.criadoEm).toLocaleString("pt-PT")}</td>
                </tr>
              ))}

              {resumo.registosRecentes.length === 0 && (
                <tr>
                  <td colSpan={5}>Sem registos recentes.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
