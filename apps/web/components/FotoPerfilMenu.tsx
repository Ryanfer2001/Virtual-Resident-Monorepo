"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Residente } from "@/types/residente";
import { enviarFotosResidente } from "@/lib/api";
import { comprimirImagemArquivo, capturarFrameCamera } from "@/lib/imagens";

interface FotoPerfilMenuProps {
  residente: Residente;
  onFotoAtualizada: (residenteAtualizado: Residente) => void;
}

/*
 * Botão da foto de perfil no header, com um pequeno menu (ver / mudar /
 * tirar foto). Reaproveita o mesmo endpoint e o mesmo padrão já usado
 * para a foto do cartão no dashboard (comprimirImagemArquivo +
 * enviarFotosResidente) — só muda o campo enviado (fotoPerfilBase64).
 */
export default function FotoPerfilMenu({
  residente,
  onFotoAtualizada,
}: FotoPerfilMenuProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [visualizarAberto, setVisualizarAberto] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const inputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((faixa) => faixa.stop());
    };
  }, []);

  const fotoPerfil =
    residente.fotoPerfilBase64 ||
    residente.fotoPerfil ||
    "/img/usercard.jpg";

  async function guardarNovaFoto(fotoPerfilBase64: string) {
    setErro("");
    setEnviando(true);

    try {
      const resposta = await enviarFotosResidente({
        residenteId: residente.id,
        fotoPerfilBase64,
      });

      if (!resposta.sucesso) {
        throw new Error(
          resposta.mensagem || "Não foi possível atualizar a foto de perfil.",
        );
      }

      onFotoAtualizada({ ...residente, fotoPerfilBase64 });
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a foto de perfil.",
      );
    } finally {
      setEnviando(false);
    }
  }

  function abrirSeletorFicheiro() {
    setMenuAberto(false);
    inputRef.current?.click();
  }

  async function aoSelecionarFicheiro(event: ChangeEvent<HTMLInputElement>) {
    const ficheiro = event.target.files?.[0];
    event.target.value = "";

    if (!ficheiro) {
      return;
    }

    const fotoPerfilBase64 = await comprimirImagemArquivo(ficheiro);
    await guardarNovaFoto(fotoPerfilBase64);
  }

  async function abrirCamera() {
    setMenuAberto(false);
    setErro("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;
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
    streamRef.current?.getTracks().forEach((faixa) => faixa.stop());
    streamRef.current = null;
    setCameraAberta(false);
  }

  async function capturarFoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      setErro(
        "A câmara ainda não está pronta. Aguarda um instante e tenta novamente.",
      );
      return;
    }

    const fotoPerfilBase64 = capturarFrameCamera(video);
    fecharCamera();
    await guardarNovaFoto(fotoPerfilBase64);
  }

  return (
    <div className="foto-perfil-wrapper">
      <img
        src={fotoPerfil}
        alt={`Foto de ${residente.nome}`}
        className="header-foto-perfil"
      />

      <button
        type="button"
        className="foto-perfil-badge"
        aria-label="Opções da foto de perfil"
        onClick={(event) => {
          event.stopPropagation();
          setMenuAberto((aberto) => !aberto);
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 2a1 1 0 0 0-.894.553L7.382 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3.382l-.724-1.447A1 1 0 0 0 15 2H9zm3 6a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={aoSelecionarFicheiro}
      />

      {menuAberto && (
        <>
          <div
            className="foto-perfil-backdrop"
            onClick={() => setMenuAberto(false)}
          />

          <div className="foto-perfil-dropdown">
            <button
              type="button"
              onClick={() => {
                setMenuAberto(false);
                setVisualizarAberto(true);
              }}
            >
              Ver foto de perfil
            </button>

            <button type="button" onClick={abrirSeletorFicheiro}>
              Mudar foto de perfil
            </button>

            <button type="button" onClick={abrirCamera}>
              Tirar nova foto
            </button>
          </div>
        </>
      )}

      {erro && !cameraAberta && (
        <div className="foto-perfil-erro">{erro}</div>
      )}

      {enviando && <div className="foto-perfil-erro">A atualizar foto…</div>}

      {visualizarAberto &&
        createPortal(
          <div
            className="popup-overlay"
            onClick={() => setVisualizarAberto(false)}
          >
            <div
              className="popup-box popup-box-foto"
              onClick={(event) => event.stopPropagation()}
            >
              <img src={fotoPerfil} alt={`Foto de ${residente.nome}`} />

              <button
                type="button"
                className="popup-btn"
                onClick={() => setVisualizarAberto(false)}
              >
                Fechar
              </button>
            </div>
          </div>,
          document.body,
        )}

      {cameraAberta &&
        createPortal(
          <div className="popup-overlay">
            <div className="camera-modal-conteudo">
              <h3>Tirar foto de perfil</h3>

              {erro && <div className="foto-perfil-erro">{erro}</div>}

              <video ref={videoRef} autoPlay playsInline muted />

              <div className="camera-modal-acoes">
                <button
                  type="button"
                  className="popup-btn"
                  onClick={capturarFoto}
                >
                  Capturar foto
                </button>

                <button
                  type="button"
                  className="popup-btn-secundario"
                  onClick={fecharCamera}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
