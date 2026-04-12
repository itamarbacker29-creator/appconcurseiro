import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IDENTIDADE } from '@/config/identidade';

// Dados mockados para a landing
const STATS = [
  { valor: '8M+', label: 'candidatos no Brasil' },
  { valor: '50+', label: 'editais monitorados' },
  { valor: '100%', label: 'automático' },
  { valor: 'R$0', label: 'para começar' },
];

const EDITAIS_MOCK = [
  { orgao: 'Receita Federal', cargo: 'Auditor-Fiscal da Receita Federal', vagas: 699, salario: 'R$ 21.029', prazo: '15/05', urgente: true },
  { orgao: 'INSS', cargo: 'Técnico do Seguro Social', vagas: 7732, salario: 'R$ 5.905', prazo: '30/05', urgente: false },
  { orgao: 'Banco Central', cargo: 'Analista — Área 1', vagas: 100, salario: 'R$ 20.924', prazo: '12/05', urgente: true },
];

const FEATURES = [
  {
    icon: '⬡',
    cor: 'accent',
    titulo: 'Crawler autônomo de editais',
    desc: 'Monitoramento contínuo das principais fontes. Novos concursos chegam antes de todo mundo.',
  },
  {
    icon: '✓',
    cor: 'teal',
    titulo: 'Motor IRT — igual ao ENEM',
    desc: 'Questões adaptadas ao seu nível real. Nem fácil demais, nem impossível.',
  },
  {
    icon: '▦',
    cor: 'warning',
    titulo: 'Plano de estudo dinâmico',
    desc: 'IA analisa seu desempenho e reconstrói o cronograma conforme você evolui.',
  },
  {
    icon: '◻',
    cor: 'accent',
    titulo: 'PWA — instala em tudo',
    desc: 'Funciona no celular, computador e tablet. Instala como app, funciona offline.',
  },
];

const DEPOIMENTOS = [
  {
    texto: 'Passei no TRF depois de 2 anos de tentativa. O plano de estudo adaptativo fez a diferença — priorizou exatamente onde eu estava fraco.',
    nome: 'Carla Mendes',
    cargo: 'Analista Judiciário — TRF 3ª Região',
  },
  {
    texto: 'Nunca entendi por que errava tantas questões de Direito Administrativo. O gabarito explicado da IA me mostrou a lacuna exata na minha compreensão.',
    nome: 'Rafael Souza',
    cargo: 'Auditor Fiscal — SEFAZ-SP',
  },
  {
    texto: 'Os alertas de edital me salvaram. Recebi a notificação do concurso da Receita em tempo real e não perdi o prazo de inscrição.',
    nome: 'Ana Paula Costa',
    cargo: 'Técnica — Receita Federal',
  },
];

const TECNOLOGIAS = [
  'Claude API (Anthropic)', 'Teoria de Resposta ao Item (IRT)', 'Supabase + PostgreSQL',
  'Next.js PWA', 'Web Push (VAPID)', 'Cloudflare CDN',
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="max-w-[860px] mx-auto w-full px-4 py-20 flex flex-col items-center text-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--accent-light) border border-(--accent)/20">
          <span className="w-2 h-2 rounded-full bg-(--teal) animate-pulse-dot" />
          <span className="text-[12px] font-semibold text-(--accent-text)">IA adaptativa em tempo real</span>
        </div>

        <h1 className="text-[40px] md:text-[52px] font-black tracking-tight text-(--ink) leading-tight max-w-[700px]">
          {IDENTIDADE.sloganHero || 'Estude com inteligência.'}{' '}
          <span className="text-(--accent)">E você?</span>
        </h1>

        <p className="text-[16px] text-(--ink-2) max-w-[540px] leading-relaxed">
          O único app que busca editais automaticamente, gera seu simulado personalizado e monta seu plano de estudo — tudo sem você pedir.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href="/login">
            <Button size="lg">Começar agora — é grátis</Button>
          </Link>
          <Button size="lg" variant="ghost">Ver como funciona</Button>
        </div>

        <p className="text-[12px] text-(--ink-3)">
          Sem cartão de crédito · Funciona no celular e no computador
        </p>
      </section>

      {/* STATS */}
      <section className="bg-(--surface-2) border-y border-(--border)">
        <div className="max-w-[860px] mx-auto w-full px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="text-[28px] font-black text-(--ink)">{s.valor}</span>
              <span className="text-[12px] text-(--ink-3) text-center">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* MOCKUP EDITAIS */}
      <section id="editais" className="max-w-[860px] mx-auto w-full px-4 py-16 flex flex-col md:flex-row gap-10 items-center">
        <div className="flex-1 flex flex-col gap-4">
          <Badge variant="accent">Busca de Editais</Badge>
          <h2 className="text-[28px] font-bold text-(--ink)">
            Novos concursos chegam enquanto você estuda
          </h2>
          <p className="text-[14px] text-(--ink-2) leading-relaxed">
            Crawler rodando 24/7 nas maiores fontes. Você recebe notificação push assim que sai um edital compatível com seu perfil.
          </p>
        </div>

        <div className="flex-1 w-full max-w-[420px]">
          {/* Frame de browser */}
          <div className="rounded-[var(--radius)] border border-(--border) overflow-hidden shadow-lg">
            <div className="bg-(--surface-3) px-3 py-2 flex items-center gap-2 border-b border-(--border)">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-(--surface) rounded px-2 py-0.5 text-[10px] text-(--ink-3) text-center">
                {IDENTIDADE.dominioApp || 'app.[DOMINIO]/editais'}
              </div>
            </div>
            <div className="p-3 flex flex-col gap-2 bg-(--surface)">
              {EDITAIS_MOCK.map((e) => (
                <div key={e.cargo} className="p-3 border border-(--border) rounded-[var(--radius-sm)] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-(--ink-3) uppercase tracking-wide">{e.orgao}</span>
                    {e.urgente && (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] text-red-500 font-medium">{e.prazo}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] font-semibold text-(--ink) leading-tight">{e.cargo}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-(--ink-3)">{e.vagas} vagas</span>
                    <span className="text-[10px] font-semibold text-(--teal)">{e.salario}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MOCKUP SIMULADO */}
      <section id="simulados" className="bg-(--surface-2) border-y border-(--border)">
        <div className="max-w-[860px] mx-auto w-full px-4 py-16 flex flex-col md:flex-row-reverse gap-10 items-center">
          <div className="flex-1 flex flex-col gap-4">
            <Badge variant="success">Motor IRT Adaptativo</Badge>
            <h2 className="text-[28px] font-bold text-(--ink)">
              Questões no nível certo. Sempre.
            </h2>
            <p className="text-[14px] text-(--ink-2) leading-relaxed">
              O motor IRT calibra a dificuldade em tempo real com base no seu desempenho — igual ao ENEM. Gabarito com explicação detalhada da IA após cada questão.
            </p>
          </div>

          <div className="flex-1 w-full max-w-[420px]">
            <div className="rounded-[var(--radius)] border border-(--border) overflow-hidden shadow-lg bg-(--surface)">
              <div className="p-3 border-b border-(--border) flex items-center justify-between">
                <span className="text-[11px] font-semibold text-(--ink-3)">Questão 6 de 10</span>
                <div className="h-1.5 flex-1 mx-3 bg-(--surface-3) rounded-full">
                  <div className="h-1.5 w-[60%] bg-(--accent) rounded-full" />
                </div>
                <span className="text-[11px] text-(--ink-3)">60%</span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                <div className="flex gap-2">
                  <span className="text-[10px] px-2 py-0.5 bg-(--accent-light) text-(--accent-text) rounded font-semibold">Direito Adm.</span>
                  <span className="text-[10px] px-2 py-0.5 bg-(--surface-3) text-(--ink-3) rounded">Médio</span>
                </div>
                <p className="text-[12px] text-(--ink) leading-relaxed">
                  Sobre os atos administrativos, é correto afirmar que a revogação opera efeitos...
                </p>
                {['Ex tunc, atingindo atos já consumados', 'Ex nunc, preservando efeitos anteriores', 'Ex tunc, por motivo de ilegalidade', 'Ex nunc, por motivo de conveniência'].map((op, i) => (
                  <div key={i} className={`p-2 rounded text-[11px] border cursor-pointer transition-colors ${i === 1 ? 'border-(--teal) bg-(--teal-light) text-(--teal-text) font-semibold' : 'border-(--border) text-(--ink-2)'}`}>
                    <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{op}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="max-w-[860px] mx-auto w-full px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-(--ink)">Tudo que você precisa em um lugar</h2>
          <p className="text-[14px] text-(--ink-2) mt-2">Sem planilha. Sem PDF. Sem esforço manual.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <Card key={f.titulo} padding="lg" className="flex flex-col gap-3">
              <div className={`w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center text-lg font-bold ${
                f.cor === 'accent' ? 'bg-(--accent-light) text-(--accent)' :
                f.cor === 'teal' ? 'bg-(--teal-light) text-(--teal)' :
                'bg-amber-50 text-amber-600'
              }`}>
                {f.icon}
              </div>
              <h3 className="text-[15px] font-bold text-(--ink)">{f.titulo}</h3>
              <p className="text-[13px] text-(--ink-2) leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="bg-(--surface-2) border-y border-(--border)">
        <div className="max-w-[860px] mx-auto w-full px-4 py-16">
          <h2 className="text-[24px] font-bold text-(--ink) text-center mb-8">Candidatos que passaram</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEPOIMENTOS.map((d) => (
              <Card key={d.nome} padding="lg" className="flex flex-col gap-3">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}
                </div>
                <p className="text-[13px] text-(--ink-2) leading-relaxed italic">"{d.texto}"</p>
                <div className="mt-auto">
                  <p className="text-[13px] font-semibold text-(--ink)">{d.nome}</p>
                  <p className="text-[11px] text-(--ink-3)">{d.cargo}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* TECNOLOGIA */}
      <section className="bg-[#0D1117] py-16">
        <div className="max-w-[860px] mx-auto w-full px-4 flex flex-col items-center gap-6 text-center">
          <Badge variant="accent">Tecnologia</Badge>
          <h2 className="text-[28px] font-bold text-white">
            Construído com IA de ponta. Testado para concursos reais.
          </h2>
          <p className="text-[14px] text-white/60 max-w-[480px]">
            Cada componente escolhido para máxima precisão com custo zero nos primeiros meses.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {TECNOLOGIAS.map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-full border border-white/10 text-[12px] text-white/70 font-medium">
                {t}
              </span>
            ))}
          </div>
          <Link href="/login">
            <Button size="lg" className="mt-4">Começar gratuitamente</Button>
          </Link>
        </div>
      </section>

      {/* PREÇOS */}
      <section id="precos" className="max-w-[860px] mx-auto w-full px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-[28px] font-bold text-(--ink)">Planos simples, sem surpresa</h2>
          <p className="text-[14px] text-(--ink-2) mt-2">Comece grátis. Assine só se quiser mais.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Grátis */}
          <Card padding="lg" className="flex flex-col gap-4">
            <div>
              <p className="text-[13px] font-semibold text-(--ink-3) uppercase tracking-wide">Grátis</p>
              <p className="text-[32px] font-black text-(--ink) mt-1">R$0</p>
              <p className="text-[12px] text-(--ink-3)">para sempre</p>
            </div>
            <ul className="flex flex-col gap-2 text-[13px] text-(--ink-2)">
              {['10 questões/dia', 'Alertas de editais', '1 edital monitorado', 'Dashboard básico'].map(i => (
                <li key={i} className="flex items-center gap-2"><span className="text-(--teal)">✓</span>{i}</li>
              ))}
            </ul>
            <Link href="/login" className="mt-auto">
              <Button variant="ghost" size="md" className="w-full">Começar grátis</Button>
            </Link>
          </Card>

          {/* Premium */}
          <Card padding="lg" className="flex flex-col gap-4 border-2 border-(--accent) relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="accent">Mais popular</Badge>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-(--ink-3) uppercase tracking-wide">Premium</p>
              <p className="text-[32px] font-black text-(--ink) mt-1">R$24,90</p>
              <p className="text-[12px] text-(--ink-3)">por mês</p>
            </div>
            <ul className="flex flex-col gap-2 text-[13px] text-(--ink-2)">
              {['Questões ilimitadas', 'Gabarito explicado por IA', 'Plano de estudo', 'Raio-X do edital', 'Editais ilimitados', 'Modo offline'].map(i => (
                <li key={i} className="flex items-center gap-2"><span className="text-(--teal)">✓</span>{i}</li>
              ))}
            </ul>
            <Link href="/login" className="mt-auto">
              <Button size="md" className="w-full">Assinar Premium</Button>
            </Link>
          </Card>

          {/* Avulso */}
          <Card padding="lg" className="flex flex-col gap-4">
            <div>
              <p className="text-[13px] font-semibold text-(--ink-3) uppercase tracking-wide">Avulso</p>
              <p className="text-[32px] font-black text-(--ink) mt-1">R$34,90</p>
              <p className="text-[12px] text-(--ink-3)">1 concurso, vitalício</p>
            </div>
            <ul className="flex flex-col gap-2 text-[13px] text-(--ink-2)">
              {['1 edital à sua escolha', 'Questões ilimitadas', 'Gabarito explicado', 'Plano de estudo', 'Sem mensalidade'].map(i => (
                <li key={i} className="flex items-center gap-2"><span className="text-(--teal)">✓</span>{i}</li>
              ))}
            </ul>
            <Link href="/login" className="mt-auto">
              <Button variant="ghost" size="md" className="w-full">Comprar acesso</Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}
