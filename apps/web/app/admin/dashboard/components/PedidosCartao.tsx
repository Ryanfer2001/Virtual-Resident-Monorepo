"use client";

import { useEffect, useState } from "react";

import { listarPedidosCartao } from "@/lib/admin-api";
import type { PedidoCartao } from "@/types/admin";

interface PedidosCartaoProps {
  onSelecionar: (id: string) => void;
}

export default function PedidosCartaoLista({ onSelecionar }: PedidosCartaoProps) {
  const [pedidos, setPedidos] = useState<PedidoCartao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    listarPedidosCartao()
      .then((resposta) => {
        if (!cancelado) setPedidos(resposta.pedidos);
      })
      .catch((error) => {
        if (!cancelado) {
          setErro(
            error instanceof Error
              ? error.message
              : "Erro ao carregar os pedidos de cartão.",
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
      <h2>Pedidos de cartão</h2>
      <p className="admin-descricao-secao">
        Abre um residente para aprovar, rejeitar ou marcar o cartão como
        gerado — as ações ficam disponíveis na secção &quot;Pedido de
        cartão&quot; do respetivo painel.
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
                <th>Estado do pedido</th>
                <th>Cartão gerado</th>
                <th>UID</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id}>
                  <td>{pedido.id}</td>
                  <td>{pedido.nome}</td>
                  <td>{pedido.pacote}</td>
                  <td>
                    <span className={`admin-badge admin-badge-pedido-${pedido.estadoPedidoCartao}`}>
                      {pedido.estadoPedidoCartao}
                    </span>
                  </td>
                  <td>{pedido.cartaoGerado ? "Sim" : "Não"}</td>
                  <td>{pedido.uid || "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn-secundario"
                      onClick={() => onSelecionar(pedido.id)}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}

              {pedidos.length === 0 && (
                <tr>
                  <td colSpan={7}>Não há pedidos de cartão.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
