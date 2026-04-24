import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'O Tutor — Estude para concursos com inteligência artificial',
  description: 'O Tutor organiza editais, monta simulados adaptativos, cria seu plano de estudos personalizado e tira suas dúvidas 24h. Tudo que você precisa para a aprovação.',
  robots: 'noindex', // não indexar enquanto beta
};

// ── Dados ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '📋',
    titulo: 'Editais em tempo real',
    desc: 'Monitore concursos do seu perfil automaticamente. Receba alertas de novos editais por área, banca e cargo. Nunca perca uma inscrição.',
  },
  {
    icon: '🧠',
    titulo: 'Simulados adaptativos',
    desc: 'Questões calibradas ao seu nível em tempo real com Teoria de Resposta ao Item (IRT). Quanto mais você erra, mais o sistema te desafia no ponto certo.',
  },
  {
    icon: '📅',
    titulo: 'Plano de estudo por IA',
    desc: 'A IA analisa seu desempenho, o edital do seu concurso e gera um cronograma semanal personalizado. Sabe exatamente o que estudar e quando.',
  },
  {
    icon: '✨',
    titulo: 'Tutor IA 24 horas',
    desc: 'Tire dúvidas sobre qualquer matéria a qualquer hora. O tutor explica conceitos, resolve questões com você e cita a legislação de referência.',
  },
  {
    icon: '📚',
    titulo: 'Apostilas inteligentes',
    desc: 'Faça upload do seu material em PDF. Use o marca-texto para realçar o que importa e baixe o PDF anotado. Gere flashcards com IA de qualquer trecho.',
  },
  {
    icon: '📊',
    titulo: 'Painel de desempenho',
    desc: 'Evolução por matéria, ranking de prioridades e progresso rumo à meta de aprovação. Visualize exatamente onde focar esforço para passar mais rápido.',
  },
];

const STEPS = [
  {
    num: '01',
    titulo: 'Cadastre-se e defina seu concurso',
    desc: 'Em 2 minutos você cria sua conta, seleciona os editais do seu interesse e informa seu nível de conhecimento em cada matéria.',
  },
  {
    num: '02',
    titulo: 'A IA monta seu plano',
    desc: 'Com base no edital e no seu desempenho nos primeiros simulados, o Tutor gera um cronograma semanal com horas por matéria e metas diárias.',
  },
  {
    num: '03',
    titulo: 'Estude, revise e evolua',
    desc: 'Faça simulados adaptativos, use o tutor para dúvidas, marque apostilas e acompanhe sua evolução no painel. O sistema se adapta conforme você melhora.',
  },
];

const PLANOS = [
  {
    id: 'free',
    nome: 'Free',
    preco: 'Grátis',
    periodo: 'para sempre',
    desc: 'Para conhecer a plataforma e dar os primeiros passos.',
    cta: 'Começar grátis',
    ctaHref: '/login',
    destaque: false,
    cor: 'border-(--border)',
    items: [
      { ok: true,  txt: 'Editais ilimitados' },
      { ok: true,  txt: '5 simulados por mês' },
      { ok: true,  txt: 'Plano de estudo básico' },
      { ok: true,  txt: 'Desempenho por matéria' },
      { ok: false, txt: 'Tutor IA' },
      { ok: false, txt: 'Apostilas com marca-texto' },
      { ok: false, txt: 'Flashcards com IA' },
      { ok: false, txt: 'Plano por edital (Elite)' },
    ],
  },
  {
    id: 'premium',
    nome: 'Premium',
    preco: 'R$ 29',
    periodo: 'por mês',
    desc: 'Para o concurseiro que quer acelerar os resultados com IA.',
    cta: 'Assinar Premium',
    ctaHref: '/login',
    destaque: true,
    cor: 'border-brand-navy',
    items: [
      { ok: true, txt: 'Editais ilimitados' },
      { ok: true, txt: '30 simulados por mês' },
      { ok: true, txt: 'Plano de estudo personalizado' },
      { ok: true, txt: 'Desempenho por matéria' },
      { ok: true, txt: 'Tutor IA (50 msg/mês)' },
      { ok: true, txt: 'Apostilas com marca-texto' },
      { ok: true, txt: 'Flashcards com IA' },
      { ok: false, txt: 'Plano por edital (Elite)' },
    ],
  },
  {
    id: 'elite',
    nome: 'Elite',
    preco: 'R$ 49',
    periodo: 'por mês',
    desc: 'Para quem quer aprovação com o máximo de recursos e sem limites.',
    cta: 'Assinar Elite',
    ctaHref: '/login',
    destaque: false,
    cor: 'border-brand-orange',
    items: [
      { ok: true, txt: 'Editais ilimitados' },
      { ok: true, txt: 'Simulados ilimitados' },
      { ok: true, txt: 'Plano de estudo personalizado' },
      { ok: true, txt: 'Desempenho por matéria' },
      { ok: true, txt: 'Tutor IA ilimitado' },
      { ok: true, txt: 'Apostilas com marca-texto' },
      { ok: true, txt: 'Flashcards com IA' },
      { ok: true, txt: 'Plano por edital exclusivo' },
    ],
  },
];

const FAQS = [
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Não há fidelidade. Você cancela a qualquer momento pelo painel da sua conta e continua com acesso até o fim do período pago.',
  },
  {
    q: 'As questões dos simulados são de provas reais?',
    a: 'Sim. Nossa base inclui questões de provas oficiais das principais bancas (CESPE, FGV, FCC, VUNESP e outras). A IA prioriza questões reais e completa com questões geradas quando necessário.',
  },
  {
    q: 'O plano de estudo funciona para qualquer concurso?',
    a: 'Funciona para a maioria dos concursos federais, estaduais e municipais. No plano Elite, o cronograma é gerado a partir do edital específico do seu concurso, com os pesos de cada matéria.',
  },
  {
    q: 'Posso usar no celular?',
    a: 'Sim. A plataforma é responsiva e funciona bem no celular, com navegação otimizada para mobile. Aplicativo nativo está em desenvolvimento.',
  },
  {
    q: 'Como funciona o tutor IA?',
    a: 'É um chat integrado onde você pode perguntar qualquer coisa sobre as matérias do seu concurso. O tutor explica conceitos, resolve questões passo a passo e cita as referências legais relevantes.',
  },
];

// ── Componentes internos ───────────────────────────────────────────────

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg className="w-4 h-4 text-green-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Nav ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2">
            <img src="/logo.png" alt="O Tutor" width={32} height={32} className="rounded-xl" />
            <span className="font-black text-[17px] tracking-tight text-[#17375E]"
              style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
              O Tutor
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-gray-600">
            <a href="#funcionalidades" className="hover:text-[#17375E] transition-colors">Funcionalidades</a>
            <a href="#como-funciona" className="hover:text-[#17375E] transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-[#17375E] transition-colors">Planos</a>
            <a href="#faq" className="hover:text-[#17375E] transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[14px] font-semibold text-[#17375E] hover:opacity-70 transition-opacity hidden sm:block">
              Entrar
            </Link>
            <Link href="/login"
              className="px-4 py-2 bg-[#17375E] text-white text-[14px] font-bold rounded-xl hover:bg-[#0F2540] transition-colors">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F4F1DA] via-white to-white pt-20 pb-24 md:pt-28 md:pb-32">
        {/* Decorative blob */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#17375E]/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF8400]/8 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 md:px-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#17375E]/8 text-[#17375E] text-[12px] font-bold px-3 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Plataforma em operação · Beta aberto
          </div>

          <div className="max-w-3xl">
            <h1 className="text-[40px] md:text-[56px] font-black leading-[1.1] text-[#17375E] mb-6"
              style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
              Estude para concursos com{' '}
              <span className="text-[#FF8400]">inteligência artificial</span>
            </h1>
            <p className="text-[18px] md:text-[20px] text-gray-600 leading-relaxed mb-8 max-w-2xl">
              O Tutor organiza editais, monta simulados adaptativos, cria seu plano de estudos personalizado e tira suas dúvidas 24h.
              Tudo que você precisa para a aprovação em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#17375E] text-white text-[16px] font-bold rounded-2xl hover:bg-[#0F2540] transition-all hover:scale-[1.02] shadow-lg shadow-[#17375E]/20">
                Começar grátis — sem cartão
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <a href="#planos"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#17375E] text-[16px] font-bold rounded-2xl border-2 border-[#17375E]/20 hover:border-[#17375E]/40 transition-colors">
                Ver planos e preços
              </a>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-8 mt-14 pt-10 border-t border-gray-200">
            {[
              { n: '+500', label: 'editais monitorados' },
              { n: '+10k', label: 'questões na base' },
              { n: '100%', label: 'adaptativo por IA' },
              { n: '24h', label: 'tutor disponível' },
            ].map(s => (
              <div key={s.n}>
                <p className="text-[28px] font-black text-[#17375E]"
                  style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>{s.n}</p>
                <p className="text-[13px] text-gray-500 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section id="funcionalidades" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-[#FF8400] text-[13px] font-bold uppercase tracking-widest mb-3">Funcionalidades</p>
            <h2 className="text-[32px] md:text-[40px] font-black text-[#17375E] leading-tight"
              style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
              Tudo que você precisa para passar
            </h2>
            <p className="text-[17px] text-gray-500 mt-4 max-w-xl mx-auto">
              Da busca de editais até a revisão final — uma plataforma completa que aprende com você.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.titulo}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-[#17375E]/20 hover:shadow-lg transition-all duration-200 bg-white">
                <div className="text-[36px] mb-4">{f.icon}</div>
                <h3 className="text-[17px] font-bold text-[#17375E] mb-2">{f.titulo}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section id="como-funciona" className="py-20 md:py-28 bg-[#F4F1DA]/40">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-[#FF8400] text-[13px] font-bold uppercase tracking-widest mb-3">Como funciona</p>
            <h2 className="text-[32px] md:text-[40px] font-black text-[#17375E] leading-tight"
              style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
              Aprovação em 3 passos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-[#17375E]/20 to-transparent -translate-x-4 z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-[#17375E] text-white flex items-center justify-center text-[22px] font-black mb-5"
                    style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
                    {s.num}
                  </div>
                  <h3 className="text-[18px] font-bold text-[#17375E] mb-3">{s.titulo}</h3>
                  <p className="text-[14px] text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section id="planos" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-[#FF8400] text-[13px] font-bold uppercase tracking-widest mb-3">Planos e preços</p>
            <h2 className="text-[32px] md:text-[40px] font-black text-[#17375E] leading-tight"
              style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
              Simples, transparente, sem surpresas
            </h2>
            <p className="text-[17px] text-gray-500 mt-4">
              Cancele quando quiser. Sem fidelidade, sem taxa de cancelamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANOS.map(p => (
              <div key={p.id}
                className={`relative rounded-2xl border-2 p-7 flex flex-col gap-6 transition-all ${p.destaque
                  ? 'border-[#17375E] shadow-2xl shadow-[#17375E]/10 scale-[1.02]'
                  : p.id === 'elite' ? 'border-[#FF8400]' : 'border-gray-200'
                }`}>
                {p.destaque && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#17375E] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
                    Mais popular
                  </div>
                )}
                {p.id === 'elite' && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FF8400] text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wide whitespace-nowrap">
                    Aprovação garantida
                  </div>
                )}

                <div>
                  <p className="text-[13px] font-bold text-gray-400 uppercase tracking-widest mb-1">{p.nome}</p>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-[40px] font-black text-[#17375E]"
                      style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>{p.preco}</span>
                    <span className="text-[14px] text-gray-400 mb-2">{p.periodo}</span>
                  </div>
                  <p className="text-[13px] text-gray-500">{p.desc}</p>
                </div>

                <Link href={p.ctaHref}
                  className={`w-full py-3 rounded-xl text-[14px] font-bold text-center transition-all ${p.destaque
                    ? 'bg-[#17375E] text-white hover:bg-[#0F2540]'
                    : p.id === 'elite'
                      ? 'bg-[#FF8400] text-white hover:opacity-90'
                      : 'bg-gray-100 text-[#17375E] hover:bg-gray-200'
                  }`}>
                  {p.cta}
                </Link>

                <ul className="flex flex-col gap-2.5">
                  {p.items.map(item => (
                    <li key={item.txt} className="flex items-start gap-2.5">
                      <Check ok={item.ok} />
                      <span className={`text-[13px] leading-snug ${item.ok ? 'text-gray-700' : 'text-gray-300'}`}>
                        {item.txt}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-center text-[13px] text-gray-400 mt-8">
            Todos os planos incluem acesso completo ao dashboard, editais e desempenho.
            Planos pagos com IA Claude Haiku — mais preciso e com referências legais.
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" className="py-20 md:py-28 bg-[#F4F1DA]/40">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <div className="text-center mb-14">
            <p className="text-[#FF8400] text-[13px] font-bold uppercase tracking-widest mb-3">FAQ</p>
            <h2 className="text-[32px] md:text-[40px] font-black text-[#17375E] leading-tight"
              style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
              Perguntas frequentes
            </h2>
          </div>

          <div className="flex flex-col gap-4">
            {FAQS.map(f => (
              <div key={f.q} className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-[16px] font-bold text-[#17375E] mb-2">{f.q}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ─────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#17375E] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#FF8400]/15 rounded-full translate-y-1/2" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-[36px] md:text-[48px] font-black text-white leading-tight mb-6"
            style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
            Sua aprovação começa hoje.
          </h2>
          <p className="text-[18px] text-white/70 mb-10 max-w-xl mx-auto">
            Mais de 500 editais monitorados, simulados adaptativos e um plano de estudos feito para você.
            Comece gratuitamente — sem cartão de crédito.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-3 px-10 py-5 bg-[#FF8400] text-white text-[17px] font-black rounded-2xl hover:bg-[#e67700] transition-all hover:scale-[1.02] shadow-xl shadow-[#FF8400]/30">
            Criar conta grátis agora
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <p className="text-white/40 text-[13px] mt-5">Sem compromisso · Cancele quando quiser</p>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="O Tutor" width={24} height={24} className="rounded-lg" />
            <span className="text-[14px] font-black text-[#17375E]"
              style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>O Tutor</span>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-gray-400">
            <Link href="/termos" className="hover:text-[#17375E] transition-colors">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-[#17375E] transition-colors">Privacidade</Link>
            <Link href="/login" className="hover:text-[#17375E] transition-colors">Entrar</Link>
          </div>
          <p className="text-[12px] text-gray-300">© 2026 O Tutor. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}
