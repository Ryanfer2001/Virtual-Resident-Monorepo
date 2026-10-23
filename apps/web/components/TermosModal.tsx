"use client";

/*
 * Termos e Condições e Política de Privacidade — o mesmo texto que antes
 * estava inline em app/registo/page.tsx, extraído para poder ser aberto
 * também a partir do checkout de recarga (dashboard). onAceitar é
 * opcional: sem ele o modal só tem "Fechar" (o consentimento do
 * checkout é dado no próprio checkbox, não aqui).
 */

import "./TermosModal.css";

interface TermosModalProps {
  onFechar: () => void;
  onAceitar?: () => void;
}

export default function TermosModal({
  onFechar,
  onAceitar,
}: TermosModalProps) {
  return (
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
          {onAceitar && (
            <button
              type="button"
              onClick={onAceitar}
            >
              Li e aceito
            </button>
          )}

          <button
            type="button"
            onClick={onFechar}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
