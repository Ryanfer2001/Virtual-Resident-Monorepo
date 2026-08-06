const PAISES_FALLBACK = [
  "Cabo Verde",
  "Portugal",
  "Brasil",
  "Angola",
  "Moçambique",
  "Guiné-Bissau",
  "São Tomé e Príncipe",
  "Espanha",
  "França",
  "Estados Unidos",
  "Outro",
];

interface PaisApi {
  name: {
    common: string;
  };
  translations?: {
    por?: {
      common?: string;
    };
  };
}

export async function obterListaPaises(): Promise<
  string[]
> {
  const resposta = await fetch(
    "https://restcountries.com/v3.1/all?fields=name,translations",
    {
      cache: "force-cache",
    },
  );

  if (!resposta.ok) {
    throw new Error(
      "Não foi possível carregar a lista de países.",
    );
  }

  const dados =
    (await resposta.json()) as PaisApi[];

  const nomes = dados.map(
    (pais) =>
      pais.translations?.por?.common ||
      pais.name.common,
  );

  const nomesUnicos = Array.from(
    new Set(nomes),
  ).sort((a, b) => a.localeCompare(b, "pt"));

  return nomesUnicos;
}

export function obterListaPaisesFallback(): string[] {
  return PAISES_FALLBACK;
}
