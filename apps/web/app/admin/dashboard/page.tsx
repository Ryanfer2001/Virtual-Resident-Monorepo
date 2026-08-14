"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useRouter } from "next/navigation";

import { logoutAdmin, obterResumo, obterSessaoAdmin } from "@/lib/admin-api";
import type { Administrador, ResumoDashboard } from "@/types/admin";

import ResumoCards from "./components/ResumoCards";
import TabelaResidentes from "./components/TabelaResidentes";
import PainelResidente from "./components/PainelResidente";
import RevisaoFotosGlobal from "./components/RevisaoFotosGlobal";
import PedidosCartaoLista from "./components/PedidosCartao";
import TabelaAuditoria from "./components/TabelaAuditoria";

import "./admin-dashboard.css";

type Seccao = "resumo" | "V-residentes" | "fotos" | "cartoes" | "auditoria";

type IconeSeccao = () => ReactElement;

const SECOES: Array<{
  id: Seccao;
  rotulo: string;
  descricao: string;
  icone: IconeSeccao;
}> = [
  {
    id: "resumo",
    rotulo: "Visão geral",
    descricao: "Resumo da plataforma e da atividade recente dos residentes.",
    icone: IconeGrelha,
  },
  {
    id: "V-residentes",
    rotulo: "Residentes",
    descricao: "Consulta, filtra e gere as contas registadas.",
    icone: IconePessoas,
  },
  {
    id: "fotos",
    rotulo: "Fotografias",
    descricao: "Revê e aprova as fotografias submetidas pelos residentes.",
    icone: IconeImagem,
  },
  {
    id: "cartoes",
    rotulo: "Cartões",
    descricao: "Acompanha os pedidos de cartão físico.",
    icone: IconeCartao,
  },
  {
    id: "auditoria",
    rotulo: "Auditoria",
    descricao: "Histórico de ações realizadas pela equipa administrativa.",
    icone: IconeHistorico,
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();

  const [seccaoAtiva, setSeccaoAtiva] = useState<Seccao>("resumo");
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
  const [admin, setAdmin] = useState<Administrador | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [residenteSelecionado, setResidenteSelecionado] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      try {
        const sessao = await obterSessaoAdmin();

        if (!sessao.sucesso) {
          throw new Error(sessao.mensagem || "Seção inválida.");
        }

        if (!cancelado) {
          setAdmin(sessao.admin || null);
        }

        const resposta = await obterResumo();

        if (!cancelado) {
          setResumo(resposta.resumo);
        }
      } catch (error) {
        if (cancelado) return;

        router.replace("/admin/login");
        return;
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    iniciar();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function terminarSessao() {
    try {
      await logoutAdmin();
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  function fecharPainelResidente() {
    setResidenteSelecionado(null);

    if (seccaoAtiva === "resumo") {
      obterResumo()
        .then((resposta) => setResumo(resposta.resumo))
        .catch(() => undefined);
    }
  }

  if (carregando) {
    return (
      <main className="admin-loading">
        <img src="/img/admin-loading.gif" alt="" className="admin-loading-gif" />
        <span>A carregar painel administrativo...</span>
      </main>
    );
  }

  if (!resumo) {
    return null;
  }

  const seccaoAtual = SECOES.find((seccao) => seccao.id === seccaoAtiva) || SECOES[0];
  const iniciaisAdmin = (admin?.username || "AD").slice(0, 2).toUpperCase();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-topo">
          <span className="admin-eyebrow">Cabo Verde Virtual Resident</span>
   
        </div>

        <div className="admin-conta">
          <span className="admin-conta-avatar">{iniciaisAdmin}</span>
          <span className="admin-conta-info">
            <strong>{admin?.username || "Administrador"}</strong>
            <small>Sessão ADM</small>
          </span>
        </div>

        <nav className="admin-nav">
          

          {SECOES.map((secao) => {
            const Icone = secao.icone;

            return (
              <button
                key={secao.id}
                type="button"
                title={secao.rotulo}
                className={`admin-nav-item${seccaoAtiva === secao.id ? " admin-nav-item-ativo" : ""}`}
                onClick={() => setSeccaoAtiva(secao.id)}
              >
                <Icone />
                <span className="admin-nav-item-rotulo">{secao.rotulo}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          title="Terminar sessão"
          className="admin-btn-sair"
          onClick={terminarSessao}
        >
          <IconeSair />
          <span className="admin-nav-item-rotulo">Terminar seção</span>
        </button>
      </aside>

      <main className="admin-conteudo">
        <div className="admin-conteudo-cabecalho">
          <div>
            <span className="admin-eyebrow">Painel</span>
            <h1>{seccaoAtual.rotulo}</h1>
            <p>{seccaoAtual.descricao}</p>
          </div>
        </div>

        {seccaoAtiva === "resumo" && <ResumoCards resumo={resumo} />}

        {seccaoAtiva === "V-residentes" && (
          <TabelaResidentes onSelecionar={setResidenteSelecionado} />
        )}


        {seccaoAtiva === "fotos" && (
          <RevisaoFotosGlobal onSelecionar={setResidenteSelecionado} />
        )}

        {seccaoAtiva === "cartoes" && (
          <PedidosCartaoLista onSelecionar={setResidenteSelecionado} />
        )}

        {seccaoAtiva === "auditoria" && <TabelaAuditoria />}
      </main>

      {residenteSelecionado && (
        <PainelResidente id={residenteSelecionado} onFechar={fecharPainelResidente} />
      )}
    </div>
  );
}

const PROPRIEDADES_ICONE = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconeGrelha() {
  return (
    <svg {...PROPRIEDADES_ICONE}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </svg>
  );
}

function IconePessoas() {
  return (
    <svg {...PROPRIEDADES_ICONE}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="17.5" cy="8.5" r="2.2" />
      <path d="M15.3 14.8c2.5.5 4 2.3 4 5.2" />
    </svg>
  );
}

function IconeImagem() {
  return (
    <svg {...PROPRIEDADES_ICONE}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16.5l-5.5-5.5-4 4-2.5-2.5L3 18" />
    </svg>
  );
}

function IconeCartao() {
  return (
    <svg {...PROPRIEDADES_ICONE}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M2.5 9.5h19" />
      <path d="M6 14.5h4" />
    </svg>
  );
}

function IconeHistorico() {
  return (
    <svg {...PROPRIEDADES_ICONE}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function IconeSair() {
  return (
    <svg {...PROPRIEDADES_ICONE} width={16} height={16}>
      <path d="M9 4H6a2 2 0 00-2 2v12a2 2 0 002 2h3" />
      <path d="M15 16l4-4-4-4" />
      <path d="M19 12H9" />
    </svg>
  );
}
