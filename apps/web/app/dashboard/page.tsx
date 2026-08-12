"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { animate } from "animejs";
import QRCode from "qrcode";

import Header from "@/components/Header";

import {
  atualizarResidenteGuardado,
  obterResidenteGuardado,
  terminarSessao,
} from "@/lib/auth";

import { enviarFotosResidente } from "@/lib/api";
import { comprimirImagemArquivo } from "@/lib/imagens";

import type {
  Residente,
} from "@/types/residente";

import "./dashboard.css";

const FOTO_CARTAO_PADRAO = "/img/usercard.jpg";

export default function DashboardPage() {
  const router = useRouter();

  const [residente, setResidente] =
    useState<Residente | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const cartaoRef = useRef<HTMLDivElement>(null);

  const [qrDataUrl, setQrDataUrl] =
    useState<string | null>(null);

  const [qrSegundos, setQrSegundos] =
    useState(30);

  const [tema, setTema] =
    useState<"claro" | "escuro">("claro");

  const inputFotoCartaoRef =
    useRef<HTMLInputElement>(null);

  const [enviandoFotoCartao, setEnviandoFotoCartao] =
    useState(false);

  const [erroFotoCartao, setErroFotoCartao] =
    useState("");

  const [pedidoPacote, setPedidoPacote] =
    useState<string | null>(null);

  useEffect(() => {
    const residenteSalvo =
      obterResidenteGuardado();

    if (!residenteSalvo) {
      router.replace("/login");
      return;
    }

    setResidente(residenteSalvo);
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search,
    );

    const pacoteParam = params.get(
      "pedidoPacote",
    );

    if (!pacoteParam) {
      return;
    }

    setPedidoPacote(pacoteParam);

    window.history.replaceState(
      null,
      "",
      window.location.pathname,
    );
  }, []);

  useEffect(() => {
    const temaSalvo = localStorage.getItem("nz-dashboard-tema");
    if (temaSalvo === "claro" || temaSalvo === "escuro") {
      setTema(temaSalvo);
    }
  }, []);

  function alternarTema() {
    setTema((atual) => {
      const proximo = atual === "claro" ? "escuro" : "claro";
      localStorage.setItem("nz-dashboard-tema", proximo);
      return proximo;
    });
  }

  // QR code de identidade: regenerado a cada 30s com um novo timestamp,
  // para que o código exibido vá sempre mudando.
  useEffect(() => {
    if (!residente) return;

    let cancelado = false;

    async function gerarQr() {
      const payload = JSON.stringify({
        uid: residente!.uid || residente!.id,
        ts: Math.floor(Date.now() / 1000),
      });

      const dataUrl = await QRCode.toDataURL(payload, {
        width: 200,
        margin: 1,
        color: {
          dark: "#09263f",
          light: "#ffffff",
        },
      });

      if (!cancelado) {
        setQrDataUrl(dataUrl);
        setQrSegundos(30);
      }
    }

    gerarQr();
    const intervalId = setInterval(gerarQr, 30000);
    const contadorId = setInterval(() => {
      setQrSegundos((segundos) => (segundos > 0 ? segundos - 1 : 0));
    }, 1000);

    return () => {
      cancelado = true;
      clearInterval(intervalId);
      clearInterval(contadorId);
    };
  }, [residente]);


  useEffect(() => {
    const el = cartaoRef.current;

    if (!el) return;

    const prefereMovimentoReduzido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefereMovimentoReduzido) {
      el.style.transform =
        "rotateX(0deg) rotateY(0deg) rotateZ(0deg) translateY(0)";
      return;
    }

    const amplitude = { v: 1 };
    const estado = { theta: 0 };

    // amplitudes máximas de inclinação (graus) e de flutuação (px)
    const amplitudeX = 4;
    const amplitudeY = 7;
    const amplitudeTranslate = 5;

    const loop = animate(estado, {
      theta: Math.PI * 2,
      duration: 12000,
      ease: "linear",
      loop: true,
      onUpdate: () => {
        const rx = Math.sin(estado.theta) * amplitudeX * amplitude.v;
        const ry = Math.cos(estado.theta) * amplitudeY * amplitude.v;
        const ty = Math.sin(estado.theta) * amplitudeTranslate * amplitude.v;

        el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(0deg) translateY(${ty}px)`;
      },
    });

    function pousar() {
      animate(amplitude, {
        v: 0,
        duration: 500,
        ease: "outQuad",
      });
    }

    function retomar() {
      animate(amplitude, {
        v: 1,
        duration: 700,
        ease: "outQuad",
      });
    }

    el.addEventListener("mouseenter", pousar);
    el.addEventListener("mouseleave", retomar);

    return () => {
      loop.pause();
      el.removeEventListener("mouseenter", pousar);
      el.removeEventListener("mouseleave", retomar);
      el.style.transform = "";
    };
  }, [carregando]);

  function sair() {
    terminarSessao();
    router.push("/");
    router.refresh();
  }

  function abrirSeletorFotoCartao() {
    setErroFotoCartao("");
    inputFotoCartaoRef.current?.click();
  }

  async function aoSelecionarFotoCartao(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const ficheiro = event.target.files?.[0];
    event.target.value = "";

    if (!ficheiro || !residente) {
      return;
    }

    setErroFotoCartao("");
    setEnviandoFotoCartao(true);

    try {
      const fotoCartaoBase64 =
        await comprimirImagemArquivo(ficheiro);

      const resposta = await enviarFotosResidente({
        residenteId: residente.id,
        fotoCartaoBase64,
      });

      if (!resposta.sucesso) {
        throw new Error(
          resposta.mensagem ||
            "Não foi possível atualizar a foto do cartão.",
        );
      }

      const residenteAtualizado: Residente = {
        ...residente,
        fotoCartaoBase64,
      };

      setResidente(residenteAtualizado);
      atualizarResidenteGuardado(residenteAtualizado);
    } catch (error) {
      setErroFotoCartao(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a foto do cartão.",
      );
    } finally {
      setEnviandoFotoCartao(false);
    }
  }

  if (carregando) {
    return (
      <main className="dashboard-loading">
        A carregar dashboard...
      </main>
    );
  }

  if (!residente) {
    return null;
  }

  return (
    <div className={`dashboard-shell tema-${tema}`}>
      <Header residente={residente} />

      <main className="dashboard-page">
        {tema === "claro" && (
          <div className="dashboard-sol" aria-hidden="true" />
        )}

        <div className="dashboard-content">
        <section className="dashboard-boas-vindas">
          <div>
            <span className="dashboard-eyebrow">
              Área do residente
            </span>

            <h1>
              Olá,{" "}
              {residente.nome?.split(" ")[0]}
            </h1>


          </div>

          <button
            type="button"
            className="tema-toggle-btn"
            onClick={alternarTema}
            aria-pressed={tema === "escuro"}
          >
            {tema === "claro" ? "🌙 Modo noturno" : "☀️ Modo diurno"}
          </button>
        </section>

        {pedidoPacote && (
          <div className="dashboard-aviso-pacote">
            Pedido de mudança para o pacote{" "}
            <strong>{pedidoPacote}</strong> enviado.
            A nossa equipa vai confirmar a
            alteração em breve.
          </div>
        )}

        <section className="dashboard-resumo">
          <DashboardCard
            titulo="Saldo disponível"
            valor={`${Number(
              residente.saldo || 0,
            ).toLocaleString("pt-PT")} CVE`}
            descricao="Carteira virtual"
          />

          <DashboardCard
            titulo="Swipes"
            valor={String(
              residente.swipes || 0,
            )}
            descricao="Utilizações disponíveis"
          />

          <DashboardCard
            titulo="Pacote atual"
            valor={
              residente.pacote ||
              "Sem pacote"
            }
            descricao="Plano do residente"
          />

          <DashboardCard
            titulo="QR Digital"
            valor={
              residente.qrAtivo
                ? "Ativo"
                : "Inativo"
            }
            descricao="Identidade digital"
          />
        </section>

        <section className="dashboard-grid">
          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-eyebrow">
                  Identidade digital
                </span>

                <h2>Cartão do residente</h2>
              </div>

              <span
                className={`estado-badge ${
                  residente.cartaoGerado
                    ? "estado-ativo"
                    : "estado-pendente"
                }`}
              >
                {residente.cartaoGerado
                  ? "Ativo"
                  : "Pendente"}
              </span>
            </div>

            <div className="cartao-e-qr">
              <div className="cartao-coluna">
                <div className="cartao-3d-perspective">
                  <div
                    className="cartao-residente-digital"
                    ref={cartaoRef}
                  >

                    <div className="cartao-foto-canto">
                      <img
                        src={
                          residente.fotoCartaoBase64 ||
                          FOTO_CARTAO_PADRAO
                        }
                        alt={`Foto de ${residente.nome} no cartão`}
                        className="cartao-foto-residente"
                      />
                    </div>

                    <div className="cartao-topo">
                      <strong>Cabo Verde Virtual Residente</strong>
                    </div>

                    <div className="cartao-dado cartao-dado-residente">
                      <small>Residente</small>
                      <strong>{residente.nome}</strong>
                    </div>

                    <div className="cartao-dado cartao-dado-id">
                      <small>ID</small>
                      <strong>{residente.id}</strong>
                    </div>

                    <div className="cartao-dado cartao-dado-pacote">
                      <small>Pacote</small>
                      <strong>
                        {residente.pacote || "Sem pacote"}
                      </strong>
                    </div>

                  </div>
                </div>

                <input
                  ref={inputFotoCartaoRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={aoSelecionarFotoCartao}
                />

                <button
                  type="button"
                  className="btn-add-foto-cartao"
                  onClick={abrirSeletorFotoCartao}
                  disabled={enviandoFotoCartao}
                >
                  {enviandoFotoCartao
                    ? "A enviar foto..."
                    : "Adicionar foto para cartão"}
                </button>

                {erroFotoCartao && (
                  <small className="erro-foto-cartao">
                    {erroFotoCartao}
                  </small>
                )}
              </div>
              
              <div className="cartao-qr-lateral">

                <span className="cartao-qr-legenda">
                  QR Seguro
                </span>

                <div className="cartao-qr-moldura">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR code de identidade do residente"
                      className="cartao-qr-imagem"
                    />
                  ) : (
                    <div className="cartao-qr-placeholder" />
                  )}
                </div>

                <div className="qr-progresso">
                  <div
                    className="qr-progresso-barra"
                    style={{ width: `${(qrSegundos / 30) * 100}%` }}
                  />
                </div>

                <span className="qr-progresso-texto">
                  Renova em <strong>{qrSegundos}s</strong>
                </span>

                <small className="cartao-qr-nota">
                  Apresenta este código em eventos e serviços Smart
                  City. O código renova a cada 30 segundos para
                  proteção contra fraude.
                </small>
              </div>
            </div>
          </article>

          <article className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <span className="dashboard-eyebrow">
                  Serviços
                </span>

                <h2>Acessos disponíveis</h2>
              </div>
            </div>

            <div className="servicos-lista">
              <Servico
                nome="Eventos"
                ativo={Boolean(
                  residente.eventos,
                )}
              />

            <div className="recharge-box">
              <h3>Recarregar conta</h3>
              <p className="recharge-note">
                Escolhe o tipo de recarga e segue para o pagamento
                seguro Vinti4.
              </p>

              <form
                className="recharge-form"
                action="/api/pagamento/iniciar"
                method="POST"
                target="_blank"
              >
                <input
                  type="hidden"
                  name="residenteId"
                  value={residente.id}
                />
                <input
                  type="hidden"
                  name="username"
                  value={residente.username}
                />
                <input
                  type="hidden"
                  name="pacote"
                  value={residente.pacote || "Recarga"}
                />
                <input
                  type="hidden"
                  name="email"
                  value={residente.email || ""}
                />
                <input
                  type="hidden"
                  name="telefone"
                  value={residente.telefone || ""}
                />
                <input
                  type="hidden"
                  name="municipio"
                  value={residente.municipio || "Praia"}
                />
                <input
                  type="hidden"
                  name="morada"
                  value={residente.morada || "Cabo Verde"}
                />
                <input
                  type="hidden"
                  name="codigoPostal"
                  value={residente.codigoPostal || ""}
                />

                <div className="form-group">
                  <label htmlFor="tipoRecarga">
                    Tipo de recarga
                  </label>
                  <select 
                    id="tipoRecarga"
                    name="tipo"
                    className="recharge-btn"
                    defaultValue="saldo"
                    required
                  >
                    <option value="saldo">
                      Recarregar saldo (CVE)
                    </option>
                    <option value="swipe" disabled>
                      Recarregar swipes (brevemente disponível)
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="valorRecarga">
                    Valor da recarga
                  </label>
                  <input
                    id="valorRecarga"
                    name="valor"
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    required
                    placeholder="Ex.: 5000"
                  />
                </div>

                <button
                  type="submit"
                  className="recharge-btn"
                >
                  Continuar para pagamento →
                </button>
              </form>
              </div>


              </div>

            
          </article>
        </section>
        
        </div>
      </main>
    </div>
  );
}

function DashboardCard({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: string;
  descricao: string;
}) {
  return (
    <article className="dashboard-card">
      <span>{titulo}</span>
      <strong>{valor}</strong>
      <small>{descricao}</small>
    </article>
  );
}

function Servico({
  nome,
  ativo,
}: {
  nome: string;
  ativo: boolean;
}) {
  return (
    <div className="servico-item">
      <span>{nome}</span>

      <strong
        className={
          ativo
            ? "servico-ativo"
            : "servico-inativo"
        }
      >
        {ativo
          ? "Disponível"
          : "Indisponível"}
      </strong>
    </div>
  );
}