import Link from "next/link";
import PaymentLogos from "@/components/PaymentLogos";

export default function Footer() {
  return (
    <footer>
      <div className="footer-grid">
        <div className="footer-block">
          <p className="footer-brand">Cabo Verde Virtual Resident</p>
        </div>

        <div className="footer-block">
          <p className="footer-block-title">Apoio ao Cliente</p>
          <p className="footer-contact">
            <a href="tel:+2385347888">Tel: 5347888</a>
          </p>
          <p className="footer-contact">
            <a href="mailto:caboverdevr@gmail.com">caboverdevr@gmail.com</a>
          </p>
        </div>

        <div className="footer-payment-section">
          <p className="footer-payment-label">Pagamentos aceites</p>
          <PaymentLogos comChip />
        </div>
      </div>

      <div className="footer-legal">
        <Link href="/politica-entrega-reembolso">
          Política de Entrega e Reembolso
        </Link>
      </div>
    </footer>
  );
}
