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
  const [pacoteParaMudar, setPacoteParaMudar] = useState<string | null>(null);
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

  function irParaRegisto(pacoteNome: string) {
    setView('home');

    if (user) {
      if (user.pacote && user.pacote !== pacoteNome) {
        setPacoteParaMudar(pacoteNome);
      } else {
        router.push("/dashboard");
      }
      return;
    }

    router.push(`/registo?pacote=${encodeURIComponent(pacoteNome)}`);
  }

  function confirmarMudancaPacote() {
    if (!pacoteParaMudar) return;
    router.push(`/dashboard?pedidoPacote=${encodeURIComponent(pacoteParaMudar)}`);
    setPacoteParaMudar(null);
  }




  return (
    <div>

      {/* ==================== HEADER ==================== */}
      <header>
        <a href="#top" className="logo">
          <img src="/img/CVR-logo.jpg" alt="Virtual resident" className="logo-img" />
        </a>


        <div className="nav-ctas">
          {!user ? (
            <>
              <button className="btn btn-primary" onClick={() => router.push("/login")}>Login</button>
              <button className="btn btn-primary" onClick={() => router.push("/registo")}>Criar conta</button>
            </>
          ) : (
            <>

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

              <span className="hero-tag">Cabo Verde Virtual Resident</span>

              <h1>
                From Global Discovery<br />
                to <span className="accent">Global Belonging</span>
              </h1>
              <p>
                Your key to Cabo Verde's experiences and opportunities.
              </p>

              <div className="hero-journey">
                <span>Discover</span>
                <i className="hero-journey-dot" aria-hidden="true"></i>
                <span>Connect</span>
                <i className="hero-journey-dot" aria-hidden="true"></i>
                <span>Participate</span>
                <i className="hero-journey-dot" aria-hidden="true"></i>
                <span>Belong</span>
              </div>

              <div className="hero-actions">
                <button className="btn btn-gold" onClick={() => router.push("/registo")}>Explorar Cabo Verde →</button>
                <button className="btn btn-outline-white" onClick={() => router.push("/login")}>Já tenho conta</button>
              </div>
            </div>

            <div className="hero-visual">
              <CardRoulette onSelect={(card) => irParaRegisto(card.plano)} />
            </div>
          </div>
        </section>
      )}

            {/* ==================== TRUST STRIP ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <div className="trust-section">
          <div className="trust-inner">
            <div className="trust-item">
              <div className="trust-value">varios</div>
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

      {/* ==================== WELCOME TO CABO VERDE ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="section bg-navy welcome-section">
          <div className="section-header">
            <span className="eyebrow">Welcome to Cabo Verde</span>
            <h2>The world is discovering Cabo Verde.</h2>
            <p>
              Through its people, islands, culture, music, entrepreneurship, global diaspora,
              international connections, and growing reputation for innovation, Cabo Verde is
              reaching new audiences across the world.
            </p>
          </div>

          <div className="welcome-lead">
            <p>
              The next step is to transform global discovery into lasting belonging.
              The Cabo Verde Virtual Residency Program is designed to connect people
              everywhere with the country's future — before they visit, invest, establish
              a business, study, collaborate, or choose to live in Cabo Verde.
            </p>
            <p className="welcome-highlight">
              You do not need to be physically in Cabo Verde to begin your relationship
              with the country. <span className="accent">You can connect today.</span>
            </p>
          </div>

          <div className="welcome-points">
            <span>You can learn.</span>
            <span>You can participate.</span>
            <span>You can discover opportunities.</span>
            <span>You can contribute your knowledge, network, experience, and ideas.</span>
          </div>

          <p className="welcome-closing">
            And over time, you can become part of the Cabo Verde story.<br />
            <strong>Welcome to the Global Cabo Verde Community.</strong>
          </p>
        </section>
      )}

      {/* ==================== O QUE É A VIRTUAL RESIDENCY ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="section" id="sobre">
          <div className="section-header">
            <span className="eyebrow">What is Virtual Residency</span>
            <h2>Cabo Verde Virtual Residency</h2>
            <p>
              A digital community and opportunity platform connecting people around the
              world with Cabo Verde — a structured gateway to the country's people,
              experiences, knowledge, opportunities, and future development.
            </p>
          </div>

          <div className="chip-grid">
            {[
              "Cabo Verde's global community",
              "Tourism and cultural experiences",
              "Business opportunities",
              "Entrepreneurship",
              "Investment opportunities",
              "Innovation and startups",
              "Smart city initiatives",
              "Education and skills development",
              "Diaspora networks",
              "International events",
              "Healthy living and well-being experiences",
              "Volunteer and impact opportunities",
              "Strategic partnerships",
              "Future digital services",
            ].map((item) => (
              <span className="chip" key={item}>{item}</span>
            ))}
          </div>

          <div className="pull-quote">
            <p>Make it possible to join Cabo Verde before you even arrive.</p>
            <span>Virtual Residency creates a long-term relationship between Cabo Verde and people who want to discover, connect with, participate in, and contribute to its future.</span>
          </div>
        </section>
      )}

      {/* ==================== JORNADA: DISCOVERY TO BELONGING ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="section bg-off">
          <div className="section-header">
            <span className="eyebrow">The Journey</span>
            <h2>From Discovery to Belonging</h2>
            <p>Virtual Residency is built around a simple journey.</p>
          </div>

          <div className="journey">
            {[
              { t: "Discover Cabo Verde", d: "Learn about the islands, people, culture, lifestyle, economy, innovation, and opportunities." },
              { t: "Become a Virtual Resident", d: "Join the Global Cabo Verde Community and begin building your connection." },
              { t: "Connect", d: "Meet people, businesses, entrepreneurs, professionals, institutions, and communities that share your interests." },
              { t: "Visit Cabo Verde", d: "Turn digital discovery into a real-life experience." },
              { t: "Learn & Participate", d: "Join events, courses, programs, innovation initiatives, and community activities." },
              { t: "Invest or Do Business", d: "Explore opportunities that match your interests, objectives, and eligibility." },
              { t: "Live", d: "Discover opportunities to study, work, retire, establish a business, invest, or build a deeper relationship with Cabo Verde." },
              { t: "Become a Global Ambassador", d: "Help connect Cabo Verde with your city, profession, community, and international network." },
            ].map((step, i) => (
              <div className="journey-step" key={step.t}>
                <div className="journey-num">{String(i + 1).padStart(2, "0")}</div>
                <h3>{step.t}</h3>
                <p>{step.d}</p>
              </div>
            ))}
          </div>

          <p className="journey-closing">Discovery starts the relationship. Virtual Residency helps it grow.</p>
        </section>
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


      {/* ==================== WHY CABO VERDE ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="section" id="porque-cabo-verde">
          <div className="section-header">
            <span className="eyebrow">Why Cabo Verde</span>
            <h2>What Makes Cabo Verde Distinctive</h2>
            <p>
              Cabo Verde combines African identity, Atlantic connectivity, political
              stability, global relationships, cultural richness, and an increasingly
              digital outlook.
            </p>
          </div>

          <div className="info-grid">
            {[
              { icon: "🏝️", c: "fi-cyan", t: "Beautiful Islands", d: "An archipelago shaped by volcanic landscapes, beaches, mountains, ocean, distinctive communities, and diverse island experiences." },
              { icon: "🌊", c: "fi-gold", t: "Atlantic Gateway", d: "Cabo Verde occupies a strategic geographic position connecting Africa, Europe, and the Americas." },
              { icon: "🌍", c: "fi-green", t: "Global Community", d: "An identity that extends far beyond the islands through a large and influential diaspora and international network." },
              { icon: "💻", c: "fi-cyan", t: "Digital Transformation", d: "A country increasingly using technology, connectivity, digital infrastructure, and innovation as tools for development." },
              { icon: "🚀", c: "fi-gold", t: "Innovation & Entrepreneurship", d: "Connect with startups, entrepreneurs, universities, technology initiatives, innovation hubs, and emerging ecosystems." },
              { icon: "💼", c: "fi-green", t: "Business & Investment", d: "Opportunities across tourism, real estate, technology, renewable energy, agriculture, creative industries, and services." },
              { icon: "🎶", c: "fi-cyan", t: "Culture & Creativity", d: "Cabo Verdean music, gastronomy, language, art, traditions, and a cultural identity recognized around the world." },
              { icon: "🌿", c: "fi-gold", t: "Healthy Atlantic Lifestyle", d: "A lifestyle shaped by ocean, climate, outdoor activity, community, food, culture, nature, sport, and well-being." },
              { icon: "🤝", c: "fi-green", t: "People & Hospitality", d: "The warmth, openness, resilience, creativity, and welcoming spirit that define Cabo Verdean communities." },
            ].map((card) => (
              <div className="info-card" key={card.t}>
                <div className={`info-icon ${card.c}`}>{card.icon}</div>
                <h3>{card.t}</h3>
                <p>{card.d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================== O QUE RECEBE UM VIRTUAL RESIDENT ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="section bg-navy" id="beneficios">
          <div className="section-header">
            <span className="eyebrow">Member Benefits</span>
            <h2>What Does a Virtual Resident Receive?</h2>
            <p>Benefits depend on the member's chosen community and level of participation.</p>
          </div>

          <div className="info-grid info-grid-compact">
            {[
              { icon: "👥", t: "Community", d: "Connect with people in Cabo Verde and members of the global Cabo Verde network." },
              { icon: "✨", t: "Opportunities", d: "Discover business, investment, employment, startup, tourism, learning, and partnership opportunities." },
              { icon: "🎟️", t: "Events", d: "Receive invitations to selected virtual, physical, and hybrid events." },
              { icon: "🛍️", t: "Marketplace", d: "Discover Cabo Verdean businesses, professionals, services, products, experiences, and opportunities." },
              { icon: "📚", t: "Learning", d: "Participate in courses, masterclasses, professional development, mentoring, and innovation programs." },
              { icon: "🤝", t: "Business Matching", d: "Connect entrepreneurs, investors, companies, professionals, and potential partners." },
              { icon: "💡", t: "Innovation", d: "Participate in startup programs, innovation challenges, smart-city initiatives, research, and pilot projects." },
              { icon: "🎭", t: "Culture", d: "Programs celebrating Cabo Verdean music, creativity, history, gastronomy, and identity." },
              { icon: "🌱", t: "Health & Well-Being", d: "Programs and experiences related to healthy living, sport, active ageing, outdoor lifestyle, and quality of life." },
              { icon: "❤️", t: "Impact", d: "Find opportunities to support youth, women, entrepreneurs, communities, sustainability, and social initiatives." },
              { icon: "🌐", t: "Diaspora Connection", d: "Strengthen the relationship between Cabo Verde and its communities around the world." },
            ].map((card) => (
              <div className="info-card info-card-dark" key={card.t}>
                <div className="info-icon info-icon-dark">{card.icon}</div>
                <h3>{card.t}</h3>
                <p>{card.d}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ==================== Tipo de registro ==================== */}
      {(view === 'home' || view === 'pacote') && (
        <section className="section" id="pacotes">
          <div className="section-header">
            <span className="eyebrow">Choose Your Path</span>
            <h2>Choose Your Virtual Residency Path</h2>
            <p>
              Virtual Residency recognizes that people connect with Cabo Verde in different
              ways. Start by discovering the country and progressively deepen your
              participation as your relationship with Cabo Verde grows.
            </p>
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

      {/* ==================== POPUP PACOTE  ==================== */}
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
                  onClick={() => irParaRegisto(plano.nome)}
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

      {/* ==================== POPUP MUDAR DE PACOTE ==================== */}
      {pacoteParaMudar && user && (
        <div className="popup-overlay" onClick={() => setPacoteParaMudar(null)}>
          <div className="popup-box" onClick={(e) => e.stopPropagation()}>
            <h2>Mudar de pacote?</h2>
            <p>
              A tua conta tem atualmente o pacote <strong>{user.pacote || "nenhum"}</strong>.
              Queres pedir a mudança para <strong>{pacoteParaMudar}</strong>?
              O pedido fica pendente de confirmação manual da nossa equipa,
              tal como o pedido do cartão físico.
            </p>
            <button type="button" className="popup-btn" onClick={confirmarMudancaPacote}>
              Sim, pedir mudança
            </button>
            <button type="button" className="popup-btn-secundario" onClick={() => setPacoteParaMudar(null)}>
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
            <button className="btn btn-gold" onClick={() => router.push("/registo")}>Criar conta agora →</button>
            <button className="btn btn-outline-white" onClick={() => router.push("/login")}>Já tenho conta</button>
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