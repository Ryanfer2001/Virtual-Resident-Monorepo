import Image from "next/image";

interface LogoPagamento {
  nome: string;
  src: string;
  largura: number;
  altura: number;
}

/*
 * Dimensões = tamanho intrínseco real de cada ficheiro (apps/web/public/img/payment/),
 * usado pelo next/image só para calcular a proporção — a altura visível uniforme
 * vem da classe .payment-logo-img em globals.css.
 */
const LOGOS_PAGAMENTO: LogoPagamento[] = [
  { nome: "vinti4", src: "/img/payment/vinti4.png", largura: 64, altura: 62 },
  { nome: "Visa", src: "/img/payment/visa.svg", largura: 200, altura: 127 },
  { nome: "Mastercard", src: "/img/payment/mastercard.svg", largura: 1000, altura: 618 },
  { nome: "American Express", src: "/img/payment/amex.svg", largura: 1000, altura: 998 },
];

interface PaymentLogosProps {
  comChip?: boolean;
}

export default function PaymentLogos({ comChip = false }: PaymentLogosProps) {
  return (
    <div className="payment-logos">
      {LOGOS_PAGAMENTO.map((logo) => (
        <div key={logo.nome} className={comChip ? "payment-logo-chip" : "payment-logo-plain"}>
          <Image
            src={logo.src}
            alt={`Pagamento aceite: ${logo.nome}`}
            className="payment-logo-img"
            width={logo.largura}
            height={logo.altura}
          />
        </div>
      ))}
    </div>
  );
}
