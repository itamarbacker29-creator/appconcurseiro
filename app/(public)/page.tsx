import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormularioCadastro } from '@/components/landing/FormularioCadastro';
import { ContadorVivos } from '@/components/landing/ContadorVivos';
import { CardPresenteClient } from '@/components/landing/CardPresenteClient';
import { ReferralBanner } from '@/components/landing/ReferralBanner';

const MESES_PREMIO = 3;   // base — indicações sobem até 6 meses
const MESES_MAX    = 6;   // usado nas chamadas "até X meses"

export const metadata: Metadata = {
  title: 'O Tutor — Programa de beta testers',
  description: `O app que busca editais, monta simulados e diz exatamente o que estudar para a aprovação. Buscamos concurseiros para testar e dar feedback. Beta testers podem ganhar até ${MESES_MAX} meses do Premium grátis.`,
  openGraph: {
    title: 'O Tutor — Ajude a aprimorar o melhor app para concursos.',
    description: `Buscamos beta testers. Quem participar pode ganhar até ${MESES_MAX} meses do Plano Premium grátis. Sem cartão de crédito.`,
    url: 'https://otutor.com.br',
    siteName: 'O Tutor',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'O Tutor — Programa de beta testers',
    description: `Beta testers podem ganhar até ${MESES_MAX} meses do Premium grátis. Ajude a aprimorar o app.`,
  },
};

const FEATURES = [
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Editais automáticos',
    desc: 'Monitoramos os principais concursos — você recebe alertas com link de inscrição',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Simulado adaptativo (IRT)',
    desc: 'Questões no seu nível exato — o mesmo motor do ENEM, calibrado para bancas',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Plano de estudos diário',
    desc: 'Cronograma adaptado ao seu desempenho e à data da prova — atualizado automaticamente',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Tutor IA 24/7',
    desc: 'Tire dúvidas com base em lei e jurisprudência — referência no artigo, sem "achismos"',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Raio-X do desempenho',
    desc: 'Veja em que matérias você está abaixo dos aprovados e priorize onde importa',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Flashcards automáticos',
    desc: 'A cada questão errada duas vezes, O Tutor cria um flashcard para você revisar',
  },
];

const PASSOS_TESTE = [
  {
    num: '01',
    titulo: 'Cadastre-se na lista',
    desc: 'Deixe seu e-mail e concurso de interesse. Liberamos o acesso em ondas, começando pelos primeiros cadastrados.',
  },
  {
    num: '02',
    titulo: 'Use o app e dê feedback',
    desc: 'Faça simulados, explore os editais, use o tutor IA. Nos conte o que funciona, o que trava e o que está faltando.',
  },
  {
    num: '03',
    titulo: 'Ganhe até 6 meses do Premium grátis',
    desc: `Beta testers ativos ganham ${MESES_PREMIO} meses do Plano Premium. Indique amigos e acumule até ${MESES_MAX} meses — tudo sem pagar nada.`,
  },
];

const PASSOS = [
  { num: '01', titulo: 'Edital chega até você', desc: 'Monitoramos 10+ fontes automaticamente. Quando sair um edital no seu perfil, você recebe uma notificação com link de inscrição.' },
  { num: '02', titulo: 'Simulado feito para você', desc: 'Nossa IA usa o mesmo motor do ENEM (IRT) para criar questões no seu nível e explicar cada erro com base em lei e doutrina.' },
  { num: '03', titulo: 'Plano que te leva à aprovação', desc: 'Com base no seu desempenho e na data da prova, O Tutor monta um cronograma diário. Você só precisa seguir.' },
];

const PARA_QUEM = [
  'Quer um guia de estudos focado — que aponte exatamente o que estudar para a aprovação, sem desperdiçar tempo com o que não cai na prova',
  'Trabalha durante o dia e precisa de um plano inteligente que se encaixe na sua rotina e maximize cada hora de estudo',
  'Não quer pagar R$200/mês em cursinho e quer resultado de verdade pelo seu esforço',
  'Já tentou mais de uma vez e quer uma preparação mais estratégica e direcionada ao seu edital',
  'Busca aprovação no INSS, PRF, Tribunais, Polícia Civil ou Receita Federal',
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: '-apple-system, "Segoe UI", sans-serif', color: '#0D1117' }}>

      <Suspense fallback={null}>
        <ReferralBanner />
      </Suspense>

      {/* ── HERO ──────────────────────────────────── */}
      <section className="max-w-170 mx-auto px-5 pt-16 pb-10 flex flex-col items-center text-center gap-5">

        {/* Badge beta */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[12px] font-semibold text-amber-700">
            🧪 Versão beta — buscamos beta testers voluntários
          </span>
        </div>

        {/* Logo */}
        <div style={{ fontSize: 26, fontWeight: 900, color: '#2B3DE8', letterSpacing: '-0.5px' }}>O Tutor</div>

        {/* H1 */}
        <h1 style={{ fontSize: 'clamp(34px, 6vw, 54px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1, margin: 0 }}>
          Pare de estudar o que não cai.<br />
          <span style={{ color: '#2B3DE8' }}>Comece a estudar o que aprova.</span>
        </h1>

        {/* Subtítulo */}
        <p style={{ fontSize: 18, color: '#3A3D4A', lineHeight: 1.7, maxWidth: 500, margin: 0 }}>
          O app que busca os editais pra você, monta seu simulado e te diz
          exatamente o que estudar até o dia da prova.
        </p>

        {/* Aviso de beta */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 20px', maxWidth: 480, width: '100%' }}>
          <p style={{ fontSize: 14, color: '#92400E', lineHeight: 1.6, margin: 0 }}>
            <strong>O Tutor está em desenvolvimento ativo.</strong> Buscamos concurseiros reais para usar o app, reportar problemas e sugerir melhorias.
            Quem participar dos testes pode ganhar <strong>até {MESES_MAX} meses do Plano Premium completamente grátis.</strong>
          </p>
        </div>

        {/* Formulário */}
        <div id="cadastro" className="w-full mt-2">
          <Suspense fallback={null}>
            <FormularioCadastro origem="hero" />
          </Suspense>
          <ContadorVivos />
        </div>
      </section>

      {/* ── CARD PROGRAMA DE TESTADORES ── */}
      <section className="max-w-170 mx-auto px-5 pb-14">
        <CardPresenteClient mesesPremio={MESES_PREMIO} />
      </section>

      {/* ── COMO FUNCIONA O PROGRAMA DE TESTES ────── */}
      <section style={{ background: '#F7F8FC', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-[900px] mx-auto px-5 py-16">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#2B3DE8', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>
            Programa de beta testers
          </p>
          <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
            Como funciona
          </h2>
          <p style={{ fontSize: 15, color: '#3A3D4A', textAlign: 'center', marginBottom: 40 }}>
            Simples e sem compromisso. Teste quando puder, nos conte o que achou.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PASSOS_TESTE.map(p => (
              <div key={p.num} style={{ background: 'white', borderRadius: 12, padding: '24px 20px', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#2B3DE8', opacity: 0.15, lineHeight: 1, marginBottom: 12 }}>{p.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{p.titulo}</h3>
                <p style={{ fontSize: 13, color: '#3A3D4A', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PARA QUEM É ───────────────────────────── */}
      <section>
        <div className="max-w-[640px] mx-auto px-5 py-16">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#2B3DE8', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12 }}>
            Identificação
          </p>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 32, lineHeight: 1.2 }}>
            O Tutor é pra você que...
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PARA_QUEM.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, background: '#F7F8FC', borderRadius: 12, padding: '16px 20px', border: '1px solid #EEEEF6' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E4F7F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: '#006c4a', fontSize: 13, fontWeight: 700 }}>✓</span>
                </div>
                <p style={{ fontSize: 15, color: '#3A3D4A', lineHeight: 1.5, margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, padding: '16px 20px', background: '#EEF0FF', borderRadius: 12, border: '1px solid rgba(43,61,232,0.15)', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#3A3D4A', lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: '#2B3DE8' }}>Motor IRT</strong>
              {' '}— o mesmo sistema de questões adaptativas usado no ENEM —
              calibrado para as principais bancas brasileiras: CESPE, FGV, VUNESP e mais.
            </p>
          </div>
        </div>
      </section>

      {/* ── O QUE O APP FAZ ─────────────────────────── */}
      <section style={{ background: '#F7F8FC', borderTop: '1px solid rgba(0,0,0,0.06)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-[900px] mx-auto px-5 py-16">
          <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 8 }}>
            O que você vai testar
          </h2>
          <p style={{ fontSize: 15, color: '#3A3D4A', textAlign: 'center', marginBottom: 40 }}>
            Funcionalidades já disponíveis na versão beta.
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
        </div>
      </section>

      {/* ── COMO O APP FUNCIONA (jornada do usuário) ─── */}
      <section className="max-w-[900px] mx-auto px-5 py-16">
        <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 40 }}>Como o app funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PASSOS.map(p => (
            <div key={p.num} style={{ background: '#F7F8FC', borderRadius: 12, padding: '24px 20px', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#2B3DE8', opacity: 0.15, lineHeight: 1, marginBottom: 12 }}>{p.num}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{p.titulo}</h3>
              <p style={{ fontSize: 13, color: '#3A3D4A', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLANOS E PREÇOS ──────────────────────── */}
      <section style={{ background: '#F7F8FC', padding: '80px 20px' }} id="planos">
        <div className="max-w-[900px] mx-auto">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#F97316', letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center', marginBottom: 12 }}>Planos e Preços</p>
          <h2 style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#17375E', textAlign: 'center', marginBottom: 8 }}>Escolha o plano ideal para sua aprovação</h2>
          <p style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 48 }}>Todos os planos com acesso aos editais. Sem contrato, cancele quando quiser.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Free */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Grátis</p>
              <p style={{ fontSize: 36, fontWeight: 900, color: '#17375E', marginBottom: 4, lineHeight: 1 }}>R$ 0</p>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>Para começar</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Todos os editais, sem limite',
                  '5 simulados completos por mês',
                  '1 pergunta ao Tutor IA por dia',
                  'Diagnóstico de desempenho por matéria',
                  '1 Raio-X de edital por mês',
                  '1 PDF → até 5 flashcards por mês',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151' }}>
                    <span style={{ color: '#10B981', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#cadastro" style={{ display: 'block', textAlign: 'center', background: '#F3F4F6', color: '#374151', fontWeight: 700, fontSize: 14, padding: '12px 0', borderRadius: 10, textDecoration: 'none' }}>
                Começar grátis
              </a>
            </div>

            {/* Premium */}
            <div style={{ background: '#17375E', borderRadius: 16, border: '2px solid #17375E', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#F97316', color: '#fff', fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 20, whiteSpace: 'nowrap', letterSpacing: 0.5 }}>
                MAIS POPULAR
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Premium</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>R$ 19,90</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>/mês</p>
              </div>
              <p style={{ fontSize: 12, color: '#F97316', fontWeight: 700, marginBottom: 20 }}>Anual com 25% de desconto</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Todos os editais, sem limite',
                  'Simulados ilimitados',
                  'Tutor IA 24/7 — 30 mensagens/mês',
                  'Plano de estudo personalizado',
                  'Raio-X do edital ilimitado',
                  'Upload de 5 PDFs/mês → flashcards',
                  'Marca-texto em apostilas',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                    <span style={{ color: '#34D399', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#cadastro" style={{ display: 'block', textAlign: 'center', background: '#F97316', color: '#fff', fontWeight: 800, fontSize: 14, padding: '12px 0', borderRadius: 10, textDecoration: 'none' }}>
                Assinar Premium
              </a>
            </div>

            {/* Elite */}
            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E5E7EB', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Elite</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>
                <p style={{ fontSize: 36, fontWeight: 900, color: '#17375E', lineHeight: 1 }}>R$ 29,90</p>
                <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 4 }}>/mês</p>
              </div>
              <p style={{ fontSize: 12, color: '#0D9488', fontWeight: 700, marginBottom: 20 }}>Anual com 25% de desconto</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Tudo do Premium',
                  'Tutor IA 24/7 ilimitado',
                  'Plano de estudo por edital específico',
                  'Recomendação personalizada de concursos',
                  'Upload ilimitado de PDFs → flashcards',
                  'Análise de chance de aprovação em tempo real',
                  'Alertas prioritários de editais',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#374151' }}>
                    <span style={{ color: '#0D9488', fontWeight: 700, flexShrink: 0 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <a href="#cadastro" style={{ display: 'block', textAlign: 'center', background: '#0D9488', color: '#fff', fontWeight: 700, fontSize: 14, padding: '12px 0', borderRadius: 10, textDecoration: 'none' }}>
                Assinar Elite
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* ── SEGUNDO FORMULÁRIO (FUNDO ESCURO) ────── */}
      <section style={{ background: '#0D1117', padding: '80px 20px' }} id="cadastro-final">
        <div className="max-w-[520px] mx-auto text-center">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
            Programa de beta testers
          </p>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900, color: 'white', marginBottom: 12, letterSpacing: -0.5, lineHeight: 1.2 }}>
            Ajude a aprimorar o app.<br />
            <span style={{ color: '#5B6BFF' }}>Ganhe até {MESES_MAX} meses do Premium grátis.</span>
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 32, lineHeight: 1.7 }}>
            Sem mensalidade, sem cartão. Use o app, dê seu feedback e receba o prêmio quando abrirmos o acesso.
          </p>
          <ContadorVivos tema="dark" mostrarBarra />
          <div className="mt-6">
            <Suspense fallback={null}>
              <FormularioCadastro origem="footer" tema="dark" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '28px 20px' }}>
        <div className="max-w-[900px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#2B3DE8' }}>O Tutor</span>
            <span style={{ fontSize: 12, color: '#7A7D8A' }}>· © 2026 · otutor.com.br · LGPD compliant</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="/privacidade" style={{ fontSize: 12, color: '#7A7D8A', textDecoration: 'none' }}>Política de Privacidade</a>
            <a href="/termos" style={{ fontSize: 12, color: '#7A7D8A', textDecoration: 'none' }}>Termos de Uso</a>
            <a href="mailto:contato@otutor.com.br" style={{ fontSize: 12, color: '#7A7D8A', textDecoration: 'none' }}>Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
