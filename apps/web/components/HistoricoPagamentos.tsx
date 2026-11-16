"use client";

import { useEffect, useState } from "react";

import "./HistoricoPagamentos.css";

/*
 * Histórico de pagamentos aprovados do residente, com download do
 * recibo.pdf (exigência SISP: o titular tem de conseguir obter o
 * documento recibo na sua conta). Só leitura — os dados vêm de
 * /api/pagamento/historico e o PDF de /api/pagamento/recibo/[ref]/pdf,
 * ambos limitados no backend aos pagamentos do próprio residente.
 */

interface PagamentoHistorico {
  merchantRef: string;
  tipo: "recarga" | "pacote";
  descricao: string;
  valor: number;
  moeda: string;
  estado: string;
  dataTransacao: string | null;
}

interface RespostaHistorico {
  sucesso: boolean;
  mensagem?: string;
  pagina: number;
  totalPaginas: number;
  total: number;
  pagamentos: PagamentoHistorico[];
}

const LIMITE_POR_PAGINA = 5;

function formatarData(data: string | null) {
  return data
    ? new Date(data).toLocaleString("pt-PT", {
        timeZone: "Atlantic/Cape_Verde",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
}

function formatarCVE(valor: number) {
  return `${Number(valor || 0).toLocaleString("pt-PT")} CVE`;
}

export default function HistoricoPagamentos() {
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<RespostaHistorico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aDescarregar, setADescarregar] = useState<string | null>(null);
  const [erroDownload, setErroDownload] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const resposta = await fetch(
          `/api/pagamento/historico?pagina=${pagina}&limite=${LIMITE_POR_PAGINA}`,
          { cache: "no-store" },
        );

        const corpo = (await resposta.json()) as RespostaHistorico;

        if (cancelado) {
          return;
        }

        if (!resposta.ok || !corpo.sucesso) {
          setErro(
            corpo.mensagem ||
              "Não foi possível carregar o histórico de pagamentos.",
          );
          return;
        }

        setDados(corpo);
      } catch {
        if (!cancelado) {
          setErro("Não foi possível carregar o histórico de pagamentos.");
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    carregar();

    return () => {
      cancelado = true;
    };
  }, [pagina]);

  async function descarregarRecibo(merchantRef: string) {
    setErroDownload("");
    setADescarregar(merchantRef);

    try {
      const resposta = await fetch(
        `/api/pagamento/recibo/${encodeURIComponent(merchantRef)}/pdf`,
        { cache: "no-store" },
      );

      const tipo = resposta.headers.get("content-type") || "";

      if (!resposta.ok || !tipo.startsWith("application/pdf")) {
        const corpo = await resposta.json().catch(() => null);
        throw new Error(
          corpo?.mensagem || "Não foi possível descarregar o recibo.",
        );
      }

      const url = URL.createObjectURL(await resposta.blob());
      const ligacao = document.createElement("a");

      ligacao.href = url;
      ligacao.download = "recibo.pdf";
      document.body.appendChild(ligacao);
      ligacao.click();
      ligacao.remove();

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (error) {
      setErroDownload(
        error instanceof Error
          ? error.message
          : "Não foi possível descarregar o recibo.",
      );
    } finally {
      setADescarregar(null);
    }
  }

  const pagamentos = dados?.pagamentos || [];

  return (
    <section className="dashboard-panel historico-pagamentos">
      <div className="dashboard-panel-header">
        <div>
          <span className="dashboard-eyebrow">Pagamentos</span>
          <h2>Histórico de Pagamentos</h2>
        </div>
      </div>

      {erro && (
        <p className="historico-mensagem historico-erro" role="alert">
          {erro}
        </p>
      )}

      {erroDownload && (
        <p className="historico-mensagem historico-erro" role="alert">
          {erroDownload}
        </p>
      )}

      {carregando && !dados && !erro && (
        <p className="historico-mensagem">A carregar pagamentos...</p>
      )}

      {!carregando && !erro && pagamentos.length === 0 && (
        <p className="historico-mensagem">
          Ainda não tens pagamentos aprovados.
        </p>
      )}

      {pagamentos.length > 0 && (
        <div className="historico-tabela-wrap">
          <table className="historico-tabela">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col">Operação</th>
                <th scope="col">Valor</th>
                <th scope="col">Estado</th>
                <th scope="col">Referência</th>
                <th scope="col">
                  <span className="historico-sr">Recibo</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {pagamentos.map((pagamento) => (
                <tr key={pagamento.merchantRef}>
                  <td data-rotulo="Data">
                    {formatarData(pagamento.dataTransacao)}
                  </td>
                  <td data-rotulo="Operação">
                    {pagamento.tipo === "pacote"
                      ? `Aquisição de pacote — ${pagamento.descricao}`
                      : "Recarga de saldo"}
                  </td>
                  <td data-rotulo="Valor" className="historico-valor">
                    {formatarCVE(pagamento.valor)}
                  </td>
                  <td data-rotulo="Estado">
                    <span className="estado-badge estado-ativo">
                      {pagamento.estado}
                    </span>
                  </td>
                  <td data-rotulo="Referência" className="historico-ref">
                    {pagamento.merchantRef}
                  </td>
                  <td className="historico-acao">
                    <button
                      type="button"
                      className="historico-btn-recibo"
                      onClick={() =>
                        descarregarRecibo(pagamento.merchantRef)
                      }
                      disabled={aDescarregar === pagamento.merchantRef}
                    >
                      {aDescarregar === pagamento.merchantRef
                        ? "A preparar..."
                        : "Descarregar recibo PDF"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dados && dados.totalPaginas > 1 && (
        <nav className="historico-paginacao" aria-label="Páginas do histórico">
          <button
            type="button"
            onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
            disabled={pagina <= 1 || carregando}
          >
            ← Anterior
          </button>

          <span>
            Página {dados.pagina} de {dados.totalPaginas}
          </span>

          <button
            type="button"
            onClick={() =>
              setPagina((atual) =>
                Math.min(dados.totalPaginas, atual + 1),
              )
            }
            disabled={pagina >= dados.totalPaginas || carregando}
          >
            Seguinte →
          </button>
        </nav>
      )}
    </section>
  );
}
