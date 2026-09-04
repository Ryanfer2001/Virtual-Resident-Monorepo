/*
|--------------------------------------------------------------------------
| Catálogo oficial de pacotes
|--------------------------------------------------------------------------
|
| Fonte única de verdade dos 12 pacotes (preço, categoria e benefícios).
| Nunca duplicar estes valores noutro ficheiro — quem precisar de preço ou
| benefícios de um pacote importa este módulo.
|
| precoCVE é sempre o valor numérico oficial usado pelo backend (SISP,
| ativação de benefícios). Qualquer string formatada para exibição
| ("1.500 CVE") é responsabilidade exclusiva da camada de apresentação.
|--------------------------------------------------------------------------
*/

const PACOTES = [
  {
    id: "visitor-basico",
    nome: "Visitor Básico",
    categoria: "VISITOR",
    precoCVE: 0,
    descricao: "Acesso à comunidade e eventos abertos.",
    saldo: 0,
    swipes: 0,
    eventos: true,
    parking: false
  },
  {
    id: "visitor-standard",
    nome: "Visitor Standard",
    categoria: "VISITOR",
    precoCVE: 1500,
    descricao: "Tours guiados e acesso à Smart City Akademy.",
    saldo: 0,
    swipes: 0,
    eventos: false,
    parking: false
  },
  {
    id: "visitor-plus",
    nome: "Visitor Plus",
    categoria: "VISITOR",
    precoCVE: 3000,
    descricao: "Acesso prioritário a eventos e parceiros de investimento.",
    saldo: 0,
    swipes: 0,
    eventos: true,
    parking: false
  },

  {
    id: "diaspora-start",
    nome: "Diaspora Start",
    categoria: "DIASPORA",
    precoCVE: 2500,
    descricao: "2.500 CVE de saldo e 20 swipes na cantina.",
    saldo: 2500,
    swipes: 20,
    eventos: false,
    parking: false
  },
  {
    id: "diaspora-completo",
    nome: "Diaspora Completo",
    categoria: "DIASPORA",
    precoCVE: 5000,
    descricao: "5.000 CVE de saldo, 50 swipes e entrada em todos os eventos.",
    saldo: 5000,
    swipes: 50,
    eventos: true,
    parking: false
  },
  {
    id: "diaspora-premium",
    nome: "Diaspora Premium",
    categoria: "DIASPORA",
    precoCVE: 10000,
    descricao: "10.000 CVE de saldo, swipes ilimitados e QR prioritário.",
    saldo: 10000,
    swipes: 999999,
    eventos: true,
    parking: false
  },

  {
    id: "business-starter",
    nome: "Business Starter",
    categoria: "BUSINESS",
    precoCVE: 5000,
    descricao: "Registo do negócio e acesso à comunidade empresarial.",
    saldo: 0,
    swipes: 0,
    eventos: false,
    parking: false
  },
  {
    id: "business-growth",
    nome: "Business Growth",
    categoria: "BUSINESS",
    precoCVE: 10000,
    descricao: "Abertura de conta bancária e incubação incluídas.",
    saldo: 0,
    swipes: 0,
    eventos: false,
    parking: false
  },
  {
    id: "business-elite",
    nome: "Business Elite",
    categoria: "BUSINESS",
    precoCVE: 20000,
    descricao: "Acesso direto aos parceiros certos e mentoria dedicada.",
    saldo: 0,
    swipes: 0,
    eventos: false,
    parking: false
  },

  {
    id: "student-essencial",
    nome: "Student Essencial",
    categoria: "STUDENT",
    precoCVE: 0,
    descricao: "Acesso à Smart City Akademy.",
    saldo: 0,
    swipes: 0,
    eventos: false,
    parking: false
  },
  {
    id: "student-ativo",
    nome: "Student Ativo",
    categoria: "STUDENT",
    precoCVE: 1000,
    descricao: "Inclui estágio (internship) e workshops.",
    saldo: 0,
    swipes: 0,
    eventos: false,
    parking: false
  },
  {
    id: "student-pro",
    nome: "Student Pro",
    categoria: "STUDENT",
    precoCVE: 2000,
    descricao: "Acesso total ao startup program e mentoria de carreira.",
    saldo: 0,
    swipes: 0,
    eventos: false,
    parking: false
  }
];

function obterPorId(id) {
  return (
    PACOTES.find((pacote) => pacote.id === id) ||
    null
  );
}

function obterPorNome(nome) {
  return (
    PACOTES.find((pacote) => pacote.nome === nome) ||
    null
  );
}

module.exports = {
  PACOTES,
  obterPorId,
  obterPorNome
};
