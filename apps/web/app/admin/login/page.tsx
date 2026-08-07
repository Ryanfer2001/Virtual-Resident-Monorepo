"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { loginAdmin, obterSessaoAdmin } from "@/lib/admin-api";

import "./admin-login.css";

export default function AdminLoginPage() {
  const router = useRouter();

  const [aVerificarSessao, setAVerificarSessao] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    obterSessaoAdmin()
      .then((resposta) => {
        if (!cancelado && resposta.sucesso) {
          router.replace("/admin/dashboard");
          return;
        }

        if (!cancelado) {
          setAVerificarSessao(false);
        }
      })
      .catch(() => {
        if (!cancelado) {
          setAVerificarSessao(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [router]);

  async function submeterLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErro("");

    if (!username.trim() || !password) {
      setErro("Preenche o utilizador e a palavra-passe.");
      return;
    }

    try {
      setCarregando(true);

      const resposta = await loginAdmin(username.trim(), password);

      if (!resposta.sucesso) {
        throw new Error(
          resposta.mensagem || "Não foi possível iniciar sessão.",
        );
      }

      router.push("/admin/dashboard");
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

  if (aVerificarSessao) {
    return (
      <main className="admin-login-verificando">A verificar sessão...</main>
    );
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <span className="admin-login-eyebrow">Cabo Verde Virtual Resident</span>
        <h1>Área administrativa</h1>
        <p>Acesso restrito à equipa NOSZONA. Sessão de curta duração.</p>

        <form onSubmit={submeterLogin} className="admin-login-form" autoComplete="off">
          <label htmlFor="admin-username">
            Utilizador
            <input
              id="admin-username"
              name="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Utilizador administrativo"
            />
          </label>

          <label htmlFor="admin-password">
            Palavra-passe
            <input
              id="admin-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              placeholder="Palavra-passe"
            />
          </label>

          {erro && (
            <div className="admin-login-form-message" role="alert">
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="admin-login-submit"
            disabled={carregando}
          >
            {carregando ? "A entrar..." : "Entrar"}
          </button>
        </form>

        <p className="admin-login-rodape">
          Esta área não partilha sessão com a conta de residente.
        </p>
      </section>
    </main>
  );
}
