'use client'

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

import { useState , useEffect} from 'react'
import { obterResidenteGuardado, terminarSessao } from "@/lib/auth";
import { PACOTES, type PacoteId } from "@/lib/pacotes";

const CardRoulette = dynamic(() => import("@/components/CardRoulette"), { ssr: false });

const subPlanosPorPacote = Object.fromEntries(
  PACOTES.map((categoria) => [
    categoria.id,
    { titulo: categoria.titulo, planos: categoria.planos },
  ]),
) as Record<
  PacoteId,
  { titulo: string; planos: (typeof PACOTES)[number]["planos"] }
>;

   export default function VirtualResident() {
  const [view, setView] = useState<'home' | 'login' | 'registo' | 'dashboard' |'pacote'| 'recuperar'>('home');
  const [user, setUser] = useState<any>(null);
  const [qrTime, setQrTime] = useState(30);
  const [pacoteAtivo, setPacoteAtivo] = useState<PacoteId | null>(null);
  const router = useRouter();

  // Restaura a sessão guardada (login feito na página /login) para que o
  // header mostre "Minha conta" em vez de "Login" quando já há sessão ativa.
  useEffect(() => {
    const residenteSalvo = obterResidenteGuardado();
    if (residenteSalvo) {
      setUser(residenteSalvo);
    }
  }, []);

  function abrirPopupPacote(pacote: PacoteId) {
    setPacoteAtivo(pacote);
    setView('pacote');
  }

  function escolherSubPlano() {
    setView('registo');
  }




  return (
    <div>

      {/* ==================== HEADER ==================== */}
      <header>
        <a href="#top" className="logo">
          <img src="/img/CVR-logo.jpg" alt="NOSZONA Smart" className="logo-img" />
        </a>


        <div className="nav-ctas">
          {!user ? (
            <>
              <button className="btn btn-primary" onClick={() => router.push("/login")}>Login</button>
              <button className="btn btn-primary" onClick={() => router.push("/registo")}>Criar conta</button>
            </>
          ) : (
            <>
              <span className="user-greeting">Olá, {user.nome?.split(' ')[0]}</span>
              <button className="btn btn-ghost" onClick={() => router.push("/dashboard")}>Minha conta</button>
              <button className="btn btn-ghost" onClick={() => { terminarSessao(); setUser(null); router.push("/"); }}>Sair</button>
            </>
          )}
        </div>
      </header>

      {/* ==================== HERO ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="hero" id="top">
          <div className="hero-bg"></div>
          <div className="hero-grid-lines"></div>

          <div className="hero-inner">
            <div>

              <h1>

               Descobre <br />Cabo Verde
                sejá um,<br /><span className="accent">Residente Virtual de Cabo verde.</span>
              </h1>
              <p>
                Uma identidade digital completa — QR seguro, carteira virtual, e
                swipes.
              </p>

              <div className="hero-actions">
                <button className="btn btn-gold" onClick={() => setView('registo')}>Explorar Cabo Verde →</button>
                <button className="btn btn-outline-white" onClick={() => setView('login')}>Já tenho conta</button>
              </div>

              <div className="hero-stats">
                <div className="hero-stat">
                  <strong>QR</strong>
                  <span>Acesso digital seguro</span>
                </div>
                <div className="hero-stat">
                  <strong>Cartão Físico</strong>
                  <span>Cartão físico opcional</span>
                </div>
                <div className="hero-stat">
                  <strong>CVE</strong>
                  <span>Saldo na carteira</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <CardRoulette onSelect={(card) => abrirPopupPacote(card.tipo)} />
            </div>
          </div>
        </section>
      )}

            {/* ==================== TRUST STRIP ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <div className="trust-section">
          <div className="trust-inner">
            <div className="trust-item">
              <div className="trust-value">3<span>+</span></div>
              <div className="trust-label">Pacotes disponíveis</div>
            </div>
            <div className="trust-item">
              <div className="trust-value">100<span>%</span></div>
              <div className="trust-label">Digital e sem papel</div>
            </div>
            <div className="trust-item">
              <div className="trust-value">Cartão Físico</div>
              <div className="trust-label">Integração com leitores físicos</div>
            </div>
            <div className="trust-item">
              <div className="trust-value">30<span>s</span></div>
              <div className="trust-label">QR rotativo contra fraude</div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== COMO FUNCIONA ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="section bg-off" id="como-funciona">
          <div className="section-header">
            <span className="eyebrow">Como funciona</span>
            <h2>Três passos para a cidade inteligente</h2>
            <p>Do registo ao acesso, tudo integrado numa experiência simples e moderna.</p>
          </div>

          <div className="steps">
            <div className="step-card">
              <div className="step-visual">
                <div className="step-number">01</div>
                <img src="/img/inscrever.jpg" alt="Regista-te" className="step-illustration" />
              </div>
              <h3>Regista-te</h3>
              <p>Preenche os teus dados, confirma o teu email e escolhe um pacote. Leva menos de 3 minutos.</p>
            </div>

            <div className="step-card">
              <div className="step-visual">
                <div className="step-number">02</div>
                <img src="/img/pagamento.jpg" alt="Paga em segurança" className="step-illustration" />
              </div>
              <h3>Paga em segurança</h3>
              <p>Pagamento via portal seguro Vinti4. Os teus dados de cartão nunca passam pelos nossos servidores.</p>
            </div>

            <div className="step-card">
              <div className="step-visual">
                <div className="step-number">03</div>
                <img src="/img/QRcode.jpg" alt="Usa na cidade" className="step-illustration" />
              </div>
              <h3>Usa na cidade</h3>
              <p>Apresenta o QR em eventos, usa saldo nos serviços e solicita o cartão físico RFID quando quiseres.</p>
            </div>
          </div>
        </section>
      )}


      {/* ==================== Tipo de registro ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="section" id="pacotes">
          <div className="section-header">
            <span className="eyebrow">Pacotes</span>
            <h2>Escolhe o plano certo para ti</h2>
            <p>Planos pensados para diferentes necessidades, todos com QR seguro incluído.</p>
          </div>

          <div className="packages-grid">
            <div className="pkg-card featured">
              <div className="pkg-label">Conhecer</div>
              <div className="pkg-name"> VISITOR</div>
              <p>VISIT, DISCOVER & EXPLORE</p>
              <div className="pkg-price">
                <div className="amount">0</div>
                <div className="currency">CVE</div>
              </div>
              <div className="pkg-divider"></div>
              <ul className="pkg-features">
                <li><div className="pkg-check"></div> Acess to countrym comunity</li>
                <li><div className="pkg-check"></div> culture, tours, investment</li>
                <li><div className="pkg-check"></div> business, innovation</li>
                <li><div className="pkg-check"></div> diaspora conect</li>
                <li><div className="pkg-check"></div>  acess to smart city academy</li>
              </ul>
              <button className="btn-pkg btn-pkg-featured" onClick={() => abrirPopupPacote('visitor')}>Escolher</button>
            </div>

            <div className="pkg-card featured">
              <div className="pkg-label">Ilhas</div>
              <div className="pkg-name">DIASPORA</div>
              <div className="pkg-price">
                <div className="amount">0</div>
                <div className="currency">CVE</div>
              </div>
              <div className="pkg-divider"></div>
              <ul className="pkg-features">
                <li><div className="pkg-check"></div> 5.000 CVE de saldo na carteira</li>
                <li><div className="pkg-check"></div> 50 swipes na cantina</li>
                <li><div className="pkg-check"></div> Entrada em todos os eventos</li>
                <li><div className="pkg-check"></div> QR seguro incluído</li>
              </ul>
              <button className="btn-pkg btn-pkg-featured" onClick={() => abrirPopupPacote('diaspora')}>Escolher</button>
            </div>

            <div className="pkg-card featured">
              <div className="pkg-label">Invest</div>
              <div className="pkg-name">BUSINESS</div>
              <div className="pkg-price">
                <div className="amount">0</div>
                <div className="currency">CVE</div>
              </div>
              <div className="pkg-divider"></div>
              <ul className="pkg-features">
                 <li><div className="pkg-check"></div> REGIRTER YOUR BUSINESS</li>
                 <li><div className="pkg-check"></div> OPPORTUNITIES OPEN A BANK ACCOUNT</li>
                 <li><div className="pkg-check"></div> INCUBATE</li>
                 <li><div className="pkg-check"></div> ACESS THE RIGHT PARTNER</li>
                 <li><div className="pkg-check"></div>  LIVE AND WORK    </li>
              </ul>
              <button className="btn-pkg btn-pkg-featured" onClick={() => abrirPopupPacote('business')}>Escolher</button>
            </div>

            <div className="pkg-card featured">
              <div className="pkg-label"></div>
              <div className="pkg-name"> Student</div>
              <p>VISIT, DISCOVER & EXPLORE</p>
              <div className="pkg-price">
                <div className="amount">0</div>
                <div className="currency">CVE</div>
              </div>
              <div className="pkg-divider"></div>
              <ul className="pkg-features">
                <li><div className="pkg-check"></div> INTERNSHIP</li>
                <li><div className="pkg-check"></div> ACESS TO STARTUP PROGRAM</li>
                <li><div className="pkg-check"></div> SMART CITY AKADEMY </li>
              </ul>
              <button className="btn-pkg btn-pkg-featured" onClick={() => abrirPopupPacote('student')}>Escolher</button>
            </div>
          </div>
        </section>
      )}

      {/* ==================== POPUP PACOTE (3 opções) ==================== */}
      {view === 'pacote' && pacoteAtivo && (
        <div className="popup-overlay" onClick={() => setView('home')}>
          <div className="popup-box popup-box-wide" onClick={(e) => e.stopPropagation()}>
            <div className="pkg-label">{subPlanosPorPacote[pacoteAtivo].titulo}</div>
            <h2>Escolhe o teu plano</h2>
            <p>Três opções dentro deste pacote, escolhe a que faz mais sentido para ti.</p>

            <div className="subplanos-lista">
              {subPlanosPorPacote[pacoteAtivo].planos.map((plano) => (
                <button
                  key={plano.nome}
                  type="button"
                  className="subplano-item"
                  onClick={escolherSubPlano}
                >
                  <div className="subplano-item-topo">
                    <span className="subplano-nome">{plano.nome}</span>
                    <span className="subplano-preco">{plano.preco}</span>
                  </div>
                  <p className="subplano-descricao">{plano.descricao}</p>
                </button>
              ))}
            </div>

            <button type="button" className="popup-btn-secundario" onClick={() => setView('home')}>
              Cancelar
            </button>
          </div>
        </div>
      )}



      {/* ==================== CTA BANNER ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <div className="cta-banner">
          <h2>Junta-te à Smart City<br />de Cabo Verde.</h2>
          <p>O teu cartão digital está a um registo de distância.</p>
          <div className="cta-actions">
            <button className="btn btn-gold" onClick={() => setView('registo')}>Criar conta agora →</button>
            <button className="btn btn-outline-white" onClick={() => setView('login')}>Já tenho conta</button>
          </div>
        </div>
      )}
       
            {/* ==================== RECUPERAR SENHA ==================== */}
      {view === 'recuperar' && (
        <section className="form-section pt-20">
          <div className="form-panel form-panel-narrow">
            <div className="form-panel-top">
              <h2>Recuperar Acesso</h2>
              <p>Digite o seu email para receber um link de recuperação.</p>
            </div>

            <div className="form-body">
              <form onSubmit={(e) => {
                e.preventDefault();
                alert("Link de recuperação enviado (simulação). Verifique o seu email.");
                setView('login');
              }}>
                <div className="form-group full">
                  <label htmlFor="recuperarEmail">Email</label>
                  <input id="recuperarEmail" type="email" required placeholder="email@exemplo.com" />
                </div>

                <button type="submit" className="form-submit">Enviar Link →</button>
              </form>

              <p className="form-switch mt-6 text-center">
                <a href="#" onClick={() => setView('login')}>Voltar ao Login</a>
              </p>
            </div>
          </div>
        </section>
      )}

    </div>
  )
}