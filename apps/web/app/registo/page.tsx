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

import { PAISES } from "@/lib/paises";
import { PACOTES } from "@/lib/pacotes";

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
  pacote: "",
  pais: "Cabo Verde",
  codigoPostal: "7600",
};

type TipoFoto = "rosto" | "bi";

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

  const [termosModalAberto, setTermosModalAberto] =
    useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] =
    useState(false);

  const [fotoRosto, setFotoRosto] =
    useState("");

  const [fotoBI, setFotoBI] = useState("");

  const [cameraAberta, setCameraAberta] =
    useState(false);

  const [tipoFotoAtual, setTipoFotoAtual] =
    useState<TipoFoto>("rosto");

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const pacoteSelectRef =
    useRef<HTMLSelectElement | null>(null);

   useEffect(() => {
    return () => {
      streamRef.current
        ?.getTracks()
        .forEach((faixa) => faixa.stop());
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search,
    );

    const pacoteParam = params.get("pacote");

    if (!pacoteParam) {
      return;
    }

    const nomesValidos = PACOTES.flatMap(
      (categoria) =>
        categoria.planos.map(
          (plano) => plano.nome,
        ),
    );

    if (!nomesValidos.includes(pacoteParam)) {
      return;
    }

    setDados((dadosAtuais) => ({
      ...dadosAtuais,
      pacote: pacoteParam,
    }));

    requestAnimationFrame(() => {
      pacoteSelectRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      pacoteSelectRef.current?.focus();
    });
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

    if (tipoFotoAtual === "rosto") {
      setFotoRosto(fotoBase64);
    } else {
      setFotoBI(fotoBase64);
    }

    fecharCamera();
  }

  function abrirTermosModal(
    event?: { preventDefault: () => void },
  ) {
    event?.preventDefault();
    setTermosModalAberto(true);
  }

  function fecharTermosModal() {
    setTermosModalAberto(false);
  }

  function aceitarTermosModal() {
    setTermosAceites(true);
    setTermosModalAberto(false);
  }

  function removerFotoRosto() {
    setFotoRosto("");
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

    /*
     * A foto do BI não é obrigatória por enquanto: ainda não há
     * reconhecimento facial ligado para validar rosto vs. documento.
     * Enquanto isso, o registo fica sempre pendente de revisão manual
     * (ver submeterRegisto / estado "pendente"). Quando a comparação
     * facial automática existir, volta a exigir a foto aqui.
     */
    // if (!fotoBI) {
    //   return "A foto do Bilhete de Identidade é obrigatória.";
    // }

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

      if (
        resposta.residenteId &&
        (fotoRosto || fotoBI)
      ) {
        try {
          await enviarFotosResidente({
            residenteId: resposta.residenteId,
            fotoPerfilBase64: fotoRosto,
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
                  {PAISES.map((pais) => (
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
                  ref={pacoteSelectRef}
                  name="pacote"
                  className="btn-pacote"
                  value={dados.pacote}
                  onChange={alterarCampo}
                >
                  <option value="" disabled>
                    -- Selecione o seu pacote --
                  </option>

                  {PACOTES.map((categoria) => (
                    <optgroup
                      key={categoria.id}
                      label={categoria.titulo}
                    >
                      {categoria.planos.map(
                        (plano) => (
                          <option
                            key={plano.nome}
                            value={plano.nome}
                          >
                            {plano.nome} —{" "}
                            {plano.preco}
                          </option>
                          
                        ),
                      )}
                      
                    </optgroup>
                  ))}
                  
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
                Tira as fotos diretamente pela
                câmara. Por enquanto nenhuma das
                duas é obrigatória — ambas ficam
                pendentes de confirmação manual (o
                cartão e os métodos de pagamento só
                são liberados depois da verificação).
                Quando o reconhecimento facial
                automático estiver ligado, a foto do
                rosto passa a ser comparada com a
                foto do documento.
              </p>

              <div className="fotos-registo-grid">
                <div className="foto-registo-card">
                  <span className="foto-registo-label">
                    Foto do rosto (reconhecimento
                    facial)
                  </span>

                  <div className="foto-preview-registo foto-preview-perfil">
                    {fotoRosto ? (
                      <img
                        src={fotoRosto}
                        alt="Foto do rosto"
                      />
                    ) : (
                      <span>
                        Sem foto do rosto
                      </span>
                    )}
                  </div>

                  <div className="foto-registo-actions">
                    <button
                      type="button"
                      onClick={() =>
                        abrirCamera("rosto")
                      }
                    >
                      Tirar foto
                    </button>

                    <button
                      type="button"
                      className="btn-remover-foto"
                      onClick={removerFotoRosto}
                      disabled={!fotoRosto}
                    >
                      Remover
                    </button>
                  </div>
                </div>

                <div className="foto-registo-card">
                  <span className="foto-registo-label">
                    Foto do Bilhete de Identidade
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
                Li e aceito os{" "}
                <button
                  type="button"
                  className="link-termos"
                  onClick={abrirTermosModal}
                >
                  Termos e Condições e a Política de
                  Privacidade
                </button>
                .
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
                  : "Foto do rosto"}
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

        {termosModalAberto && (
          <div
            className="modal-termos"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-termos"
          >
            <div className="modal-termos-conteudo">
              <h3 id="titulo-termos">
                Termos e Condições e Política de
                Privacidade
              </h3>

              <p className="modal-termos-atualizado">
                Última atualização: 10 de agosto de
                2026
              </p>

              <div className="modal-termos-corpo">
                <h4>1. Objeto e Aceitação</h4>
                <p>
                  Os presentes Termos e Condições
                  regulam o registo, a criação de
                  conta e a utilização dos serviços
                  disponibilizados pela NOSZONA
                  Smart (&quot;NOSZONA&quot;, &quot;nós&quot;),
                  incluindo o cartão NOSZONA Smart,
                  a aplicação, o acesso a eventos, à
                  Smart City Akademy e demais
                  serviços associados aos pacotes
                  Visitor, Diaspora, Business e
                  Student.
                </p>
                <p>
                  Ao preencher o formulário de
                  registo e submeter os seus dados,
                  o Utilizador declara ter lido,
                  compreendido e aceite, de forma
                  livre, específica e informada, a
                  totalidade destes Termos e
                  Condições e da Política de
                  Privacidade aqui incluída. Caso
                  não concorde com qualquer
                  disposição, não deverá prosseguir
                  com o registo.
                </p>

                <h4>2. Definições</h4>
                <p>
                  &quot;Utilizador&quot; ou &quot;Residente&quot;:
                  pessoa singular que submete o
                  formulário de registo. &quot;Cartão
                  NOSZONA Smart&quot;: suporte físico ou
                  digital associado à conta do
                  Utilizador, utilizado para
                  identificação, acesso e
                  movimentação de saldo. &quot;Pacote&quot;:
                  plano contratado (Visitor,
                  Diaspora, Business ou Student), com
                  preço e benefícios próprios.
                  &quot;Plataforma&quot;: sítio web, aplicação
                  e demais sistemas informáticos
                  operados pela NOSZONA.
                </p>

                <h4>
                  3. Registo e Conta de Utilizador
                </h4>
                <p>
                  O registo está reservado a maiores
                  de 16 anos ou a menores devidamente
                  representados/autorizados pelo
                  encarregado de educação ou
                  representante legal. O Utilizador
                  compromete-se a fornecer dados
                  verdadeiros, exatos, atuais e
                  completos (nome, data de
                  nascimento, nacionalidade,
                  documento de identificação,
                  contactos, morada) e a mantê-los
                  atualizados.
                </p>
                <p>
                  Cada pessoa apenas pode criar e
                  manter uma conta. É proibida a
                  criação de contas duplicadas, o uso
                  de identidade de terceiros ou a
                  submissão de documentos falsos ou
                  adulterados. O username e a
                  palavra-passe são pessoais e
                  intransmissíveis; o Utilizador é o
                  único responsável pela
                  confidencialidade das suas
                  credenciais e por toda a atividade
                  realizada através da sua conta,
                  devendo comunicar de imediato à
                  NOSZONA qualquer uso não
                  autorizado.
                </p>
                <p>
                  O registo fica sujeito a
                  verificação e aprovação manual por
                  parte da equipa NOSZONA. Enquanto a
                  verificação não for concluída,
                  determinadas funcionalidades —
                  nomeadamente a emissão física do
                  cartão e os métodos de pagamento
                  associados — permanecem
                  indisponíveis. A NOSZONA
                  reserva-se o direito de recusar,
                  suspender ou cancelar um registo
                  sempre que existam fundadas
                  suspeitas de fraude, dados falsos
                  ou incumprimento destes Termos.
                </p>

                <h4>
                  4. Pacotes, Preços e Pagamentos
                </h4>
                <p>
                  Cada Pacote tem preço, saldo
                  inicial, número de swipes/acessos e
                  benefícios próprios, conforme
                  descrito na página de registo,
                  podendo estes valores ser
                  atualizados a qualquer momento, sem
                  efeitos retroativos sobre pacotes
                  já pagos.
                </p>
                <p>
                  O pagamento é processado através do
                  portal seguro Vinti4 (SISP). Os
                  dados do cartão bancário são
                  introduzidos diretamente no portal
                  Vinti4 e não são recolhidos,
                  armazenados ou tratados pelos
                  servidores da NOSZONA.
                </p>
                <p>
                  Salvo disposição legal em contrário
                  ou erro comprovado imputável à
                  NOSZONA, os pagamentos de pacotes e
                  carregamentos de saldo não são
                  reembolsáveis, dada a natureza
                  imediata da disponibilização dos
                  benefícios associados. O saldo
                  carregado no cartão NOSZONA Smart
                  não vence juros e destina-se
                  exclusivamente à aquisição de bens
                  e serviços dentro do ecossistema
                  NOSZONA (cantina, eventos, parceiros
                  aderentes), não podendo ser
                  convertido em dinheiro, salvo
                  disposição legal imperativa.
                </p>

                <h4>
                  5. Cartão NOSZONA Smart e
                  Utilização
                </h4>
                <p>
                  O cartão é pessoal e
                  intransmissível, servindo como meio
                  de identificação, controlo de
                  acesso e movimentação de saldo
                  dentro da comunidade NOSZONA. O
                  Utilizador deve comunicar de
                  imediato o extravio, furto ou roubo
                  do cartão, para que a NOSZONA
                  proceda ao respetivo bloqueio; a
                  NOSZONA não se responsabiliza por
                  movimentos realizados com o cartão
                  antes da comunicação do incidente.
                  A emissão, reemissão ou substituição
                  do cartão físico pode estar sujeita
                  a um custo administrativo,
                  comunicado previamente ao
                  Utilizador.
                </p>

                <h4>
                  6. Fotografias, Verificação de
                  Identidade e Reconhecimento Facial
                </h4>
                <p>
                  O Utilizador pode carregar, através
                  da câmara do dispositivo, uma
                  fotografia do rosto e uma fotografia
                  do documento de identificação, com a
                  finalidade de confirmar a sua
                  identidade e associar o cartão
                  NOSZONA Smart à pessoa titular da
                  conta. Ao submeter estas fotografias,
                  o Utilizador presta o seu
                  consentimento expresso para o
                  respetivo tratamento, incluindo,
                  quando aplicável, a comparação
                  biométrica entre a fotografia do
                  rosto e a fotografia do documento,
                  para efeitos de prevenção de fraude
                  e verificação de identidade.
                </p>
                <p>
                  O consentimento é livremente
                  revogável a qualquer momento,
                  mediante pedido à NOSZONA, sem
                  prejuízo da licitude do tratamento
                  efetuado antes da revogação; a
                  revogação pode implicar a
                  impossibilidade de emissão ou
                  manutenção do cartão físico e de
                  determinados métodos de pagamento.
                  Enquanto o reconhecimento facial
                  automático não estiver disponível, a
                  verificação é efetuada manualmente
                  por colaboradores autorizados da
                  NOSZONA.
                </p>

                <h4>
                  7. Proteção de Dados Pessoais —
                  Política de Privacidade
                </h4>
                <p>
                  A NOSZONA atua como responsável pelo
                  tratamento dos dados pessoais
                  fornecidos pelo Utilizador, em
                  conformidade com a Lei n.º 133/V/2001
                  (Lei da Proteção de Dados Pessoais de
                  Cabo Verde) e demais legislação
                  aplicável.
                </p>
                <p>
                  Dados recolhidos: identificação
                  (nome, data de nascimento,
                  nacionalidade, número de documento),
                  contacto (telefone, email, morada,
                  município, país), credenciais de
                  acesso, pacote contratado,
                  fotografias submetidas e dados de
                  utilização do cartão e da Plataforma.
                </p>
                <p>
                  Finalidades do tratamento: criação e
                  gestão da conta e do cartão NOSZONA
                  Smart; verificação de identidade e
                  prevenção de fraude; processamento de
                  pagamentos e emissão de saldo;
                  comunicação com o Utilizador sobre a
                  conta, eventos e serviços;
                  cumprimento de obrigações legais;
                  melhoria e segurança da Plataforma.
                </p>
                <p>
                  Partilha de dados: os dados podem ser
                  partilhados com (i) o processador de
                  pagamentos Vinti4/SISP, exclusivamente
                  para a finalidade de cobrança; (ii)
                  parceiros e entidades organizadoras de
                  eventos, na estrita medida necessária
                  ao controlo de acesso; (iii)
                  autoridades públicas, quando exigido
                  por lei. A NOSZONA não vende dados
                  pessoais a terceiros.
                </p>
                <p>
                  Conservação: os dados são conservados
                  pelo período necessário à prestação
                  dos serviços e ao cumprimento de
                  obrigações legais e fiscais, sendo
                  eliminados ou anonimizados findos
                  esses prazos. Segurança: a NOSZONA
                  adota medidas técnicas e
                  organizativas adequadas para proteger
                  os dados contra acesso não autorizado,
                  perda, alteração ou divulgação
                  indevida, incluindo a cifragem de
                  palavras-passe.
                </p>

                <h4>
                  8. Direitos do Titular dos Dados
                </h4>
                <p>
                  O Utilizador pode, a qualquer momento
                  e mediante pedido dirigido aos
                  contactos indicados no ponto 15:
                  aceder aos seus dados; solicitar a
                  respetiva retificação, atualização ou
                  eliminação; opor-se ou limitar
                  determinados tratamentos; solicitar a
                  portabilidade dos dados; e apresentar
                  reclamação junto da Comissão Nacional
                  de Proteção de Dados (CNPD) de Cabo
                  Verde.
                </p>

                <h4>
                  9. Obrigações e Conduta do
                  Utilizador
                </h4>
                <p>
                  O Utilizador compromete-se a: não
                  utilizar a Plataforma ou o cartão
                  para fins ilícitos, fraudulentos ou
                  lesivos de terceiros; não tentar
                  aceder a contas de outros
                  utilizadores nem contornar mecanismos
                  de segurança; não introduzir vírus,
                  malware ou realizar ataques
                  informáticos; e respeitar os demais
                  membros da comunidade NOSZONA em
                  eventos e espaços físicos ou digitais
                  associados.
                </p>

                <h4>10. Propriedade Intelectual</h4>
                <p>
                  Todos os conteúdos, marcas,
                  logótipos, software e materiais
                  disponibilizados na Plataforma são
                  propriedade da NOSZONA ou dos
                  respetivos licenciadores, sendo
                  proibida a sua reprodução,
                  distribuição ou utilização sem
                  autorização prévia e escrita.
                </p>

                <h4>
                  11. Eventos, Parceiros e Serviços de
                  Terceiros
                </h4>
                <p>
                  Determinados benefícios (eventos,
                  incubação, mentoria, estágios,
                  parceiros comerciais) são prestados
                  ou disponibilizados por terceiros. A
                  NOSZONA atua, nesses casos, como
                  facilitadora do acesso, não sendo
                  responsável por atos, omissões ou
                  incumprimentos desses terceiros, sem
                  prejuízo de diligenciar pela boa
                  resolução de eventuais reclamações.
                </p>

                <h4>
                  12. Limitação de Responsabilidade
                </h4>
                <p>
                  Na máxima medida permitida por lei, a
                  NOSZONA não se responsabiliza por
                  danos indiretos, lucros cessantes ou
                  perda de dados resultantes de
                  indisponibilidade temporária da
                  Plataforma, falhas de conectividade,
                  caso fortuito ou de força maior, ou
                  uso indevido das credenciais por
                  parte do Utilizador.
                </p>

                <h4>
                  13. Suspensão e Cancelamento da
                  Conta
                </h4>
                <p>
                  O Utilizador pode solicitar, a
                  qualquer momento, o cancelamento da
                  sua conta. A NOSZONA pode suspender
                  ou cancelar a conta, mediante aviso
                  sempre que possível, em caso de:
                  dados falsos, tentativa de fraude,
                  incumprimento destes Termos, uso
                  indevido do cartão ou por
                  determinação legal ou de autoridade
                  competente.
                </p>

                <h4>14. Alterações aos Termos</h4>
                <p>
                  A NOSZONA pode atualizar estes Termos
                  e Condições a qualquer momento, para
                  refletir alterações legais,
                  operacionais ou de serviço. As
                  alterações relevantes serão
                  comunicadas através da Plataforma, e
                  a utilização continuada dos serviços
                  após a entrada em vigor das
                  alterações implica a sua aceitação.
                </p>

                <h4>
                  15. Lei Aplicável, Foro e Contactos
                </h4>
                <p>
                  Estes Termos regem-se pela lei de
                  Cabo Verde. Para a resolução de
                  qualquer litígio emergente destes
                  Termos, é competente o foro da
                  comarca da Praia, com renúncia
                  expressa a qualquer outro. Para
                  exercer os seus direitos ou
                  esclarecer dúvidas, o Utilizador pode
                  contactar a NOSZONA através dos
                  canais disponibilizados na
                  Plataforma.
                </p>
              </div>

              <div className="modal-termos-acoes">
                <button
                  type="button"
                  onClick={aceitarTermosModal}
                >
                  Li e aceito
                </button>

                <button
                  type="button"
                  onClick={fecharTermosModal}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}