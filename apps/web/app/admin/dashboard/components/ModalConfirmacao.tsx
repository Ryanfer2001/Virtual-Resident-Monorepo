"use client";

import { useState } from "react";

interface ModalConfirmacaoProps {
  titulo: string;
  descricao?: string;
  exigirMotivo?: boolean;
  rotuloCampo?: string;
  placeholderCampo?: string;
  textoConfirmar?: string;
  perigo?: boolean;
  aProcessar?: boolean;
  onConfirmar: (motivo?: string) => void;
  onCancelar: () => void;
}

export default function ModalConfirmacao({
  titulo,
  descricao,
  exigirMotivo = false,
  rotuloCampo = "Motivo",
  placeholderCampo = "Explica o motivo desta ação",
  textoConfirmar = "Confirmar",
  perigo = false,
  aProcessar = false,
  onConfirmar,
  onCancelar,
}: ModalConfirmacaoProps) {
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState(false);

  function confirmar() {
    if (exigirMotivo && !motivo.trim()) {
      setErroMotivo(true);
      return;
    }

    onConfirmar(exigirMotivo ? motivo.trim() : undefined);
  }

  return (
    <div className="admin-modal-fundo" role="presentation" onClick={onCancelar}>
      <div
        className="admin-modal-caixa"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-titulo"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="admin-modal-titulo">{titulo}</h3>

        {descricao && <p className="admin-modal-descricao">{descricao}</p>}

        {exigirMotivo && (
          <label className="admin-modal-label">
            {rotuloCampo} *
            <textarea
              value={motivo}
              onChange={(event) => {
                setMotivo(event.target.value);
                setErroMotivo(false);
              }}
              rows={3}
              placeholder={placeholderCampo}
            />
            {erroMotivo && (
              <span className="admin-modal-erro">Este campo é obrigatório.</span>
            )}
          </label>
        )}

        <div className="admin-modal-acoes">
          <button
            type="button"
            className="admin-btn-secundario"
            onClick={onCancelar}
            disabled={aProcessar}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={perigo ? "admin-btn-perigo" : "admin-btn-primario"}
            onClick={confirmar}
            disabled={aProcessar}
          >
            {aProcessar ? "A processar..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
