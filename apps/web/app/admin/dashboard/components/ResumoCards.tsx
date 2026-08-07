import type { ResumoDashboard } from "@/types/admin";

interface ResumoCardsProps {
  resumo: ResumoDashboard;
}

export default function ResumoCards({ resumo }: ResumoCardsProps) {
  const cartoes: Array<{ titulo: string; valor: string; descricao: string }> = [
    {
      titulo: "Total de residentes",
      valor: String(resumo.totalResidentes),
      descricao: "Contas registadas",
    },
    {
      titulo: "Contas ativas",
      valor: String(resumo.contasAtivas),
      descricao: "Estado ativo",
    },
    {
      titulo: "Contas pendentes",
      valor: String(resumo.contasPendentes),
      descricao: "Aguardam ativação",
    },
    {
      titulo: "Contas suspensas",
      valor: String(resumo.contasSuspensas),
      descricao: "Suspensas por um administrador",
    },
    {
      titulo: "Saldo total",
      valor: `${resumo.somaSaldo.toLocaleString("pt-PT")} CVE`,
      descricao: "Soma da carteira de todos os residentes",
    },
    {
      titulo: "Swipes totais",
      valor: String(resumo.somaSwipes),
      descricao: "Disponíveis em todas as contas",
    },
    {
      titulo: "Fotografias pendentes",
      valor: String(resumo.fotosPendentes),
      descricao: "Rosto, BI ou cartão a aguardar revisão",
    },
    {
      titulo: "Pedidos de cartão pendentes",
      valor: String(resumo.pedidosCartaoPendentes),
      descricao: "Aguardam aprovação",
    },
  ];

  return (
    <>
      <section className="admin-resumo-grid">
        {cartoes.map((cartao) => (
          <article className="admin-resumo-card" key={cartao.titulo}>
            <span>{cartao.titulo}</span>
            <strong>{cartao.valor}</strong>
            <small>{cartao.descricao}</small>
          </article>
        ))}
      </section>

      <section className="admin-painel">
        <h2>Registos recentes</h2>

        <table className="admin-tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Utilizador</th>
              <th>Plano</th>
              <th>Estado</th>
              <th>Criado em</th>
            </tr>
          </thead>
          <tbody>
            {resumo.registosRecentes.map((residente) => (
              <tr key={residente.id}>
                <td>{residente.nome}</td>
                <td>{residente.username}</td>
                <td>{residente.pacote}</td>
                <td>
                  <span className={`admin-badge admin-badge-${residente.estado}`}>
                    {residente.estado}
                  </span>
                </td>
                <td>{new Date(residente.criadoEm).toLocaleString("pt-PT")}</td>
              </tr>
            ))}

            {resumo.registosRecentes.length === 0 && (
              <tr>
                <td colSpan={5}>Sem registos recentes.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
