"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { fazerLogin } from "@/lib/api";
import { guardarSessao } from "@/lib/auth";
import { criarDataUrlImagem } from "@/lib/imagens";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function submeterLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");

    if (!username.trim() || !password) {
      setErro("Preenche o utilizador e a palavra-passe.");
      return;
    }

    try {
      setCarregando(true);

      const resposta = await fazerLogin(username, password);

      if (!resposta.sucesso || !resposta.token || !resposta.residente) {
        throw new Error(
          resposta.mensagem || "Não foi possível iniciar sessão.",
        );
      }

      const residentePreparado = {
  ...resposta.residente,

  fotoPerfilBase64: criarDataUrlImagem(
    resposta.residente.fotoPerfilBase64,
    resposta.residente.fotoPerfilTipo,
  ),

  fotoCartaoBase64: criarDataUrlImagem(
    resposta.residente.fotoCartaoBase64,
    resposta.residente.fotoCartaoTipo,
  ),
};

guardarSessao(
  resposta.token,
  residentePreparado,
);

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Ocorreu um erro ao iniciar sessão.",
      );
    } finally {
      setCarregando(false);
    }
  }


  return (
    <>
      <Header />

      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow">Área do residente</span>
            <h1>Entrar na conta</h1>
            <p>
              Acede à tua carteira, QR, pacote e serviços NOSZONA.
            </p>
          </div>

          <form onSubmit={submeterLogin} className="auth-form">
            <label htmlFor="username">
              Utilizador
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="Introduz o teu utilizador"
              />
            </label>

            <label htmlFor="password">
              Palavra-passe
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Introduz a tua palavra-passe"
              />
            </label>

            {erro && (
              <div className="form-message form-error" role="alert">
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-login-centralizado"
              disabled={carregando}
             >
             {carregando ? "A entrar..." : "Entrar"}
            </button>
          </form>

          <div className="auth-links">
            <Link href="/recuperar-password">
              Esqueceste a palavra-passe?
            </Link>

            <span>
              Ainda não tens conta?{" "}
              <Link href="/registo">Criar conta</Link>
            </span>
          </div>
        </section>
      </main>
    </>
  );
}