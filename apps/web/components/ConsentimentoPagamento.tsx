"use client";

import PaymentLogos from "@/components/PaymentLogos";

import "./ConsentimentoPagamento.css";

/*
 * Bloco exigido pela SISP na página imediatamente anterior ao envio do
 * pedido para a Vinti4: logos das marcas aceites + consentimento
 * obrigatório dos Termos e Condições e da Política de Entrega e
 * Devolução.
 *
 * O checkbox é só estado de frontend: não tem atributo `name`, por isso
 * nunca entra no FormData/URLSearchParams do formulário de recarga nem
 * em qualquer parâmetro enviado à SISP.
 */

interface ConsentimentoPagamentoProps {
  aceite: boolean;
  onAlterar: (aceite: boolean) => void;
  onAbrirTermos: () => void;
}

export const AVISO_CONSENTIMENTO_PAGAMENTO =
  "Para avançar para o pagamento, tens de aceitar os Termos e Condições e a Política de Entrega e Devolução.";

export default function ConsentimentoPagamento({
  aceite,
  onAlterar,
  onAbrirTermos,
}: ConsentimentoPagamentoProps) {
  return (
    <div className="consentimento-pagamento">
      <p className="consentimento-pagamento-titulo">
        Pagamentos aceites
      </p>

      <PaymentLogos comChip />

      <label className="consentimento-pagamento-check">
        <input
          type="checkbox"
          checked={aceite}
          onChange={(event) =>
            onAlterar(event.target.checked)
          }
          aria-describedby={
            aceite
              ? undefined
              : "consentimento-pagamento-aviso"
          }
        />

        <span>
          Li e aceito os{" "}
          <button
            type="button"
            className="consentimento-pagamento-link"
            onClick={(event) => {
              event.preventDefault();
              onAbrirTermos();
            }}
          >
            Termos e Condições
          </button>{" "}
          e a{" "}
          <a
            href="/politica-entrega-reembolso"
            target="_blank"
            rel="noopener noreferrer"
            className="consentimento-pagamento-link"
          >
            Política de Entrega e Devolução
          </a>
          .
        </span>
      </label>

      {!aceite && (
        <p
          id="consentimento-pagamento-aviso"
          className="consentimento-pagamento-aviso"
          role="status"
        >
          {AVISO_CONSENTIMENTO_PAGAMENTO}
        </p>
      )}
    </div>
  );
}
