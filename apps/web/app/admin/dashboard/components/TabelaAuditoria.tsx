"use client";

import { useEffect, useState } from "react";

import { listarAuditoria } from "@/lib/admin-api";
import type { EntradaAuditoria } from "@/types/admin";

const POR_PAGINA = 25;

export default function TabelaAuditoria() {
  const [registos, setRegistos] = useState<EntradaAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    setCarregando(true);

    listarAuditoria({ pagina, porPagina: POR_PAGINA })
      .then((resposta) => {
        if (!cancelado) {
          setRegistos(resposta.auditoria);
          setTotal(resposta.total);
        }
      })
      .catch((error) => {
        if (!cancelado) {
          setErro(
            error instanceof Error ? error.message : "Erro ao carregar a auditoria.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [pagina]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <section className="admin-painel">
      <h2>Auditoria</h2>
      <p className="admin-descricao-secao">
        Registo de todas as ações administrativas. Só de leitura — não é
        possível apagar entradas a partir desta interface.
      </p>

      {erro && (
        <div className="admin-mensagem admin-mensagem-erro" role="alert">
          {erro}
        </div>
      )}

      {carregando && <p className="admin-a-carregar">A carregar...</p>}

      {!carregando && (
        <div className="admin-tabela-scroll">
          <table className="admin-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>Administrador</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>Motivo</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {registos.map((registo) => (
                <tr key={registo.id}>
                  <td>{new Date(registo.criadoEm).toLocaleString("pt-PT")}</td>
                  <td>{registo.adminUsername}</td>
                  <td>{registo.acao}</td>
                  <td>
                    {registo.entidade}
                    {registo.entidadeId ? ` #${registo.entidadeId}` : ""}
                  </td>
                  <td>{registo.motivo || "—"}</td>
                  <td>{registo.ip || "—"}</td>
                </tr>
              ))}

              {registos.length === 0 && (
                <tr>
                  <td colSpan={6}>Sem registos de auditoria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-paginacao">
        <button
          type="button"
          disabled={pagina <= 1}
          onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
        >
          Anterior
        </button>

        <span>
          Página {pagina} de {totalPaginas} ({total} registos)
        </span>

        <button
          type="button"
          disabled={pagina >= totalPaginas}
          onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
        >
          Seguinte
        </button>
      </div>
    </section>
  );
}
