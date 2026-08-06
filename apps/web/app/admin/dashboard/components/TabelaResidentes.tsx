"use client";

import { useEffect, useState } from "react";

import { listarResidentes } from "@/lib/admin-api";
import { derivarPerfilDoPacote } from "@/lib/admin-perfil";
import type { EstadoResidente, FiltrosResidentes, ResidenteListagem } from "@/types/admin";

interface TabelaResidentesProps {
  onSelecionar: (id: string) => void;
}

const POR_PAGINA = 20;

export default function TabelaResidentes({ onSelecionar }: TabelaResidentesProps) {
  const [residentes, setResidentes] = useState<ResidenteListagem[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [pesquisa, setPesquisa] = useState("");
  const [estado, setEstado] = useState<EstadoResidente | "">("");
  const [fotosPendentes, setFotosPendentes] = useState(false);
  const [pedidoCartao, setPedidoCartao] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregar() {
      setCarregando(true);
      setErro("");

      const filtros: FiltrosResidentes = {
        pagina,
        porPagina: POR_PAGINA,
        pesquisa: pesquisa || undefined,
        estado: estado || undefined,
        fotosPendentes: fotosPendentes || undefined,
        pedidoCartao: pedidoCartao || undefined,
      };

      try {
        const resposta = await listarResidentes(filtros);

        if (!cancelado) {
          setResidentes(resposta.residentes);
          setTotal(resposta.total);
        }
      } catch (error) {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao carregar os residentes.",
          );
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    const temporizador = setTimeout(carregar, 300);

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
    };
  }, [pagina, pesquisa, estado, fotosPendentes, pedidoCartao]);

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <section className="admin-painel">
      <h2>Residentes</h2>

      <div className="admin-filtros">
        <input
          type="text"
          placeholder="Pesquisar por ID, nome, username, email, documento ou telefone"
          value={pesquisa}
          onChange={(event) => {
            setPagina(1);
            setPesquisa(event.target.value);
          }}
          className="admin-filtro-pesquisa"
        />

        <select
          value={estado}
          onChange={(event) => {
            setPagina(1);
            setEstado(event.target.value as EstadoResidente | "");
          }}
        >
          <option value="">Todos os estados</option>
          <option value="pendente">Pendente</option>
          <option value="ativo">Ativo</option>
          <option value="suspenso">Suspenso</option>
        </select>

        <label className="admin-filtro-checkbox">
          <input
            type="checkbox"
            checked={fotosPendentes}
            onChange={(event) => {
              setPagina(1);
              setFotosPendentes(event.target.checked);
            }}
          />
          Fotos pendentes
        </label>

        <label className="admin-filtro-checkbox">
          <input
            type="checkbox"
            checked={pedidoCartao}
            onChange={(event) => {
              setPagina(1);
              setPedidoCartao(event.target.checked);
            }}
          />
          Pedido de cartão
        </label>
      </div>

      {erro && (
        <div className="admin-mensagem admin-mensagem-erro" role="alert">
          {erro}
        </div>
      )}

      <div className="admin-tabela-scroll">
        <table className="admin-tabela">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Perfil</th>
              <th>Plano</th>
              <th>Saldo</th>
              <th>Swipes</th>
              <th>Estado</th>
              <th>Fotos</th>
              <th>Cartão</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {residentes.map((residente) => (
              <tr key={residente.id}>
                <td>{residente.id}</td>
                <td>{residente.nome}</td>
                <td>{derivarPerfilDoPacote(residente.pacote)}</td>
                <td>{residente.pacote}</td>
                <td>{residente.saldo.toLocaleString("pt-PT")} CVE</td>
                <td>{residente.swipes}</td>
                <td>
                  <span className={`admin-badge admin-badge-${residente.estado}`}>
                    {residente.estado}
                  </span>
                </td>
                <td>
                  <span
                    className={`admin-badge admin-badge-foto-${
                      residente.estadoFotoPerfil === "pendente" ||
                      residente.estadoFotoBI === "pendente" ||
                      residente.estadoFotoCartao === "pendente"
                        ? "pendente"
                        : "ok"
                    }`}
                  >
                    P:{residente.estadoFotoPerfil[0]} B:{residente.estadoFotoBI[0]} C:
                    {residente.estadoFotoCartao[0]}
                  </span>
                </td>
                <td>{residente.cartaoGerado ? "Gerado" : residente.estadoPedidoCartao}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn-secundario"
                    onClick={() => onSelecionar(residente.id)}
                  >
                    Ver detalhes
                  </button>
                </td>
              </tr>
            ))}

            {!carregando && residentes.length === 0 && (
              <tr>
                <td colSpan={10}>Nenhum residente encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {carregando && <p className="admin-a-carregar">A carregar...</p>}

      <div className="admin-paginacao">
        <button
          type="button"
          disabled={pagina <= 1}
          onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
        >
          Anterior
        </button>

        <span>
          Página {pagina} de {totalPaginas} ({total} residentes)
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
