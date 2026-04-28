import type { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase-server';
import { SectionPlanos } from './SectionPlanos';

export const metadata: Metadata = {
  title: 'O Tutor — Estude para concursos com inteligência artificial',
  description: 'O Tutor organiza editais, monta simulados adaptativos, cria seu plano de estudos personalizado e tira suas dúvidas com o Tutor IA 24/7.',
  robots: 'noindex',
};

// ── Dados estáticos ───────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '📋',
    titulo: 'Editais em tempo real',
    desc: 'Monitore concursos do seu perfil automaticamente. Receba alertas de novos editais por área, banca e cargo. Nunca perca uma inscrição.',
  },
  {
    icon: '🧠',
    titulo: 'Simulados adaptativos',
    desc: 'Questões calibradas ao seu nível em tempo real com Teoria de Resposta ao Item (IRT). O sistema avalia sua chance de aprovação e se adapta conforme você evolui.',
  },
  {
    icon: '📅',
    titulo: 'Plano de estudo por IA',
    desc: 'A IA analisa seu desempenho e o edital do seu concurso para gerar um cronograma semanal — adaptado à sua rotina e ao seu formato favorito: podcasts, YouTube, leitura ou apostilas.',
  },
  {
    icon: '✨',
    titulo: 'Tutor IA 24/7',
    desc: 'Tire dúvidas sobre qualquer matéria a qualquer hora. O Tutor explica conceitos, resolve questões com você e cita a legislação de referência — disponível 24 horas por dia, 7 dias por semana.',
  },
  {
    icon: '📚',
    titulo: 'Apostilas inteligentes',
    desc: 'Faça upload do seu material em PDF. Use o marca-texto para realçar o que importa, baixe o PDF anotado e gere flashcards com IA de qualquer trecho.',
  },
  {
    icon: '📊',
    titulo: 'Chance de aprovação em tempo real',
    desc: 'Acompanhe sua probabilidade de aprovação com base nos simulados. Receba recomendações qualificadas por banca organizadora e saiba exatamente onde focar.',
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
    desc: 'Com base no edital e no seu desempenho, O Tutor gera um cronograma semanal adaptado à sua rotina e ao seu formato de estudo preferido — podcast, YouTube, leitura ou apostilas.',
  },
  {
    num: '03',
    titulo: 'Estude, revise e evolua',
    desc: 'Faça simulados adaptativos, use o Tutor IA 24/7 para dúvidas, marque apostilas e acompanhe sua chance de aprovação no painel. O sistema se adapta conforme você melhora.',
  },
];

const FAQS = [
  {
    q: 'Posso cancelar quando quiser?',
    a: 'Sim. Não há fidelidade. Você cancela a qualquer momento pelo painel da sua conta e continua com acesso até o fim do período pago.',
  },
  {
    q: 'As questões dos simulados são de provas reais?',
    a: 'Sim. Nossa base inclui questões de provas oficiais das principais bancas (CESPE, FGV, FCC, VUNESP e outras). A IA prioriza questões reais e complementa com questões geradas quando necessário.',
  },
  {
    q: 'O plano de estudo funciona para qualquer concurso?',
    a: 'Funciona para a maioria dos concursos federais, estaduais e municipais. No plano Elite, o cronograma é gerado a partir do edital específico do seu concurso, com os pesos de cada matéria e adaptado ao seu formato preferido de estudo.',
  },
  {
    q: 'Posso usar no celular?',
    a: 'Sim. A plataforma é responsiva e funciona bem no celular, com navegação otimizada para mobile. Aplicativo nativo está em desenvolvimento.',
  },
  {
    q: 'Como funciona O Tutor?',
    a: 'O Tutor é uma plataforma completa de preparação para concursos públicos. Ela monitora editais, gera simulados adaptativos calibrados à sua banca, monta um plano de estudos semanal personalizado, avalia sua chance de aprovação com base nos resultados e oferece um assistente de IA disponível 24/7 para tirar dúvidas sobre qualquer matéria. Tudo em um único ambiente integrado.',
  },
];

// ── Tipos ────────────────────────────────────────────────────────────

interface EditalTop {
  id: string;
  orgao: string;
  cargo: string;
  salario: number;
  vagas: number | null;
  banca: string | null;
  data_fim_inscricao: string | null;
  status: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatBRL(valor: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(valor);
}

// ── Page ─────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Busca os 6 maiores salários — falha silenciosa se DB indisponível
  let topEditais: EditalTop[] = [];
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('editais')
      .select('id, orgao, cargo, salario, vagas, banca, data_fim_inscricao, status')
      .in('status', ['ativo', 'previsto'])
      .not('salario', 'is', null)
      .order('salario', { ascending: false })
      .limit(6);
    topEditais = (data ?? []) as EditalTop[];
  } catch {
    // seção não aparece se DB falhar
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── Nav ────────────────────────────────────────────────── */}
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
            <Link
              href="/login"
              className="px-4 py-2 bg-[#17375E] text-[14px] font-bold rounded-xl hover:bg-[#0F2540] transition-colors"
              style={{ color: '#ffffff' }}
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F4F1DA] via-white to-white pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#17375E]/5 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FF8400]/8 rounded-full translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 md:px-8">
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
              O Tutor organiza editais, monta simulados adaptativos, cria seu plano de estudos personalizado
              e tira suas dúvidas com o Tutor IA 24/7. Tudo em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#17375E] text-[16px] font-bold rounded-2xl hover:bg-[#0F2540] transition-all hover:scale-[1.02] shadow-lg shadow-[#17375E]/20"
                style={{ color: '#ffffff' }}
              >
                Começar grátis — sem cartão
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <a href="#planos"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#17375E] text-[16px] font-bold rounded-2xl border-2 border-[#17375E]/20 hover:border-[#17375E]/40 transition-colors">
                Ver planos a partir de R$19,90
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 mt-14 pt-10 border-t border-gray-200">
            {[
              { n: '+500', label: 'editais monitorados' },
              { n: '+10k', label: 'questões na base' },
              { n: '100%', label: 'adaptativo por IA' },
              { n: '24/7', label: 'tutor disponível' },
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

      {/* ── Features ───────────────────────────────────────────── */}
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
                className="p-6 rounded-2xl border border-gray-100 hover:border-[#17375E]/20 hover:shadow-lg transition-all duration-200">
                <div className="text-[36px] mb-4">{f.icon}</div>
                <h3 className="text-[17px] font-bold text-[#17375E] mb-2">{f.titulo}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
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
                  <div className="w-16 h-16 rounded-2xl bg-[#17375E] flex items-center justify-center text-[22px] font-black mb-5"
                    style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)', color: '#ffffff' }}>
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

      {/* ── Maiores salários ───────────────────────────────────── */}
      {topEditais.length > 0 && (
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10">
              <span className="text-[#FF8400] text-[12px] font-bold uppercase tracking-widest">
                Oportunidades em aberto
              </span>
              <h2 className="text-[28px] md:text-[36px] font-black text-[#17375E] mt-2 mb-3"
                style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
                Os concursos com maiores salários agora
              </h2>
              <p className="text-[14px] text-gray-500 max-w-lg mx-auto">
                Monitore automaticamente todos esses concursos e receba alertas assim que as inscrições abrirem.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topEditais.map((edital, i) => (
                <div key={edital.id}
                  className="group bg-white rounded-xl p-5 border border-gray-100 hover:border-[#17375E]/30 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black text-gray-400">#{i + 1}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      edital.status === 'ativo'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {edital.status === 'ativo' ? 'Inscrições abertas' : 'Previsto'}
                    </span>
                  </div>

                  <p className="text-[11px] font-bold text-[#FF8400] uppercase tracking-widest mb-0.5 truncate">
                    {edital.orgao}
                  </p>
                  <h3 className="text-[15px] font-bold text-[#17375E] mb-3 leading-snug line-clamp-2">
                    {edital.cargo}
                  </h3>

                  <div className="bg-[#F4F1DA]/60 rounded-lg px-3 py-2 mb-3">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Salário</p>
                    <p className="text-[20px] font-black text-green-600"
                      style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)' }}>
                      {formatBRL(edital.salario)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-gray-400">
                    <span>{edital.vagas?.toLocaleString('pt-BR') ?? '—'} vagas</span>
                    <span>{edital.banca ?? '—'}</span>
                  </div>

                  <Link
                    href="/login"
                    className="mt-4 block w-full py-2.5 text-center text-[12px] font-bold text-[#17375E] border border-[#17375E]/20 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#F4F1DA] transition-all"
                  >
                    Monitorar este concurso →
                  </Link>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/login" className="text-[14px] font-semibold text-[#17375E] hover:underline">
                Ver todos os editais monitorados →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Planos (client component com toggle) ───────────────── */}
      <SectionPlanos />

      {/* ── FAQ ────────────────────────────────────────────────── */}
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

      {/* ── CTA Final ──────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-[#17375E] relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#FF8400]/15 rounded-full translate-y-1/2" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-[36px] md:text-[48px] font-black leading-tight mb-6"
            style={{ fontFamily: 'var(--font-montserrat, Montserrat, sans-serif)', color: '#ffffff' }}>
            Sua aprovação começa hoje.
          </h2>
          <p className="text-[18px] text-white/70 mb-10 max-w-xl mx-auto">
            Mais de 500 editais monitorados, simulados adaptativos e um plano de estudos feito para você.
            Comece gratuitamente — sem cartão de crédito.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-10 py-5 bg-[#FF8400] text-[17px] font-black rounded-2xl hover:bg-[#e67700] transition-all hover:scale-[1.02] shadow-xl"
            style={{ color: '#ffffff' }}
          >
            Criar conta grátis agora
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <p className="text-white/40 text-[13px] mt-5">Sem compromisso · Cancele quando quiser</p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
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
        <div className="max-w-6xl mx-auto px-4 md:px-8 mt-6 pt-6 border-t border-gray-100">
          <p className="text-[11px] text-gray-300 text-center leading-relaxed max-w-3xl mx-auto">
            O Tutor é uma plataforma de organização e inteligência de estudos. Não oferece garantia de aprovação em concursos públicos,
            nem fornece conteúdo didático próprio, aulas, apostilas ou material de ensino.
            O desempenho depende exclusivamente do esforço e dedicação do candidato.
          </p>
        </div>
      </footer>

    </div>
  );
}
