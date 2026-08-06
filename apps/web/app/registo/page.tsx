"use client";

import type {
  ChangeEvent,
  FormEvent,
} from "react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import {
  criarResidente,
  enviarFotosResidente,
} from "@/lib/api";

import {
  obterListaPaises,
  obterListaPaisesFallback,
} from "@/lib/paises";

import type {
  RegistoData,
} from "@/types/residente";

import "./registo.css";

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

type TipoFoto = "perfil" | "bi";

function capturarFrameCamera(
  video: HTMLVideoElement,
): string {
  const maxLargura = 1000;

  let largura = video.videoWidth;
  let altura = video.videoHeight;

  if (largura > maxLargura) {
    altura = Math.round(
      (altura * maxLargura) / largura,
    );
    largura = maxLargura;
  }

  const canvas =
    document.createElement("canvas");

  canvas.width = largura;
  canvas.height = altura;

  const contexto = canvas.getContext("2d");

  if (!contexto) {
    return "";
  }

  contexto.drawImage(video, 0, 0, largura, altura);

  return canvas.toDataURL("image/jpeg", 0.75);
}

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

  const [paises, setPaises] = useState<string[]>(
    obterListaPaisesFallback(),
  );

  const [fotoPerfil, setFotoPerfil] =
    useState("");

  const [fotoBI, setFotoBI] = useState("");

  const [cameraAberta, setCameraAberta] =
    useState(false);

  const [tipoFotoAtual, setTipoFotoAtual] =
    useState<TipoFoto>("perfil");

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  useEffect(() => {
    obterListaPaises()
      .then((lista) => {
        setPaises(
          lista.includes("Cabo Verde")
            ? lista
            : ["Cabo Verde", ...lista],
        );
      })
      .catch(() => {
        setPaises(obterListaPaisesFallback());
      });
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current
        ?.getTracks()
        .forEach((faixa) => faixa.stop());
    };
  }, []);

  async function abrirCamera(tipo: TipoFoto) {
    try {
      setErro("");

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode:
              tipo === "bi"
                ? "environment"
                : "user",
          },
          audio: false,
        });

      streamRef.current = stream;
      setTipoFotoAtual(tipo);
      setCameraAberta(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });
    } catch {
      setErro(
        "Não foi possível abrir a câmara. Verifica se deste permissão ao navegador.",
      );
    }
  }

  function fecharCamera() {
    streamRef.current
      ?.getTracks()
      .forEach((faixa) => faixa.stop());

    streamRef.current = null;
    setCameraAberta(false);
  }

  function capturarFoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      setErro(
        "A câmara ainda não está pronta. Aguarda um instante e tenta novamente.",
      );
      return;
    }

    const fotoBase64 = capturarFrameCamera(video);

    if (tipoFotoAtual === "perfil") {
      setFotoPerfil(fotoBase64);
    } else {
      setFotoBI(fotoBase64);
    }

    fecharCamera();
  }

  function removerFotoPerfil() {
    setFotoPerfil("");
  }

  function removerFotoBI() {
    setFotoBI("");
  }

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

    if (!fotoBI) {
      return "A foto do Bilhete de Identidade é obrigatória.";
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

      if (resposta.residenteId) {
        try {
          await enviarFotosResidente({
            residenteId: resposta.residenteId,
            fotoPerfilBase64: fotoPerfil,
            fotoBIBase64: fotoBI,
          });
        } catch (erroFotos) {
          console.warn(
            "Conta criada, mas as fotos não foram enviadas:",
            erroFotos,
          );
        }
      }

      setSucesso(
        "Conta criada com sucesso. As fotos ficam pendentes de confirmação — o cartão e os métodos de pagamento são liberados depois da verificação. Já podes iniciar sessão.",
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
                  {paises.map((pais) => (
                    <option
                      key={pais}
                      value={pais}
                    >
                      {pais}
                    </option>
                  ))}
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

            <div className="fotos-registo-box">
              <h3>Fotos do residente</h3>

              <p>
                Tira a foto diretamente pela câmara.
                A foto de perfil é opcional. A foto
                do BI é obrigatória e será
                confirmada pelo administrador.
              </p>

              <div className="fotos-registo-grid">
                <div className="foto-registo-card">
                  <span className="foto-registo-label">
                    Foto de perfil (opcional)
                  </span>

                  <div className="foto-preview-registo foto-preview-perfil">
                    {fotoPerfil ? (
                      <img
                        src={fotoPerfil}
                        alt="Foto de perfil"
                      />
                    ) : (
                      <span>
                        Sem foto de perfil
                      </span>
                    )}
                  </div>

                  <div className="foto-registo-actions">
                    <button
                      type="button"
                      onClick={() =>
                        abrirCamera("perfil")
                      }
                    >
                      Tirar foto
                    </button>

                    <button
                      type="button"
                      className="btn-remover-foto"
                      onClick={removerFotoPerfil}
                      disabled={!fotoPerfil}
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="foto-registo-card">
                  <span className="foto-registo-label">
                    Foto do Bilhete de Identidade *
                  </span>

                  <div className="foto-preview-registo">
                    {fotoBI ? (
                      <img
                        src={fotoBI}
                        alt="Foto do BI"
                      />
                    ) : (
                      <span>Sem foto do BI</span>
                    )}
                  </div>

                  <div className="foto-registo-actions">
                    <button
                      type="button"
                      onClick={() =>
                        abrirCamera("bi")
                      }
                    >
                      Tirar foto
                    </button>

                    <button
                      type="button"
                      className="btn-remover-foto"
                      onClick={removerFotoBI}
                      disabled={!fotoBI}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
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

        {cameraAberta && (
          <div className="modal-camera-fotos">
            <div className="modal-camera-conteudo">
              <h3>
                {tipoFotoAtual === "bi"
                  ? "Foto do Bilhete de Identidade"
                  : "Foto de perfil"}
              </h3>

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
              />

              <div className="modal-camera-acoes">
                <button
                  type="button"
                  onClick={capturarFoto}
                >
                  Capturar foto
                </button>

                <button
                  type="button"
                  onClick={fecharCamera}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}