"use client";

import { useEffect, useState } from "react";

import {
  ajustarSaldo,
  ajustarSwipes,
  aprovarFoto,
  aprovarPedidoCartao,
  atualizarEstadoResidente,
  atualizarPermissoesResidente,
  marcarCartaoGerado,
  obterResidente,
  rejeitarFoto,
  rejeitarPedidoCartao,
  urlFotoResidente,
} from "@/lib/admin-api";
import { derivarPerfilDoPacote } from "@/lib/admin-perfil";
import type {
  AjustarValorPayload,
  EstadoResidente,
  ResidenteDetalhe,
  EntradaAuditoria,
  TipoFotoRevisao,
} from "@/types/admin";

import ModalConfirmacao from "./ModalConfirmacao";

interface PainelResidenteProps {
  id: string;
  onFechar: () => void;
}

type AcaoModal =
  | { tipo: "saldo"; payload: AjustarValorPayload }
  | { tipo: "swipes"; payload: AjustarValorPayload }
  | { tipo: "estado"; novoEstado: EstadoResidente }
  | { tipo: "foto-aprovar"; fotoTipo: TipoFotoRevisao }
  | { tipo: "foto-rejeitar"; fotoTipo: TipoFotoRevisao }
  | { tipo: "cartao-aprovar" }
  | { tipo: "cartao-rejeitar" }
  | { tipo: "cartao-gerado" }
  | null;

const ROTULO_FOTO: Record<TipoFotoRevisao, string> = {
  perfil: "Foto do rosto",
  bi: "Foto do Bilhete de Identidade",
  cartao: "Foto do cartão",
};

export default function PainelResidente({ id, onFechar }: PainelResidenteProps) {
  const [residente, setResidente] = useState<ResidenteDetalhe | null>(null);
  const [historico, setHistorico] = useState<EntradaAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const [acaoModal, setAcaoModal] = useState<AcaoModal>(null);
  const [aProcessar, setAProcessar] = useState(false);

  const [operacaoSaldo, setOperacaoSaldo] =
    useState<AjustarValorPayload["operacao"]>("adicionar");
  const [valorSaldo, setValorSaldo] = useState("");

  const [operacaoSwipes, setOperacaoSwipes] =
    useState<AjustarValorPayload["operacao"]>("adicionar");
  const [valorSwipes, setValorSwipes] = useState("");

  const [uidCartao, setUidCartao] = useState("");
  const [imagemAmpliada, setImagemAmpliada] = useState<string | null>(null);

  const [eventos, setEventos] = useState(false);
  const [parking, setParking] = useState(false);
  const [aGuardarPermissoes, setAGuardarPermissoes] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro("");

    try {
      const resposta = await obterResidente(id);

      if (!resposta.sucesso || !resposta.residente) {
        throw new Error(resposta.mensagem || "Residente não encontrado.");
      }

      setResidente(resposta.residente);
      setHistorico(resposta.historico || []);
      setEventos(resposta.residente.eventos);
      setParking(resposta.residente.parking);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar o residente.",
      );
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function guardarPermissoes() {
    setAGuardarPermissoes(true);
    setErro("");
    setMensagem("");

    try {
      await atualizarPermissoesResidente(id, { eventos, parking });
      setMensagem("Permissões atualizadas com sucesso.");
      await carregar();
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao atualizar permissões.",
      );
    } finally {
      setAGuardarPermissoes(false);
    }
  }

  async function executarAcaoModal(motivo?: string) {
    if (!acaoModal) return;

    setAProcessar(true);
    setErro("");
    setMensagem("");

    try {
      switch (acaoModal.tipo) {
        case "saldo":
          await ajustarSaldo(id, acaoModal.payload);
          setMensagem("Saldo ajustado com sucesso.");
          setValorSaldo("");
          break;
        case "swipes":
          await ajustarSwipes(id, acaoModal.payload);
          setMensagem("Swipes ajustados com sucesso.");
          setValorSwipes("");
          break;
        case "estado":
          await atualizarEstadoResidente(id, {
            estado: acaoModal.novoEstado,
            motivo,
          });
          setMensagem("Estado da conta atualizado com sucesso.");
          break;
        case "foto-aprovar":
          await aprovarFoto(id, acaoModal.fotoTipo);
          setMensagem(`${ROTULO_FOTO[acaoModal.fotoTipo]} aprovada com sucesso.`);
          break;
        case "foto-rejeitar":
          await rejeitarFoto(id, acaoModal.fotoTipo, motivo || "");
          setMensagem(`${ROTULO_FOTO[acaoModal.fotoTipo]} rejeitada.`);
          break;
        case "cartao-aprovar":
          await aprovarPedidoCartao(id);
          setMensagem("Pedido de cartão aprovado.");
          break;
        case "cartao-rejeitar":
          await rejeitarPedidoCartao(id, motivo || "");
          setMensagem("Pedido de cartão rejeitado.");
          break;
        case "cartao-gerado":
          await marcarCartaoGerado(id, motivo || "");
          setMensagem("Cartão marcado como gerado.");
          setUidCartao("");
          break;
      }

      setAcaoModal(null);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao executar a ação.");
    } finally {
      setAProcessar(false);
    }
  }

  if (carregando && !residente) {
    return (
      <div className="admin-drawer-fundo" onClick={onFechar}>
        <div className="admin-drawer" onClick={(event) => event.stopPropagation()}>
          <p className="admin-a-carregar">A carregar residente...</p>
        </div>
      </div>
    );
  }

  if (erro && !residente) {
    return (
      <div className="admin-drawer-fundo" onClick={onFechar}>
        <div className="admin-drawer" onClick={(event) => event.stopPropagation()}>
          <div className="admin-mensagem admin-mensagem-erro">{erro}</div>
          <button type="button" className="admin-btn-secundario" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (!residente) return null;

  return (
    <div className="admin-drawer-fundo" onClick={onFechar}>
      <div className="admin-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="admin-drawer-cabecalho">
          <div>
            <span className="admin-eyebrow">
              {derivarPerfilDoPacote(residente.pacote)} · {residente.pacote}
            </span>
            <h2>{residente.nome}</h2>
          </div>

          <button type="button" className="admin-btn-secundario" onClick={onFechar}>
            Fechar
          </button>
        </div>

        {mensagem && <div className="admin-mensagem admin-mensagem-sucesso">{mensagem}</div>}
        {erro && <div className="admin-mensagem admin-mensagem-erro">{erro}</div>}

        <section className="admin-drawer-secao">
          <h3>Dados pessoais</h3>
          <dl className="admin-lista-dados">
            <div><dt>ID</dt><dd>{residente.id}</dd></div>
            <div><dt>Username</dt><dd>{residente.username}</dd></div>
            <div><dt>Data de nascimento</dt><dd>{residente.dataNascimento}</dd></div>
            <div><dt>Nacionalidade</dt><dd>{residente.nacionalidade}</dd></div>
            <div><dt>Documento</dt><dd>{residente.documento}</dd></div>
            <div><dt>Email</dt><dd>{residente.email}</dd></div>
            <div><dt>Telefone</dt><dd>{residente.telefone}</dd></div>
            <div><dt>Morada</dt><dd>{residente.morada}</dd></div>
            <div><dt>Município</dt><dd>{residente.municipio}</dd></div>
            <div><dt>País</dt><dd>{residente.pais}</dd></div>
            <div><dt>Código postal</dt><dd>{residente.codigoPostal}</dd></div>
            <div><dt>Criado em</dt><dd>{new Date(residente.criadoEm).toLocaleString("pt-PT")}</dd></div>
          </dl>
        </section>

        <section className="admin-drawer-secao">
          <h3>Estado da conta</h3>
          <p>
            Estado atual:{" "}
            <span className={`admin-badge admin-badge-${residente.estado}`}>
              {residente.estado}
            </span>
          </p>

          <div className="admin-acoes-linha">
            {residente.estado === "pendente" && (
              <button
                type="button"
                className="admin-btn-primario"
                onClick={() => setAcaoModal({ tipo: "estado", novoEstado: "ativo" })}
              >
                Ativar
              </button>
            )}

            {residente.estado === "ativo" && (
              <button
                type="button"
                className="admin-btn-perigo"
                onClick={() => setAcaoModal({ tipo: "estado", novoEstado: "suspenso" })}
              >
                Suspender
              </button>
            )}

            {residente.estado === "suspenso" && (
              <button
                type="button"
                className="admin-btn-primario"
                onClick={() => setAcaoModal({ tipo: "estado", novoEstado: "ativo" })}
              >
                Restaurar
              </button>
            )}
          </div>
        </section>

        <section className="admin-drawer-secao">
          <h3>Saldo e swipes</h3>

          <div className="admin-ajuste-grid">
            <div className="admin-ajuste-caixa">
              <strong>Saldo: {residente.saldo.toLocaleString("pt-PT")} CVE</strong>

              <div className="admin-ajuste-form">
                <select
                  value={operacaoSaldo}
                  onChange={(event) =>
                    setOperacaoSaldo(event.target.value as AjustarValorPayload["operacao"])
                  }
                >
                  <option value="adicionar">Adicionar</option>
                  <option value="retirar">Retirar</option>
                  <option value="definir">Definir valor exato</option>
                </select>

                <input
                  type="number"
                  min={0}
                  value={valorSaldo}
                  onChange={(event) => setValorSaldo(event.target.value)}
                  placeholder="Valor (CVE)"
                />

                <button
                  type="button"
                  className="admin-btn-primario"
                  disabled={!valorSaldo || Number(valorSaldo) < 0}
                  onClick={() =>
                    setAcaoModal({
                      tipo: "saldo",
                      payload: {
                        operacao: operacaoSaldo,
                        valor: Number(valorSaldo),
                        motivo: "",
                      },
                    })
                  }
                >
                  Ajustar saldo
                </button>
              </div>
            </div>

            <div className="admin-ajuste-caixa">
              <strong>Swipes: {residente.swipes}</strong>

              <div className="admin-ajuste-form">
                <select
                  value={operacaoSwipes}
                  onChange={(event) =>
                    setOperacaoSwipes(event.target.value as AjustarValorPayload["operacao"])
                  }
                >
                  <option value="adicionar">Adicionar</option>
                  <option value="retirar">Retirar</option>
                  <option value="definir">Definir valor exato</option>
                </select>

                <input
                  type="number"
                  min={0}
                  value={valorSwipes}
                  onChange={(event) => setValorSwipes(event.target.value)}
                  placeholder="Quantidade"
                />

                <button
                  type="button"
                  className="admin-btn-primario"
                  disabled={!valorSwipes || Number(valorSwipes) < 0}
                  onClick={() =>
                    setAcaoModal({
                      tipo: "swipes",
                      payload: {
                        operacao: operacaoSwipes,
                        valor: Number(valorSwipes),
                        motivo: "",
                      },
                    })
                  }
                >
                  Ajustar swipes
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-drawer-secao">
          <h3>Permissões</h3>

          <div className="admin-permissoes-linha">
            <label>
              <input
                type="checkbox"
                checked={eventos}
                onChange={(event) => setEventos(event.target.checked)}
              />
              Acesso a eventos
            </label>

            <label>
              <input
                type="checkbox"
                checked={parking}
                onChange={(event) => setParking(event.target.checked)}
              />
              Estacionamento
            </label>

            <button
              type="button"
              className="admin-btn-secundario"
              disabled={aGuardarPermissoes}
              onClick={guardarPermissoes}
            >
              {aGuardarPermissoes ? "A guardar..." : "Guardar permissões"}
            </button>
          </div>

          <dl className="admin-lista-dados">
            <div><dt>QR digital</dt><dd>{residente.qrAtivo ? "Ativo" : "Inativo"}</dd></div>
            <div><dt>UID do cartão</dt><dd>{residente.uid || "—"}</dd></div>
          </dl>
        </section>

        <section className="admin-drawer-secao">
          <h3>Pedido de cartão</h3>

          <p>
            Estado: <strong>{residente.estadoPedidoCartao || "não solicitado"}</strong>
            {" · "}
            Cartão gerado: <strong>{residente.cartaoGerado ? "Sim" : "Não"}</strong>
          </p>

          <div className="admin-acoes-linha">
            {residente.pedidoCartao && residente.estadoPedidoCartao === "pendente" && (
              <>
                <button
                  type="button"
                  className="admin-btn-primario"
                  onClick={() => setAcaoModal({ tipo: "cartao-aprovar" })}
                >
                  Aprovar pedido
                </button>

                <button
                  type="button"
                  className="admin-btn-perigo"
                  onClick={() => setAcaoModal({ tipo: "cartao-rejeitar" })}
                >
                  Rejeitar pedido
                </button>
              </>
            )}

            {residente.estadoPedidoCartao === "aprovado" && !residente.cartaoGerado && (
              <div className="admin-ajuste-form">
                <input
                  type="text"
                  placeholder="UID do cartão físico"
                  value={uidCartao}
                  onChange={(event) => setUidCartao(event.target.value)}
                />

                <button
                  type="button"
                  className="admin-btn-primario"
                  disabled={!uidCartao.trim()}
                  onClick={() => setAcaoModal({ tipo: "cartao-gerado" })}
                >
                  Marcar como gerado
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="admin-drawer-secao">
          <h3>Fotografias</h3>

          <div className="admin-fotos-grid">
            {(["perfil", "bi", "cartao"] as TipoFotoRevisao[]).map((tipo) => {
              const estadoFoto =
                tipo === "perfil"
                  ? residente.estadoFotoPerfil
                  : tipo === "bi"
                    ? residente.estadoFotoBI
                    : residente.estadoFotoCartao;

              const motivoRejeicao =
                tipo === "perfil"
                  ? residente.motivoRejeicaoFotoPerfil
                  : tipo === "bi"
                    ? residente.motivoRejeicaoFotoBI
                    : residente.motivoRejeicaoFotoCartao;

              return (
                <div className="admin-foto-card" key={tipo}>
                  <span className="admin-foto-titulo">{ROTULO_FOTO[tipo]}</span>

                  <span className={`admin-badge admin-badge-foto-estado-${estadoFoto}`}>
                    {estadoFoto}
                  </span>

                  {estadoFoto !== "ausente" ? (
                    <button
                      type="button"
                      className="admin-foto-preview-botao"
                      onClick={() => setImagemAmpliada(urlFotoResidente(id, tipo))}
                    >
                      <img
                        src={urlFotoResidente(id, tipo)}
                        alt={ROTULO_FOTO[tipo]}
                      />
                    </button>
                  ) : (
                    <div className="admin-foto-vazia">Sem fotografia enviada</div>
                  )}

                  {motivoRejeicao && (
                    <small className="admin-foto-motivo">Motivo: {motivoRejeicao}</small>
                  )}

                  {estadoFoto !== "ausente" && (
                    <div className="admin-acoes-linha">
                      <button
                        type="button"
                        className="admin-btn-primario"
                        onClick={() => setAcaoModal({ tipo: "foto-aprovar", fotoTipo: tipo })}
                      >
                        Aprovar
                      </button>

                      <button
                        type="button"
                        className="admin-btn-perigo"
                        onClick={() => setAcaoModal({ tipo: "foto-rejeitar", fotoTipo: tipo })}
                      >
                        Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="admin-drawer-secao">
          <h3>Histórico administrativo</h3>

          {historico.length === 0 ? (
            <p className="admin-sem-dados">Sem ações registadas para este residente.</p>
          ) : (
            <ul className="admin-historico-lista">
              {historico.map((entrada) => (
                <li key={entrada.id}>
                  <strong>{entrada.acao}</strong> por {entrada.adminUsername} em{" "}
                  {new Date(entrada.criadoEm).toLocaleString("pt-PT")}
                  {entrada.motivo && <span> — {entrada.motivo}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {imagemAmpliada && (
        <div
          className="admin-lightbox-fundo"
          onClick={() => setImagemAmpliada(null)}
          role="presentation"
        >
          <img src={imagemAmpliada} alt="Fotografia ampliada" />
        </div>
      )}

      {acaoModal && (
        <ModalConfirmacao
          titulo={tituloModal(acaoModal)}
          descricao={descricaoModal(acaoModal)}
          exigirMotivo={exigeMotivo(acaoModal)}
          rotuloCampo={acaoModal.tipo === "cartao-gerado" ? "UID do cartão" : "Motivo"}
          placeholderCampo={
            acaoModal.tipo === "cartao-gerado"
              ? "Número/UID do cartão físico"
              : "Explica o motivo desta ação"
          }
          perigo={
            acaoModal.tipo === "foto-rejeitar" ||
            acaoModal.tipo === "cartao-rejeitar" ||
            (acaoModal.tipo === "estado" && acaoModal.novoEstado === "suspenso")
          }
          aProcessar={aProcessar}
          onConfirmar={(motivo) => {
            if (acaoModal.tipo === "cartao-gerado") {
              executarAcaoModal(uidCartao.trim());
            } else {
              executarAcaoModal(motivo);
            }
          }}
          onCancelar={() => setAcaoModal(null)}
        />
      )}
    </div>
  );
}

function tituloModal(acao: NonNullable<AcaoModal>): string {
  switch (acao.tipo) {
    case "saldo":
      return "Confirmar ajuste de saldo";
    case "swipes":
      return "Confirmar ajuste de swipes";
    case "estado":
      return acao.novoEstado === "suspenso"
        ? "Suspender conta"
        : "Ativar/restaurar conta";
    case "foto-aprovar":
      return `Aprovar ${ROTULO_FOTO[acao.fotoTipo].toLowerCase()}`;
    case "foto-rejeitar":
      return `Rejeitar ${ROTULO_FOTO[acao.fotoTipo].toLowerCase()}`;
    case "cartao-aprovar":
      return "Aprovar pedido de cartão";
    case "cartao-rejeitar":
      return "Rejeitar pedido de cartão";
    case "cartao-gerado":
      return "Marcar cartão como gerado";
  }
}

function descricaoModal(acao: NonNullable<AcaoModal>): string | undefined {
  switch (acao.tipo) {
    case "saldo":
      return `${acao.payload.operacao} ${acao.payload.valor} CVE.`;
    case "swipes":
      return `${acao.payload.operacao} ${acao.payload.valor} swipes.`;
    case "estado":
      return acao.novoEstado === "suspenso"
        ? "A conta deixa de poder aceder aos serviços até ser restaurada."
        : undefined;
    default:
      return undefined;
  }
}

function exigeMotivo(acao: NonNullable<AcaoModal>): boolean {
  return (
    acao.tipo === "saldo" ||
    acao.tipo === "swipes" ||
    acao.tipo === "cartao-gerado" ||
    acao.tipo === "cartao-rejeitar" ||
    acao.tipo === "foto-rejeitar" ||
    (acao.tipo === "estado" && acao.novoEstado === "suspenso")
  );
}
