"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { logoutAdmin, obterResumo, obterSessaoAdmin } from "@/lib/admin-api";
import type { ResumoDashboard } from "@/types/admin";

import ResumoCards from "./components/ResumoCards";
import TabelaResidentes from "./components/TabelaResidentes";
import PainelResidente from "./components/PainelResidente";
import RevisaoFotosGlobal from "./components/RevisaoFotosGlobal";
import PedidosCartaoLista from "./components/PedidosCartao";
import TabelaAuditoria from "./components/TabelaAuditoria";

import "./admin-dashboard.css";

type Seccao = "resumo" | "residentes" | "fotos" | "cartoes" | "auditoria";

const SECCOES: Array<{ id: Seccao; rotulo: string }> = [
  { id: "resumo", rotulo: "Visão geral" },
  { id: "residentes", rotulo: "Residentes" },
  { id: "fotos", rotulo: "Fotografias" },
  { id: "cartoes", rotulo: "Cartões" },
  { id: "auditoria", rotulo: "Auditoria" },
];

export default function AdminDashboardPage() {
  const router = useRouter();

  const [seccaoAtiva, setSeccaoAtiva] = useState<Seccao>("resumo");
  const [resumo, setResumo] = useState<ResumoDashboard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [residenteSelecionado, setResidenteSelecionado] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      try {
        const sessao = await obterSessaoAdmin();

        if (!sessao.sucesso) {
          throw new Error(sessao.mensagem || "Sessão inválida.");
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
    return <main className="admin-loading">A carregar painel administrativo...</main>;
  }

  if (!resumo) {
    return null;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-topo">
          <span className="admin-eyebrow">Cabo Verde Virtual Resident</span>
          <strong>Área administrativa</strong>
        </div>

        <nav className="admin-nav">
          {SECCOES.map((seccao) => (
            <button
              key={seccao.id}
              type="button"
              className={`admin-nav-item${seccaoAtiva === seccao.id ? " admin-nav-item-ativo" : ""}`}
              onClick={() => setSeccaoAtiva(seccao.id)}
            >
              {seccao.rotulo}
            </button>
          ))}
        </nav>

        <button type="button" className="admin-btn-sair" onClick={terminarSessao}>
          Terminar sessão
        </button>
      </aside>

      <main className="admin-conteudo">
        {seccaoAtiva === "resumo" && <ResumoCards resumo={resumo} />}

        {seccaoAtiva === "residentes" && (
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
