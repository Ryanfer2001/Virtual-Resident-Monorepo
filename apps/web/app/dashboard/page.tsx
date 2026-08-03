"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate } from "animejs";
import QRCode from "qrcode";

import Header from "@/components/Header";

import {
  obterResidenteGuardado,
  terminarSessao,
} from "@/lib/auth";

import type {
  Residente,
} from "@/types/residente";

export default function DashboardPage() {
  const router = useRouter();

  const [residente, setResidente] =
    useState<Residente | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const cartaoRef = useRef<HTMLDivElement>(null);

  const [qrDataUrl, setQrDataUrl] =
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
      }
    }

    gerarQr();
    const intervalId = setInterval(gerarQr, 30000);

    return () => {
      cancelado = true;
      clearInterval(intervalId);
    };
  }, [residente]);

  // Exibição 3D automática do cartão: roda continuamente nos eixos X
  // e Y (o eixo Z fica sempre a 0deg). rotateY segue cos(theta) e
  // rotateX segue sin(theta), o que traça uma pequena elipse no
  // sentido anti-horário — só alguns graus, nunca uma volta completa
  // nem o cartão ao contrário. No hover, a amplitude é reduzida a 0,
  // o que faz o cartão convergir sempre para rotateX(0) rotateY(0),
  // seja qual for a fase em que a rotação estava.
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
    <>
      <Header residente={residente} />

      <main className="dashboard-page">
        <section className="dashboard-boas-vindas">
          <div>
            <span className="dashboard-eyebrow">
              Área do residente
            </span>

            <h1>
              Olá,{" "}
              {residente.nome?.split(" ")[0]}
            </h1>

            <p>
              Consulta a tua conta, saldo, pacote,
              cartão e serviços NOSZONA.
            </p>
          </div>


        </section>

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
              <div className="cartao-3d-perspective">
                <div
                  className="cartao-residente-digital"
                  ref={cartaoRef}
                >

                  <div className="cartao-topo, ">

                    <strong>Cabo Verde Virtual Rresidente</strong>

                  </div>

                  <div className="cartao-corpo">
                    <div>
                      <small>Residente</small>
                      <strong>
                        {residente.nome}
                      </strong>

                    </div>

                    <div>
                      <br></br>
                      <small>ID</small>
                      <strong>
                        {residente.id}
                      </strong>
                    </div>
                    <br></br>

                    <div>
                      <small>Pacote</small>
                      <strong>
                        {residente.pacote ||
                          "Sem pacote"}
                      </strong>
                    </div>
                  </div>

                </div>
              </div>

              <div className="cartao-qr-lateral">
                <span className="cartao-qr-legenda">
                  QR dinâmico
                </span>

                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR code de identidade do residente"
                    className="cartao-qr-imagem"
                  />
                ) : (
                  <div className="cartao-qr-placeholder" />
                )}

                <small className="cartao-qr-nota">
                  Atualiza a cada 30 segundos
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

              <Servico
                nome="Estacionamento"
                ativo={Boolean(
                  residente.parking,
                )}
              />

              <Servico
                nome="QR digital"
                ativo={Boolean(
                  residente.qrAtivo,
                )}
              />

              <Servico
                nome="Cartão físico"
                ativo={Boolean(
                  residente.cartaoGerado,
                )}
              />
            </div>
          </article>
        </section>
      </main>
    </>
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