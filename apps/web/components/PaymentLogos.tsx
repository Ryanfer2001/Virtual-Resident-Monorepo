import Image from "next/image";

interface LogoPagamento {
  nome: string;
  src: string;
  largura: number;
  altura: number;
  classeAltura: string;
  fundoEscuro?: boolean;
}

/*
 * Logos oficiais fornecidos pela SISP (Pacote desenvolvimento_4.7,
 * "g. Logo das marcas aceites"), copiados sem qualquer edição para
 * apps/web/public/img/payment/oficial-sisp/.
 *
 * largura/altura = tamanho intrínseco real de cada ficheiro, usado pelo
 * next/image só para a proporção (width: auto nunca distorce). Cada
 * ficheiro tem margens internas diferentes, por isso a altura visível é
 * afinada por logo (classeAltura, em globals.css) para ficarem
 * equilibrados lado a lado. `unoptimized` serve o ficheiro oficial tal
 * como está, sem o next/image o redimensionar/recomprimir.
 */
const LOGOS_PAGAMENTO: LogoPagamento[] = [
  {
    nome: "vinti4",
    src: "/img/payment/oficial-sisp/vinti4.png",
    largura: 300,
    altura: 288,
    classeAltura: "payment-logo-img--vinti4",
  },
  {
    nome: "Visa",
    src: "/img/payment/oficial-sisp/visa-secure_blu_2021_dkbg.png",
    largura: 198,
    altura: 198,
    classeAltura: "payment-logo-img--visa",
  },
  /*
   * Variante "rev" (reverse) oficial: o texto "ID Check" é branco, por
   * isso o logo é sempre apresentado sobre fundo escuro.
   */
  {
    nome: "Mastercard",
    src: "/img/payment/oficial-sisp/mc_idcheck_hrz_rgb_rev.png",
    largura: 2102,
    altura: 600,
    classeAltura: "payment-logo-img--mastercard",
    fundoEscuro: true,
  },
  {
    nome: "American Express",
    src: "/img/payment/oficial-sisp/AXP_MagBlueBoxLogo.jpg",
    largura: 700,
    altura: 700,
    classeAltura: "payment-logo-img--amex",
  },
];

interface PaymentLogosProps {
  comChip?: boolean;
}

export default function PaymentLogos({ comChip = false }: PaymentLogosProps) {
  return (
    <div className="payment-logos">
      {LOGOS_PAGAMENTO.map((logo) => (
        <div
          key={logo.nome}
          className={[
            comChip ? "payment-logo-chip" : "payment-logo-plain",
            logo.fundoEscuro ? "payment-logo-fundo-escuro" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Image
            src={logo.src}
            alt={`Pagamento aceite: ${logo.nome}`}
            className={`payment-logo-img ${logo.classeAltura}`}
            width={logo.largura}
            height={logo.altura}
            unoptimized
          />
        </div>
      ))}
    </div>
  );
}
