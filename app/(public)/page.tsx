import type { Metadata } from 'next';
import { WaitlistForm } from '@/components/landing/WaitlistForm';

export const metadata: Metadata = {
  title: 'O Tutor — Acesso antecipado',
  description: 'O app mais inteligente para concursos públicos. Editais automáticos, simulados adaptativos com IA e plano de estudo personalizado. Cadastre-se para acesso antecipado.',
  openGraph: {
    title: 'O Tutor — O Tutor certo para o concurso certo.',
    description: 'Seja um dos primeiros a testar. Os 50 primeiros ganham 3 meses do Plano Premium grátis.',
    url: 'https://otutor.com.br',
    siteName: 'O Tutor',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'O Tutor — Acesso antecipado',
    description: 'Os 50 primeiros ganham 3 meses do Plano Premium grátis.',
  },
};

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    titulo: 'Editais automáticos',
    desc: 'Sem buscar, sem perder prazo',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    titulo: 'IA adaptativa (IRT)',
    desc: 'Questão certa para o seu nível agora',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    titulo: 'Raio-X do edital',
    desc: 'Saiba o que mais cai na sua prova',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    titulo: 'Tutor IA 24/7',
    desc: 'Tire dúvidas sobre qualquer questão',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    titulo: 'Apostilas em flashcards',
    desc: 'Envie seu PDF, receba os cards',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
    ),
    titulo: 'Chance de aprovação',
    desc: 'Veja onde você está vs. aprovados',
  },
];

const PASSOS = [
  {
    num: '01',
    titulo: 'Edital chega até você',
    desc: 'Monitoramos 10+ fontes automaticamente. Quando sair um edital no seu perfil, você recebe uma notificação com link de inscrição.',
  },
  {
    num: '02',
    titulo: 'Simulado feito para você',
    desc: 'Nossa IA usa o mesmo motor do ENEM (IRT) para criar questões no seu nível e explicar cada erro com base em lei e doutrina.',
  },
  {
    num: '03',
    titulo: 'Plano que te leva à aprovação',
    desc: 'Com base no seu desempenho e na data da prova, O Tutor monta um cronograma diário. Você só precisa seguir.',
  },
];


export default function LandingPage() {
  return (
    <div style={{ fontFamily: '-apple-system, "Segoe UI", sans-serif', color: '#0D1117' }}>

      {/* ── HERO ──────────────────────────────────── */}
      <section className="max-w-170 mx-auto px-5 pt-16 pb-12 flex flex-col items-center text-center gap-6">

        {/* Badge urgência */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[12px] font-semibold text-red-600">Acesso antecipado — vagas limitadas</span>
        </div>

        {/* Logo */}
        <div className="text-[28px] font-black text-[#2B3DE8] tracking-tight">O Tutor</div>

        {/* H1 */}
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 52px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1, margin: 0 }}>
          O Tutor certo<br />
          para o concurso <span style={{ color: '#2B3DE8' }}>certo.</span>
        </h1>

        {/* Subtítulo */}
        <p style={{ fontSize: 18, color: '#3A3D4A', lineHeight: 1.7, maxWidth: 520, margin: 0 }}>
          Editais automáticos, simulados com IA adaptativa e plano de estudo personalizado.
          Tudo em um app. Tudo gratuito para começar.
        </p>

        {/* Form */}
        <div id="cadastro" className="w-full mt-2">
          <WaitlistForm />
        </div>
      </section>

      {/* ── PRESENTE ──────────────────────────────── */}
      <section className="max-w-170 mx-auto px-5 pb-16">
        <div style={{ border: '2px solid #2B3DE8', borderRadius: 16, padding: '28px 32px', background: '#F7F8FF' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2B3DE8', marginBottom: 4 }}>🎁 PRESENTE PARA OS PRIMEIROS 50</p>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#0D1117', marginBottom: 4 }}>3 meses do Plano Premium</p>
          <p style={{ fontSize: 14, color: '#3A3D4A', marginBottom: 20 }}>Completamente gratuitos — sem cartão de crédito</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 20 }}>
            {[
              'Tutor IA ilimitado', 'Todos os editais',
              'Simulado adaptativo (IRT)', 'Upload de apostilas',
              'Raio-X do edital', 'Plano de estudo com IA',
            ].map(item => (
              <div key={item} style={{ fontSize: 13, color: '#3A3D4A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#2B3DE8', fontWeight: 700 }}>✓</span> {item}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#7A7D8A', borderTop: '1px solid rgba(43,61,232,0.15)', paddingTop: 16, margin: 0 }}>
            Valor do plano: <strong style={{ color: '#2B3DE8' }}>R$24,90/mês</strong> · 3 meses = R$74,70 · Seu custo: <strong style={{ color: '#2B3DE8' }}>R$0</strong>
          </p>
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────── */}
      <section style={{ background: '#F7F8FC', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-[860px] mx-auto px-5 py-16">
          <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 40 }}>Como funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PASSOS.map(p => (
              <div key={p.num} style={{ background: 'white', borderRadius: 12, padding: '24px 20px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#2B3DE8', opacity: 0.15, lineHeight: 1, marginBottom: 12 }}>{p.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{p.titulo}</h3>
                <p style={{ fontSize: 13, color: '#3A3D4A', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────── */}
      <section className="max-w-[860px] mx-auto px-5 py-16">
        <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
          Tudo que você precisa para passar
        </h2>
        <p style={{ fontSize: 15, color: '#3A3D4A', textAlign: 'center', marginBottom: 40 }}>
          O caminho para a posse mais curto e mais inteligente.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.titulo} style={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '20px', background: 'white' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B3DE8', marginBottom: 12 }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{f.titulo}</h3>
              <p style={{ fontSize: 13, color: '#7A7D8A', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── URGÊNCIA + 2º CTA ─────────────────────── */}
      <section style={{ background: '#0D1117', padding: '64px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2B3DE8', letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' }}>
            Oferta de lançamento
          </p>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, color: 'white', marginBottom: 16, letterSpacing: -0.5 }}>
            Os 50 primeiros garantem<br />
            <span style={{ color: '#7B8DFF' }}>3 meses do Premium completamente grátis.</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 32, lineHeight: 1.7 }}>
            Sem mensalidade, sem cartão. Avisaremos quando o acesso abrir.
          </p>
          <a
            href="#cadastro"
            className="inline-block px-8 py-3.5 bg-white text-[#2B3DE8] font-bold text-[16px] rounded-xl hover:bg-[#EEF0FF] transition-colors"
          >
            Garantir minha vaga agora
          </a>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '28px 20px' }}>
        <div className="max-w-[860px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#2B3DE8' }}>O Tutor</span>
            <span style={{ fontSize: 12, color: '#7A7D8A' }}>· © 2026 · otutor.com.br · LGPD compliant</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="/privacidade" style={{ fontSize: 12, color: '#7A7D8A', textDecoration: 'none' }}>Privacidade</a>
            <a href="mailto:contato@otutor.com.br" style={{ fontSize: 12, color: '#7A7D8A', textDecoration: 'none' }}>Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
