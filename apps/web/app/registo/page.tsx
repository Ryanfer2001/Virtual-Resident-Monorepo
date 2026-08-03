"use client";

import type {
  ChangeEvent,
  FormEvent,
} from "react";

import {
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { criarResidente } from "@/lib/api";

import type {
  RegistoData,
} from "@/types/residente";

const estadoInicial: RegistoData = {
  nome: "",
  dataNascimento: "",
  nacionalidade: "",
  documento: "",
  telefone: "",
  email: "",
  morada: "",
  municipio: "",
  username: "",
  password: "",
  pacote: "Pacote 2",
  pais: "Cabo Verde",
  codigoPostal: "7600",
};

export default function RegistoPage() {
  const router = useRouter();

  const [dados, setDados] =
    useState<RegistoData>(estadoInicial);

  const [
    confirmarPassword,
    setConfirmarPassword,
  ] = useState("");

  const [termosAceites, setTermosAceites] =
    useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] =
    useState(false);

  function alterarCampo(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = event.target;

    setDados((dadosAtuais) => ({
      ...dadosAtuais,
      [name]: value,
    }));
  }

  function validarFormulario(): string | null {
    const camposObrigatorios: Array<
      keyof RegistoData
    > = [
      "nome",
      "dataNascimento",
      "nacionalidade",
      "documento",
      "telefone",
      "email",
      "morada",
      "municipio",
      "username",
      "password",
      "pacote",
    ];

    for (const campo of camposObrigatorios) {
      if (!String(dados[campo] || "").trim()) {
        return "Preenche todos os campos obrigatórios.";
      }
    }

    if (dados.nome.trim().length < 3) {
      return "Introduz o nome completo.";
    }

    if (dados.username.trim().length < 3) {
      return "O username deve ter pelo menos 3 caracteres.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      dados.email,
    )) {
      return "Introduz um endereço de email válido.";
    }

    if (dados.password.length < 6) {
      return "A palavra-passe deve ter pelo menos 6 caracteres.";
    }

    if (
      !/[A-Za-z]/.test(dados.password) ||
      !/[0-9]/.test(dados.password)
    ) {
      return "A palavra-passe deve conter letras e números.";
    }

    if (dados.password !== confirmarPassword) {
      return "As palavras-passe não são iguais.";
    }

    if (!termosAceites) {
      return "É obrigatório aceitar os Termos e Condições.";
    }

    return null;
  }

  async function submeterRegisto(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErro("");
    setSucesso("");

    const erroValidacao = validarFormulario();

    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    try {
      setCarregando(true);

      const resposta = await criarResidente({
        ...dados,
        nome: dados.nome.trim(),
        nacionalidade:
          dados.nacionalidade.trim(),
        documento: dados.documento.trim(),
        telefone: dados.telefone.trim(),
        email: dados.email
          .trim()
          .toLowerCase(),
        morada: dados.morada.trim(),
        municipio: dados.municipio.trim(),
        username: dados.username.trim(),
      });

      if (!resposta.sucesso) {
        throw new Error(
          resposta.mensagem ||
            "Não foi possível criar a conta.",
        );
      }

      setSucesso(
        resposta.mensagem ||
          "Conta criada com sucesso. Agora podes iniciar sessão.",
      );

      setTimeout(() => {
        router.push("/login");
      }, 1600);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro durante o registo.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <Header />

      <main className="registo-page">
        <section className="registo-card">
          <div className="registo-heading">
            <span className="eyebrow">
              Novo residente
            </span>

            <h1>Registo de Residente</h1>

            <p>
              Preenche os teus dados para criar a
              conta NOSZONA Smart.
            </p>
          </div>

          <form
            className="registo-form"
            onSubmit={submeterRegisto}>

            <div className="registo-grid">
              <label className="campo-completo">
                Nome completo *
                <input
                  name="nome"
                  type="text"
                  value={dados.nome}
                  onChange={alterarCampo}
                  autoComplete="name"
                  placeholder="Nome e apelido"
                />
              </label>

              <label>
                Data de nascimento *
                <input
                  name="dataNascimento"
                  type="date"
                  value={dados.dataNascimento}
                  onChange={alterarCampo}
                />
              </label>

              <label>
                Nacionalidade *
                <input
                  name="nacionalidade"
                  type="text"
                  value={dados.nacionalidade}
                  onChange={alterarCampo}
                  placeholder="Ex.: Cabo-verdiana"
                />
              </label>

              <label>
                Nº BI, CNI ou passaporte *
                <input
                  name="documento"
                  type="text"
                  value={dados.documento}
                  onChange={alterarCampo}
                  placeholder="Número do documento"
                />
              </label>

              <label>
                Telefone *
                <input
                  name="telefone"
                  type="tel"
                  value={dados.telefone}
                  onChange={alterarCampo}
                  autoComplete="tel"
                  placeholder="+238"
                />
              </label>

              <label className="campo-completo">
                Email *
                <input
                  name="email"
                  type="email"
                  value={dados.email}
                  onChange={alterarCampo}
                  autoComplete="email"
                  placeholder="nome@email.com"
                />
              </label>

              <label className="campo-completo">
                Morada *
                <input
                  name="morada"
                  type="text"
                  value={dados.morada}
                  onChange={alterarCampo}
                  autoComplete="street-address"
                  placeholder="Rua, zona ou bairro"
                />
              </label>

              <label>
                Município *
                <input
                  name="municipio"
                  type="text"
                  value={dados.municipio}
                  onChange={alterarCampo}
                  placeholder="Ex.: Praia"
                />
              </label>

              <label>
                País *
                <select
                  name="pais"
                  value={dados.pais}
                  onChange={alterarCampo}
                >
                  <option value="Cabo Verde">
                    Cabo Verde
                  </option>

                  <option value="Portugal">
                    Portugal
                  </option>

                  <option value="Outro">
                    Outro
                  </option>
                </select>
              </label>

              <label>
                Username *
                <input
                  name="username"
                  type="text"
                  value={dados.username}
                  onChange={alterarCampo}
                  autoComplete="username"
                  placeholder="Escolhe um username"
                />
              </label>

              <label>
                Pacote *
                <select
                  name="pacote"
                  value={dados.pacote}
                  onChange={alterarCampo}
                >
                  <option value="Pacote 1">
                    Pacote 1 — Entrada
                  </option>

                  <option value="Pacote 2">
                    Pacote 2 — Completo
                  </option>

                  <option value="Pacote 3">
                    Pacote 3 — Premium
                  </option>
                </select>
              </label>

              <label>
                Palavra-passe *
                <input
                  name="password"
                  type="password"
                  value={dados.password}
                  onChange={alterarCampo}
                  autoComplete="new-password"
                  placeholder="Letras e números"
                />
              </label>

              <label>
                Confirmar palavra-passe *
                <input
                  type="password"
                  value={confirmarPassword}
                  onChange={(event) =>
                    setConfirmarPassword(
                      event.target.value,
                    )
                  }
                  autoComplete="new-password"
                  placeholder="Repete a palavra-passe"
                />
              </label>
            </div>

            <label className="termos-registo">
              <input
                type="checkbox"
                checked={termosAceites}
                onChange={(event) =>
                  setTermosAceites(
                    event.target.checked,
                  )
                }
              />

              <span>
                Li e aceito os Termos e Condições e
                a Política de Privacidade.
              </span>
            </label>

            <div className="pagamento-seguro-box">
              <strong>
                Pagamento seguro via Vinti4
              </strong>

              <p>
                Depois do registo, o pagamento será
                realizado no portal seguro da Vinti4.
                Os dados do cartão não passam pelos
                servidores da NOSZONA.
              </p>
            </div>

            <div
              className="mensagens-registo"
              aria-live="polite"
            >
              {erro && (
                <div
                  className="form-message form-error"
                  role="alert"
                >
                  {erro}
                </div>
              )}

              {sucesso && (
                <div className="form-message form-success">
                  {sucesso}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="registo-submit"
              disabled={carregando || Boolean(sucesso)}
            >
              {carregando
                ? "A criar conta..."
                : "Criar conta →"}
            </button>
          </form>

          <p className="registo-login-link">
            Já tens uma conta?{" "}
            <Link href="/login">
              Entrar
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}