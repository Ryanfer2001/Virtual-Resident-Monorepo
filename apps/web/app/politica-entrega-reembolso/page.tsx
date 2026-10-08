import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./politica.css";

export const metadata: Metadata = {
  title: "Política de Entrega e Reembolso",
  description:
    "Política de Entrega e Reembolso do Cabo Verde Virtual Resident.",
};

export default function PoliticaEntregaReembolsoPage() {
  return (
    <>
      <Header />

      <main className="policy-page">
        <div className="policy-container">
          <div className="policy-header">
            <span className="eyebrow">Cabo Verde Virtual Resident</span>
            <h1>Política de Entrega e Reembolso</h1>
          </div>

          <section className="policy-section">
            <h2>1. Âmbito</h2>
            <p>
              O Cabo Verde Virtual Resident fornece principalmente serviços
              digitais, incluindo pacotes de residência virtual e recargas de
              saldo. Pode também existir, de forma opcional, um cartão físico
              associado à conta.
            </p>
          </section>

          <section className="policy-section">
            <h2>2. Entrega e Ativação dos Serviços Digitais</h2>
            <ul>
              <li>
                Os benefícios digitais de um pacote são ativados apenas
                depois de o pagamento ser aprovado pela SISP / rede vinti4.
              </li>
              <li>
                As recargas de saldo são creditadas apenas depois da
                confirmação do pagamento.
              </li>
              <li>
                Pagamentos recusados ou cancelados pela SISP não ativam
                pacotes nem creditam saldo — não é necessária qualquer ação
                por parte do utilizador nesses casos.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>3. Reembolsos</h2>
            <p>
              Salvo disposição legal em contrário ou erro comprovado
              imputável à NOSZONA, os pagamentos de pacotes e as recargas de
              saldo não são reembolsáveis, dada a natureza imediata da
              disponibilização dos benefícios associados.
            </p>
            <p>
              Para reportar uma situação excecional ou um erro de cobrança,
              o utilizador deve contactar o Apoio ao Cliente através dos
              contactos indicados abaixo.
            </p>
          </section>

          <section className="policy-section">
            <h2>4. Cartão Físico</h2>
            <ul>
              <li>
                O cartão físico é opcional e depende de aprovação e
                ativação administrativa.
              </li>
              <li>
                Atualmente não existe envio postal do cartão físico.
              </li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>5. Cancelamento / Encerramento de Conta</h2>
            <p>
              Pedidos relacionados com o cancelamento ou encerramento da
              conta devem ser feitos através do Apoio ao Cliente.
            </p>
          </section>

          <section className="policy-section">
            <h2>6. Apoio ao Cliente</h2>
            <p className="policy-contact">
              <a href="tel:+2385347888">Tel: 5347888</a>
            </p>
            <p className="policy-contact">
              <a href="mailto:caboverdevr@gmail.com">
                caboverdevr@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
