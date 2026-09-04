export type PacoteId =
  | "visitor"
  | "diaspora"
  | "business"
  | "student";

export interface SubPacote {
  id: string;
  nome: string;
  descricao: string;
}

export interface PacoteCategoria {
  id: PacoteId;
  titulo: string;
  planos: SubPacote[];
}

/*
 * Nome, categoria e descrição dos 12 pacotes — estrutura estável, sem
 * preço. O preço oficial (precoCVE) nunca fica hardcoded aqui; vem sempre
 * de GET /api/pacotes (ver obterPrecosPacotes), que lê
 * apps/api/src/config/catalogoPacotes.js — a única fonte de verdade.
 */
export const PACOTES: PacoteCategoria[] = [
  {
    id: "visitor",
    titulo: "VISITOR",
    planos: [
      {
        id: "visitor-basico",
        nome: "Visitor Básico",
        descricao: "Acesso à comunidade e eventos abertos.",
      },
      {
        id: "visitor-standard",
        nome: "Visitor Standard",
        descricao: "Tours guiados e acesso à Smart City Akademy.",
      },
      {
        id: "visitor-plus",
        nome: "Visitor Plus",
        descricao: "Acesso prioritário a eventos e parceiros de investimento.",
      },
    ],
  },
  {
    id: "diaspora",
    titulo: "DIASPORA",
    planos: [
      {
        id: "diaspora-start",
        nome: "Diaspora Start",
        descricao: "2.500 CVE de saldo e 20 swipes na cantina.",
      },
      {
        id: "diaspora-completo",
        nome: "Diaspora Completo",
        descricao: "5.000 CVE de saldo, 50 swipes e entrada em todos os eventos.",
      },
      {
        id: "diaspora-premium",
        nome: "Diaspora Premium",
        descricao: "10.000 CVE de saldo, swipes ilimitados e QR prioritário.",
      },
    ],
  },
  {
    id: "business",
    titulo: "BUSINESS",
    planos: [
      {
        id: "business-starter",
        nome: "Business Starter",
        descricao: "Registo do negócio e acesso à comunidade empresarial.",
      },
      {
        id: "business-growth",
        nome: "Business Growth",
        descricao: "Abertura de conta bancária e incubação incluídas.",
      },
      {
        id: "business-elite",
        nome: "Business Elite",
        descricao: "Acesso direto aos parceiros certos e mentoria dedicada.",
      },
    ],
  },
  {
    id: "student",
    titulo: "STUDENT",
    planos: [
      {
        id: "student-essencial",
        nome: "Student Essencial",
        descricao: "Acesso à Smart City Akademy.",
      },
      {
        id: "student-ativo",
        nome: "Student Ativo",
        descricao: "Inclui estágio (internship) e workshops.",
      },
      {
        id: "student-pro",
        nome: "Student Pro",
        descricao: "Acesso total ao startup program e mentoria de carreira.",
      },
    ],
  },
];

/*
|--------------------------------------------------------------------------
| Preços oficiais — obtidos do backend, nunca hardcoded aqui
|--------------------------------------------------------------------------
*/

interface PacotePublico {
  id: string;
  nome: string;
  categoria: string;
  precoCVE: number;
  descricao: string;
}

export async function obterPrecosPacotes(): Promise<Record<string, number>> {
  const resposta = await fetch("/api/pacotes", { cache: "no-store" });

  if (!resposta.ok) {
    throw new Error("Não foi possível obter os preços dos pacotes.");
  }

  const dados: PacotePublico[] = await resposta.json();

  return Object.fromEntries(
    dados.map((pacote) => [pacote.id, pacote.precoCVE]),
  );
}

export function formatarPrecoCVE(precoCVE: number | undefined): string {
  if (precoCVE === undefined) {
    return "";
  }

  const formatado = precoCVE
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${formatado} CVE`;
}
