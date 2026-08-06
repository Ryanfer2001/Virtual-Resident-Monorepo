export type PacoteId =
  | "visitor"
  | "diaspora"
  | "business"
  | "student";

export interface SubPacote {
  nome: string;
  preco: string;
  descricao: string;
}

export interface PacoteCategoria {
  id: PacoteId;
  titulo: string;
  planos: SubPacote[];
}

export const PACOTES: PacoteCategoria[] = [
  {
    id: "visitor",
    titulo: "VISITOR",
    planos: [
      {
        nome: "Visitor Básico",
        preco: "0 CVE",
        descricao:
          "Acesso à comunidade e eventos abertos.",
      },
      {
        nome: "Visitor Standard",
        preco: "1.500 CVE",
        descricao:
          "Tours guiados e acesso à Smart City Akademy.",
      },
      {
        nome: "Visitor Plus",
        preco: "3.000 CVE",
        descricao:
          "Acesso prioritário a eventos e parceiros de investimento.",
      },
    ],
  },
  {
    id: "diaspora",
    titulo: "DIASPORA",
    planos: [
      {
        nome: "Diaspora Start",
        preco: "2.500 CVE",
        descricao:
          "2.500 CVE de saldo e 20 swipes na cantina.",
      },
      {
        nome: "Diaspora Completo",
        preco: "5.000 CVE",
        descricao:
          "5.000 CVE de saldo, 50 swipes e entrada em todos os eventos.",
      },
      {
        nome: "Diaspora Premium",
        preco: "10.000 CVE",
        descricao:
          "10.000 CVE de saldo, swipes ilimitados e QR prioritário.",
      },
    ],
  },
  {
    id: "business",
    titulo: "BUSINESS",
    planos: [
      {
        nome: "Business Starter",
        preco: "5.000 CVE",
        descricao:
          "Registo do negócio e acesso à comunidade empresarial.",
      },
      {
        nome: "Business Growth",
        preco: "10.000 CVE",
        descricao:
          "Abertura de conta bancária e incubação incluídas.",
      },
      {
        nome: "Business Elite",
        preco: "20.000 CVE",
        descricao:
          "Acesso direto aos parceiros certos e mentoria dedicada.",
      },
    ],
  },
  {
    id: "student",
    titulo: "STUDENT",
    planos: [
      {
        nome: "Student Essencial",
        preco: "0 CVE",
        descricao:
          "Acesso à Smart City Akademy.",
      },
      {
        nome: "Student Ativo",
        preco: "1.000 CVE",
        descricao:
          "Inclui estágio (internship) e workshops.",
      },
      {
        nome: "Student Pro",
        preco: "2.000 CVE",
        descricao:
          "Acesso total ao startup program e mentoria de carreira.",
      },
    ],
  },
];
