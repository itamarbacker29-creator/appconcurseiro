import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FormularioCadastro } from '@/components/landing/FormularioCadastro';
import { ContadorVivos } from '@/components/landing/ContadorVivos';
import { CardPresenteClient } from '@/components/landing/CardPresenteClient';
import { ReferralBanner } from '@/components/landing/ReferralBanner';

const MESES_PREMIO = 3; // altere aqui para mudar em toda a landing

export const metadata: Metadata = {
  title: 'O Tutor — Programa de testadores beta',
  description: `O app que busca editais, monta simulados e te diz o que estudar até o dia da prova. Estamos buscando concurseiros para testar e dar feedback. Testadores ganham ${MESES_PREMIO} meses do Premium grátis.`,
  openGraph: {
    title: 'O Tutor — Ajude a construir o melhor app para concursos.',
    description: `Buscamos testadores beta. Quem participar ganha ${MESES_PREMIO} meses do Plano Premium grátis. Sem cartão de crédito.`,
    url: 'https://otutor.com.br',
    siteName: 'O Tutor',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'O Tutor — Programa de testadores beta',
    description: `Testadores ganham ${MESES_PREMIO} meses do Premium grátis. Ajude a moldar o app.`,
  },
};

const FEATURES = [
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Editais automáticos',
    desc: 'Sem buscar, sem perder prazo',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'IA adaptativa (IRT)',
    desc: 'Questão certa para o seu nível agora',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Raio-X do edital',
    desc: 'Saiba o que mais cai na sua prova',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Tutor IA 24/7',
    desc: 'Tire dúvidas sobre qualquer questão',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Apostilas em flashcards',
    desc: 'Envie seu PDF, receba os cards',
  },
  {
    icon: <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    titulo: 'Chance de aprovação',
    desc: 'Veja onde você está vs. aprovados',
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
    titulo: 'Ganhe o Premium grátis',
    desc: `Testadores ativos ganham ${MESES_PREMIO} meses do Plano Premium sem pagar nada. Sua opinião vale muito para nós.`,
  },
];

const PASSOS = [
  { num: '01', titulo: 'Edital chega até você', desc: 'Monitoramos 10+ fontes automaticamente. Quando sair um edital no seu perfil, você recebe uma notificação com link de inscrição.' },
  { num: '02', titulo: 'Simulado feito para você', desc: 'Nossa IA usa o mesmo motor do ENEM (IRT) para criar questões no seu nível e explicar cada erro com base em lei e doutrina.' },
  { num: '03', titulo: 'Plano que te leva à aprovação', desc: 'Com base no seu desempenho e na data da prova, O Tutor monta um cronograma diário. Você só precisa seguir.' },
];

const PARA_QUEM = [
  'Quer um guia que diga exatamente o que estudar — e pare de desperdiçar tempo com o que não cai na prova',
  'Já tentou mais de uma vez e quer uma preparação mais inteligente e direcionada',
  'Não quer pagar R$200/mês em cursinho e quer resultado de verdade',
  'Precisa de um plano de estudos que se adapte ao seu ritmo e à data da prova',
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
            🧪 Versão beta — buscamos testadores voluntários
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
            Quem participar dos testes ganha <strong>{MESES_PREMIO} meses do Plano Premium completamente grátis.</strong>
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
            Programa de testadores
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

      {/* ── SEGUNDO FORMULÁRIO (FUNDO ESCURO) ────── */}
      <section style={{ background: '#0D1117', padding: '80px 20px' }} id="cadastro-final">
        <div className="max-w-[520px] mx-auto text-center">
          <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16 }}>
            Programa de testadores beta
          </p>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 900, color: 'white', marginBottom: 12, letterSpacing: -0.5, lineHeight: 1.2 }}>
            Ajude a construir o app.<br />
            <span style={{ color: '#5B6BFF' }}>Ganhe {MESES_PREMIO} meses do Premium grátis.</span>
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
            <a href="/privacidade" style={{ fontSize: 12, color: '#7A7D8A', textDecoration: 'none' }}>Privacidade</a>
            <a href="mailto:contato@otutor.com.br" style={{ fontSize: 12, color: '#7A7D8A', textDecoration: 'none' }}>Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
