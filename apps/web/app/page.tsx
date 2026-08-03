'use client'

import { useRouter } from "next/navigation";

import { useState , useEffect} from 'react'
import { obterResidenteGuardado, terminarSessao } from "@/lib/auth";

type PacoteId = 'visitor' | 'diaspora' | 'business' | 'student';

type SubPlano = {
  nome: string;
  preco: string;
  descricao: string;
};

const subPlanosPorPacote: Record<PacoteId, { titulo: string; planos: SubPlano[] }> = {
  visitor: {
    titulo: 'VISITOR',
    planos: [
      { nome: 'Visitor Básico', preco: '0 CVE', descricao: 'Acesso à comunidade e eventos abertos.' },
      { nome: 'Visitor Standard', preco: '1.500 CVE', descricao: 'Tours guiados e acesso à Smart City Akademy.' },
      { nome: 'Visitor Plus', preco: '3.000 CVE', descricao: 'Acesso prioritário a eventos e parceiros de investimento.' },
    ],
  },
  diaspora: {
    titulo: 'DIASPORA',
    planos: [
      { nome: 'Diaspora Start', preco: '2.500 CVE', descricao: '2.500 CVE de saldo e 20 swipes na cantina.' },
      { nome: 'Diaspora Completo', preco: '5.000 CVE', descricao: '5.000 CVE de saldo, 50 swipes e entrada em todos os eventos.' },
      { nome: 'Diaspora Premium', preco: '10.000 CVE', descricao: '10.000 CVE de saldo, swipes ilimitados e QR prioritário.' },
    ],
  },
  business: {
    titulo: 'BUSINESS',
    planos: [
      { nome: 'Business Starter', preco: '5.000 CVE', descricao: 'Registo do negócio e acesso à comunidade empresarial.' },
      { nome: 'Business Growth', preco: '10.000 CVE', descricao: 'Abertura de conta bancária e incubação incluídas.' },
      { nome: 'Business Elite', preco: '20.000 CVE', descricao: 'Acesso direto aos parceiros certos e mentoria dedicada.' },
    ],
  },
  student: {
    titulo: 'STUDENT',
    planos: [
      { nome: 'Student Essencial', preco: '0 CVE', descricao: 'Acesso à Smart City Akademy.' },
      { nome: 'Student Ativo', preco: '1.000 CVE', descricao: 'Inclui estágio (internship) e workshops.' },
      { nome: 'Student Pro', preco: '2.000 CVE', descricao: 'Acesso total ao startup program e mentoria de carreira.' },
    ],
  },
};

   export default function NoszonaSmart() {
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

  // QR Countdown
  useEffect(() => {
    if (view !== 'dashboard' || !user) return;

    const interval = setInterval(() => {
      setQrTime((prev) => {
        if (prev <= 1) {
          // Simula renovação do QR
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [view, user]);


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
              <div className="card-3d">
                <div className="card-badge">✦ NOSZONA Smart City</div>

                <div className="feature-rows">
                  <div className="feature-row">
                    <div className="feature-icon fi-cyan">📱</div>
                    <div className="feature-row-text">
                      <strong>QR Dinâmico Seguro</strong>
                      <span>Renovado a cada 30s contra fraude</span>
                    </div>
                  </div>
                  <div className="feature-row">
                    <div className="feature-icon fi-gold">💳</div>
                    <div className="feature-row-text">
                      <strong>Carteira Virtual</strong>
                      <span>Recarrega saldo e swipes a qualquer momento</span>
                    </div>
                  </div>
                  <div className="feature-row">
                    <div className="feature-icon fi-green">🏙️</div>
                    <div className="feature-row-text">
                      <strong>Smart City Integrado</strong>
                      <span>Acesso a serviços, eventos e infraestrutura</span>
                    </div>
                  </div>
                </div>
              </div>
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
            {/* ==================== LOGIN ==================== */}
      {view === 'login' && (
        <section id="login" className="form-section">
          <div className="form-panel form-panel-narrow">
            <div className="form-panel-top">
              <h2>Entrar na conta</h2>
              <p>Acede ao teu QR, saldo e serviços NOSZONA Smart.</p>
            </div>

            <div className="form-body">
              <form id="formLogin" onSubmit={(e) => {
                e.preventDefault();
                setUser({ nome: "Utilizador Teste" });
                setView('dashboard');
              }}>

                <div className="form-grid">
                  <div className="form-group full">
                    <label htmlFor="loginUsername">Username</label>
                    <input id="loginUsername" required placeholder="Nome de utilizador" />
                  </div>

                  <div className="form-group full">
                    <label htmlFor="loginPassword">Password</label>
                    <input id="loginPassword" type="password" required placeholder="Palavra-passe" />
                  </div>

                  <div className="form-group full form-checkbox">
                    <label className="checkbox-label">
                      <input type="checkbox" /> Manter sessão iniciada neste dispositivo
                    </label>
                  </div>
                </div>

                <button type="submit" className="form-submit">Entrar →</button>

                <button
                  type="button"
                  onClick={() => alert('Login com Google em desenvolvimento')}
                  className="btn-google"
                >
                  Entrar com Google
                </button>

                <p className="form-switch">
                  <a href="#" onClick={() => setView('recuperar')}>Esqueci-me da password</a>
                  &nbsp;·&nbsp;
                  <a href="#" onClick={() => setView('registo')}>Criar conta nova</a>
                </p>
              </form>
            </div>
          </div>
        </section>
      )}



            {/* ==================== REGISTO ==================== */}
      {view === 'registo' && (
        <section id="registo" className="form-section pt-20">
          <div className="form-panel">
            <div className="form-panel-top">
              <h2>Registo de Residente</h2>
              <p>Preenche os teus dados para criar a conta NOSZONA Smart.</p>
            </div>

            <div className="form-body">
              <form id="formRegisto" onSubmit={(e) => {
                e.preventDefault();
                // Simulação de registo
                const formData = new FormData(e.currentTarget);
                const novoUser = {
                  nome: formData.get('nome'),
                  email: formData.get('email'),
                  telefone: formData.get('telefone'),
                  documento: formData.get('documento'),
                  pacote: formData.get('pacote')
                };
                setUser(novoUser);
                setView('dashboard');
                alert('Registo simulado com sucesso! (Em produção vai conectar ao backend)');
              }}>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="nome">Nome completo *</label>
                    <input id="nome" name="nome" required minLength={3} placeholder="Ex: Nome Sobrenome" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="dataNascimento">Data de nascimento *</label>
                    <input id="dataNascimento" name="dataNascimento" type="date" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="nacionalidade">Nacionalidade *</label>
                    <input id="nacionalidade" name="nacionalidade" required placeholder="Ex: Cabo-verdiana" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="documento">Nº BI / CNI / Passaporte *</label>
                    <input id="documento" name="documento" required placeholder="Documento de identificação" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="telefone">Telefone *</label>
                    <input id="telefone" name="telefone" type="tel" required placeholder="+238 *** ***" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input id="email" name="email" type="email" required placeholder="email@exemplo.com" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="morada">Morada *</label>
                    <input id="morada" name="morada" required placeholder="Morada atual" />
                  </div>
                </div>

                <button type="submit" className="form-submit">Criar Conta →</button>
              </form>
            </div>
          </div>
        </section>
      )}

            {/* ==================== DASHBOARD ==================== */}
      {view === 'dashboard' && user && (
        <section className="dashboard-section pt-24 pb-20 bg-[#061827]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-4xl font-bold">Bem-vindo de volta, {user.nome?.split(' ')[0]}!</h2>
                <p className="text-gray-400">Gerencie sua identidade digital NOSZONA</p>
              </div>
              <button
                onClick={() => { setUser(null); setView('home'); }}
                className="btn btn-ghost"
              >
                Sair
              </button>
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
              {/* Cartão Principal (como no original) */}
              <div className="lg:col-span-7">
                <div className="card-3d bg-gradient-to-br from-zinc-900 to-black border border-white/20 rounded-3xl p-8 relative overflow-hidden">
                  <div className="card-badge absolute top-6 right-6 bg-yellow-400 text-black text-xs font-bold px-4 py-1 rounded-full">
                    NOSZONA Smart City
                  </div>

                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-bold" id="dashNome">{user.nome}</h3>
                      <p className="text-sm text-gray-400">Residente • Cabo Verde</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">ID de Residente</div>
                      <div className="font-mono text-lg">NSZ-{Math.floor(100000 + Math.random() * 900000)}</div>
                    </div>
                  </div>

                  {/* QR Code Grande */}
                  <div className="bg-white rounded-2xl p-6 mb-6 flex justify-center">
                    <div id="qrCode" className="p-3 bg-white"></div>
                  </div>

                  <div className="qr-countdown text-center mb-6">
                    Renova em <strong id="qrCountdown" className="text-yellow-400">30</strong>s
                    <div className="qr-progress mt-2">
                      <div className="qr-progress-bar" id="qrProgressBar"></div>
                    </div>
                  </div>

                  <p className="text-center text-xs text-gray-400">
                    Apresente este QR em eventos, cantina ou serviços da Smart City
                  </p>
                </div>
              </div>

              {/* Info Lateral */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
                  <h4 className="text-yellow-400 mb-4">Saldo Atual</h4>
                  <div className="text-5xl font-bold mb-1">12.450 CVE</div>
                  <p className="text-green-400">+ 45 swipes restantes</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => alert('Recarga via Vinti4 em desenvolvimento')}
                    className="h-28 bg-white text-black rounded-3xl font-semibold hover:scale-105 transition-transform"
                  >
                    Recarregar
                  </button>
                  <button
                    onClick={() => alert('Solicitação de cartão físico em breve')}
                    className="h-28 bg-white/10 border border-white/30 rounded-3xl font-semibold hover:bg-white/20 transition-all"
                  >
                    Pedir Cartão Físico
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
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