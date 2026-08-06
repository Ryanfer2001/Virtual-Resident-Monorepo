"use client";

import { useEffect, useState } from "react";

import { listarFotosPendentes } from "@/lib/admin-api";
import type { ResidenteFotoPendente } from "@/types/admin";

interface RevisaoFotosGlobalProps {
  onSelecionar: (id: string) => void;
}

export default function RevisaoFotosGlobal({ onSelecionar }: RevisaoFotosGlobalProps) {
  const [residentes, setResidentes] = useState<ResidenteFotoPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    listarFotosPendentes()
      .then((resposta) => {
        if (!cancelado) setResidentes(resposta.residentes);
      })
      .catch((error) => {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao carregar as fotografias pendentes.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, []);

  return (
    <section className="admin-painel">
      <h2>Fotografias</h2>
      <p className="admin-descricao-secao">
        Residentes com pelo menos uma fotografia (rosto, BI ou cartão) pendente
        de revisão. Abre o residente para ver as três imagens e aprovar ou
        rejeitar individualmente.
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
                <th>ID</th>
                <th>Nome</th>
                <th>Plano</th>
                <th>Rosto</th>
                <th>BI</th>
                <th>Cartão</th>
                <th>Data do envio</th>
                <th>Rever</th>
              </tr>
            </thead>
            <tbody>
              {residentes.map((residente) => (
                <tr key={residente.id}>
                  <td>{residente.id}</td>
                  <td>{residente.nome}</td>
                  <td>{residente.pacote}</td>
                  <td>
                    <span className={`admin-badge admin-badge-foto-estado-${residente.estadoFotoPerfil}`}>
                      {residente.estadoFotoPerfil}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-foto-estado-${residente.estadoFotoBI}`}>
                      {residente.estadoFotoBI}
                    </span>
                  </td>
                  <td>
                    <span className={`admin-badge admin-badge-foto-estado-${residente.estadoFotoCartao}`}>
                      {residente.estadoFotoCartao}
                    </span>
                  </td>
                  <td>
                    {residente.dataFotos
                      ? new Date(residente.dataFotos).toLocaleString("pt-PT")
                      : "—"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn-secundario"
                      onClick={() => onSelecionar(residente.id)}
                    >
                      Rever
                    </button>
                  </td>
                </tr>
              ))}

              {residentes.length === 0 && (
                <tr>
                  <td colSpan={8}>Não há fotografias pendentes de revisão.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
